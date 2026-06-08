using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Options;

namespace Backend.Infra;

/// <summary>
/// SQL Server-backed <see cref="ISecretStore"/>. Stores each secret as a ciphertext
/// row encrypted with AES-256-GCM. The Key Encryption Key (KEK) never lives in the
/// database — load it from your secrets manager (Azure Key Vault, AWS KMS, env var
/// supplied by the orchestrator) at startup and pass it via <see cref="SqlSecretStoreOptions.MasterKey"/>.
///
/// When does this make sense over <see cref="KeyVaultSecretStore"/>?
/// <list type="bullet">
///   <item>You're hosted somewhere without managed identity / vault access (on-prem, third-party cloud).</item>
///   <item>You already operate a SQL Server and want one fewer dependency.</item>
///   <item>You want the secrets co-located with related app data for ops simplicity.</item>
/// </list>
/// Key Vault is still preferred when you can use it — it handles HSM-backed keys, access
/// auditing, and rotation for you.
///
/// Setup:
/// <code>
/// dotnet add package Microsoft.EntityFrameworkCore.SqlServer
/// dotnet add package Microsoft.EntityFrameworkCore.Design
/// </code>
/// Then in <c>appsettings.json</c>:
/// <code>
/// "Sql": {
///   "ConnectionString": "Server=...;Database=NomaSignDemo;...;Encrypt=true",
///   "MasterKey": "&lt;base64 32-byte key from your secrets manager&gt;",
///   "KeyVersion": 1
/// }
/// </code>
/// </summary>
public class SqlSecretStore : ISecretStore
{
    private readonly IDbContextFactory<SecretsDbContext> _dbFactory;
    private readonly ISecretEnvelope _envelope;
    private readonly TimeProvider _clock;

    public SqlSecretStore(
        IDbContextFactory<SecretsDbContext> dbFactory,
        ISecretEnvelope envelope,
        TimeProvider clock)
    {
        _dbFactory = dbFactory;
        _envelope = envelope;
        _clock = clock;
    }

