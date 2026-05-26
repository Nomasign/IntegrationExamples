using Azure;
using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Options;

namespace Backend.Infra;

/// <summary>
/// Production-grade secret store backed by Azure Key Vault.
///
/// This is based on the pattern used by the NomaSign internal services
/// 
/// (see <c>KeyVaultTokenStore</c> / <c>KeyVaultExternalTokenStore</c> in the mono repo):
/// <list type="bullet">
///   <item>A singleton <see cref="SecretClient"/> is constructed with <c>DefaultAzureCredential</c> (Managed Identity in Azure, falls back to VS / az-cli / env vars locally).</item>
///   <item>Secrets are prefixed by environment (<c>prod-</c>, <c>dev-</c>, etc.) so a single vault can host multiple deployments. The prefix comes from <see cref="KeyVaultOptions.SecretPrefix"/>.</item>
///   <item>Key Vault soft-delete: when you set a secret whose name was previously deleted but not purged, the API returns 409. We purge the deleted version and retry.</item>
///   <item>Missing secrets surface as <c>null</c> rather than throwing — callers decide whether absence is an error.</item>
/// </list>
///
/// Setup:
/// <code>
/// dotnet add package Azure.Security.KeyVault.Secrets
/// dotnet add package Azure.Identity
/// </code>
/// Then in <c>appsettings.json</c>:
/// <code>
/// "KeyVault": {
///   "Url": "https://your-vault.vault.azure.net/",
///   "SecretPrefix": "dev-"
/// }
/// </code>
/// </summary>
public class KeyVaultSecretStore : ISecretStore
{
    private readonly SecretClient _client;
    private readonly string _prefix;
    private readonly ILogger<KeyVaultSecretStore> _logger;

    public KeyVaultSecretStore(SecretClient client, IOptions<KeyVaultOptions> options, ILogger<KeyVaultSecretStore> logger)
    {
        _client = client;
        _prefix = options.Value.SecretPrefix ?? string.Empty;
        _logger = logger;
    }

    public async Task<string?> GetSecretAsync(string key)
    {
        var name = Prefixed(key);
        try
        {
            var response = await _client.GetSecretAsync(name);
            return response.Value.Value;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    public async Task SetSecretAsync(string key, string value)
    {
        var name = Prefixed(key);
        try
        {
            await _client.SetSecretAsync(name, value);
        }
        catch (RequestFailedException ex) when (ex.Status == 409)
        {
            // Soft-deleted secret with this name still occupies the slot. Purge it and retry.
            _logger.LogInformation("Purging soft-deleted secret {Name} before re-creating", name);
            var deleteOp = await _client.StartDeleteSecretAsync(name);
            await deleteOp.WaitForCompletionAsync();
            await _client.PurgeDeletedSecretAsync(name);
            await _client.SetSecretAsync(name, value);
        }
    }

    private string Prefixed(string key) => string.IsNullOrEmpty(_prefix) ? key : $"{_prefix}{key}";
}

public class KeyVaultOptions
{
    public const string SectionName = "KeyVault";

    /// <summary>Vault URL, e.g. <c>https://my-vault.vault.azure.net/</c>.</summary>
    public string? Url { get; set; }

    /// <summary>Optional prefix prepended to every secret name (e.g. <c>prod-</c>, <c>dev-</c>) for environment scoping.</summary>
    public string? SecretPrefix { get; set; }
}
