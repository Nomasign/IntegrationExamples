using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Backend.Infra;
using Backend.Signing.Clients;
using Backend.Signing.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Serve on both HTTP and HTTPS so the webhook URL can use https://.
builder.WebHost.UseUrls("http://localhost:5203", "https://localhost:5204");

// ─── Services ─────────────────────────────────────────────────────────────────

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Runtime settings (base URL changeable from the UI).
var initialBaseUrl = builder.Configuration["NomaSign:BaseUrl"]!;
builder.Services.AddSingleton(new RuntimeSettings(initialBaseUrl));

// Secret store. Selection precedence:
//   1. KeyVault:Url set       → Azure Key Vault (preferred production pattern).
//   2. Sql:ConnectionString set → SQL Server with AES-256-GCM at-rest encryption
//                                  (use when Key Vault isn't available — on-prem,
//                                   third-party cloud, or fewer-dependencies ops).
//   3. Otherwise              → InMemorySecretStore (demo only).
var keyVaultUrl = builder.Configuration["KeyVault:Url"];
var sqlConnectionString = builder.Configuration["Sql:ConnectionString"];

if (!string.IsNullOrWhiteSpace(keyVaultUrl))
{
    builder.Services.Configure<KeyVaultOptions>(builder.Configuration.GetSection(KeyVaultOptions.SectionName));
    builder.Services.AddSingleton(new SecretClient(new Uri(keyVaultUrl), new DefaultAzureCredential()));
    builder.Services.AddSingleton<ISecretStore, KeyVaultSecretStore>();
}
else if (!string.IsNullOrWhiteSpace(sqlConnectionString))
{
    builder.Services.Configure<SqlSecretStoreOptions>(
        builder.Configuration.GetSection(SqlSecretStoreOptions.SectionName));
    builder.Services.AddSingleton(TimeProvider.System);
    builder.Services.AddSingleton<ISecretEnvelope, AesGcmSecretEnvelope>();
    builder.Services.AddDbContextFactory<SecretsDbContext>(opts => opts.UseSqlServer(sqlConnectionString));
    builder.Services.AddSingleton<ISecretStore, SqlSecretStore>();
}
else
{
    builder.Services.AddSingleton<ISecretStore, InMemorySecretStore>();
    // Warn loudly so nobody mistakes the in-memory store for a production setup.
    builder.Services.AddSingleton<IHostedService, InMemorySecretStoreStartupWarning>();
}

// Integration API HTTP client. Named client so NomaSignClient can resolve via IHttpClientFactory
// (lets us register NomaSignClient + NomaSignService as singletons without capturing an HttpClient).
builder.Services.AddHttpClient(NomaSignClient.HttpClientName);

// Application services. Singleton because they hold the in-memory access-token cache.
builder.Services.AddSingleton<INomaSignClient, NomaSignClient>();
builder.Services.AddSingleton<INomaSignService, NomaSignService>();
builder.Services.AddSingleton<IWebhookService, WebhookService>();

// CORS — allow the React frontend to call our backend.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:4999")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ─── Middleware pipeline ──────────────────────────────────────────────────────

var app = builder.Build();

// Auto-apply SQL migrations in dev (when SqlSecretStore is the active impl).
if (app.Environment.IsDevelopment() && !string.IsNullOrWhiteSpace(sqlConnectionString)
    && string.IsNullOrWhiteSpace(keyVaultUrl))
{
    using var scope = app.Services.CreateScope();
    var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<SecretsDbContext>>();
    await using var db = await dbFactory.CreateDbContextAsync();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