    public async Task<string?> GetSecretAsync(string key)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var row = await db.Secrets.AsNoTracking().FirstOrDefaultAsync(s => s.Key == key);
        if (row is null) return null;
        return _envelope.Open(row.Ciphertext, row.Nonce, row.Tag, row.KeyVersion);
    }

    public async Task SetSecretAsync(string key, string value)
    {
        var sealed_ = _envelope.Seal(value);
        var now = _clock.GetUtcNow().UtcDateTime;

        await using var db = await _dbFactory.CreateDbContextAsync();
        var row = await db.Secrets.FirstOrDefaultAsync(s => s.Key == key);
        if (row is null)
        {
            db.Secrets.Add(new SecretRow
            {
                Key = key,
                Ciphertext = sealed_.Ciphertext,
                Nonce = sealed_.Nonce,
                Tag = sealed_.Tag,
                KeyVersion = sealed_.KeyVersion,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        else
        {
            row.Ciphertext = sealed_.Ciphertext;
            row.Nonce = sealed_.Nonce;
            row.Tag = sealed_.Tag;
            row.KeyVersion = sealed_.KeyVersion;
            row.UpdatedAt = now;
        }
        await db.SaveChangesAsync();
    }
}

public class SqlSecretStoreOptions
{
    public const string SectionName = "Sql";

    /// <summary>SQL Server connection string. When set, DI selects <see cref="SqlSecretStore"/>.</summary>
    public string? ConnectionString { get; set; }

    /// <summary>Base64-encoded 32-byte AES-256 master key. Source from your secrets manager.</summary>
    public string? MasterKey { get; set; }

    /// <summary>Master key version. Bump when rotating so old rows can still be decrypted.</summary>
    public int KeyVersion { get; set; } = 1;
}

// ─── EF Core ────────────────────────────────────────────────────────────────────

public class SecretsDbContext : DbContext
{
    public SecretsDbContext(DbContextOptions<SecretsDbContext> options) : base(options) { }

    public DbSet<SecretRow> Secrets => Set<SecretRow>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var secret = modelBuilder.Entity<SecretRow>();
        secret.ToTable("Secrets");
        secret.HasKey(s => s.Key);
        secret.Property(s => s.Key).HasMaxLength(200);
        secret.Property(s => s.Ciphertext).IsRequired();
        // AES-GCM: 12-byte nonce, 16-byte tag (mandated by NIST SP 800-38D).
        secret.Property(s => s.Nonce).HasMaxLength(12).IsRequired();
        secret.Property(s => s.Tag).HasMaxLength(16).IsRequired();
    }
}

public class SecretRow
{
    public string Key { get; set; } = "";
    public byte[] Ciphertext { get; set; } = [];
    public byte[] Nonce { get; set; } = [];
    public byte[] Tag { get; set; } = [];
    public int KeyVersion { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Lets <c>dotnet ef migrations add</c> build the context without spinning up the
/// runtime DI graph (which would require a real connection string in config). The
/// migration script itself doesn't connect to a server, so a placeholder is fine.
/// </summary>
public class SecretsDbContextDesignTimeFactory : IDesignTimeDbContextFactory<SecretsDbContext>
{
    public SecretsDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<SecretsDbContext>()
            .UseSqlServer("Server=(local);Database=design-time-placeholder;Trusted_Connection=false")
            .Options;
        return new SecretsDbContext(options);
    }
}

// ─── Encryption envelope ────────────────────────────────────────────────────────

public record SealedSecret(byte[] Ciphertext, byte[] Nonce, byte[] Tag, int KeyVersion);

public interface ISecretEnvelope
{
    SealedSecret Seal(string plaintext);
    string Open(byte[] ciphertext, byte[] nonce, byte[] tag, int keyVersion);
}

/// <summary>
/// AES-256-GCM authenticated encryption. Fresh 96-bit nonce per call (never reused under
/// a given key — GCM's security collapses if it is). Tamper-evident: the 128-bit tag is
/// verified on decrypt and a tampered row throws <see cref="CryptographicException"/>.
/// </summary>
public class AesGcmSecretEnvelope : ISecretEnvelope
{
    private const int NonceSize = 12;
    private const int TagSize = 16;

    private readonly byte[] _key;
    private readonly int _keyVersion;

    public AesGcmSecretEnvelope(IOptions<SqlSecretStoreOptions> options)
    {
        var opts = options.Value;
        if (string.IsNullOrWhiteSpace(opts.MasterKey))
            throw new InvalidOperationException(
                "Sql:MasterKey is not configured. Set Sql__MasterKey to a base64-encoded 32-byte value " +
                "(generate with: openssl rand -base64 32). In production, source it from your secrets manager.");

        byte[] key;
        try { key = Convert.FromBase64String(opts.MasterKey); }
        catch (FormatException ex)
        {
            throw new InvalidOperationException("Sql:MasterKey must be valid base64.", ex);
        }
        if (key.Length != 32)
            throw new InvalidOperationException($"Sql:MasterKey must decode to 32 bytes (got {key.Length}).");

        _key = key;
        _keyVersion = opts.KeyVersion;
    }

    public SealedSecret Seal(string plaintext)
    {
        ArgumentNullException.ThrowIfNull(plaintext);

        var plain = Encoding.UTF8.GetBytes(plaintext);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var cipher = new byte[plain.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plain, cipher, tag);

        return new SealedSecret(cipher, nonce, tag, _keyVersion);
    }

    public string Open(byte[] ciphertext, byte[] nonce, byte[] tag, int keyVersion)
    {
        if (keyVersion != _keyVersion)
            throw new InvalidOperationException(
                $"Row was encrypted with key version {keyVersion} but only version {_keyVersion} is loaded. " +
                "Add the legacy key to support rolling rotation, or re-encrypt the row.");

        var plain = new byte[ciphertext.Length];
        using var aes = new AesGcm(_key, TagSize);
        aes.Decrypt(nonce, ciphertext, tag, plain);
        return Encoding.UTF8.GetString(plain);
    }
}

