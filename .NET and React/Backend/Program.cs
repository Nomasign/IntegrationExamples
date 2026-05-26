using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Backend.Infra;
using Backend.Signing.Clients;
using Backend.Signing.Services;

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

// Secret store. If KeyVault:Url is configured, use Azure Key Vault (production pattern).
// Otherwise fall back to InMemorySecretStore (demo only — secrets are lost on restart).
var keyVaultUrl = builder.Configuration["KeyVault:Url"];
if (!string.IsNullOrWhiteSpace(keyVaultUrl))
{
    builder.Services.Configure<KeyVaultOptions>(builder.Configuration.GetSection(KeyVaultOptions.SectionName));
    builder.Services.AddSingleton(new SecretClient(new Uri(keyVaultUrl), new DefaultAzureCredential()));
    builder.Services.AddSingleton<ISecretStore, KeyVaultSecretStore>();
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
