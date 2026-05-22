using Backend.Clients;
using Backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Serve on both HTTP and HTTPS so the webhook URL can use https://.
builder.WebHost.UseUrls("http://localhost:5203", "https://localhost:5204");

// ─── Services ─────────────────────────────────────────────────────────────────

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Integration API HTTP client.
builder.Services.AddHttpClient<INomaSignClient, NomaSignClient>((sp, client) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    client.BaseAddress = new Uri(config["NomaSign:BaseUrl"]!);
});

// Application services.
builder.Services.AddSingleton<TokenCache>();
builder.Services.AddScoped<INomaSignService, NomaSignService>();
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
