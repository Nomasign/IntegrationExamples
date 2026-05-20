using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register a typed HttpClient for the NomaSign Integration API.
builder.Services.AddHttpClient("NomaSign", (sp, client) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    client.BaseAddress = new Uri(config["NomaSign:BaseUrl"]!);
});

// Token cache (in production, use a distributed cache or token manager).
builder.Services.AddSingleton<TokenCache>();

// CORS — allow the React frontend to call our backend.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// ─── TOKEN EXCHANGE ───────────────────────────────────────────────────────────
// Demonstrates: POST /connect/token (refresh_token grant)

app.MapPost("/api/nomasign/token", async (
    IHttpClientFactory httpFactory,
    IConfiguration config,
    TokenCache tokenCache) =>
{
    // Check if we have a valid cached token.
    var cached = tokenCache.GetCurrent();
    if (cached != null)
        return Results.Ok(new { accessToken = cached, fromCache = true });

    var client = httpFactory.CreateClient("NomaSign");

    var response = await client.PostAsync("/connect/token",
        new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["client_id"] = config["NomaSign:ClientId"]!,
            ["refresh_token"] = config["NomaSign:RefreshToken"]!
        }));

    if (!response.IsSuccessStatusCode)
    {
        var error = await response.Content.ReadAsStringAsync();
        return Results.Problem($"Token exchange failed: {error}", statusCode: (int)response.StatusCode);
    }

    var tokenResponse = await response.Content.ReadFromJsonAsync<TokenResponse>();
    tokenCache.Set(tokenResponse!.AccessToken, tokenResponse.ExpiresIn);

    return Results.Ok(new { accessToken = tokenResponse.AccessToken, fromCache = false });
});

// ─── LIST TEMPLATES ───────────────────────────────────────────────────────────
// Demonstrates: GET /api/templates

app.MapGet("/api/nomasign/templates", async (
    IHttpClientFactory httpFactory,
    TokenCache tokenCache) =>
{
    var token = tokenCache.GetCurrent();
    if (token == null)
        return Results.Problem("No access token. Call POST /api/nomasign/token first.", statusCode: 401);

    var client = httpFactory.CreateClient("NomaSign");
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    var response = await client.GetAsync("/api/templates");
    if (!response.IsSuccessStatusCode)
    {
        var error = await response.Content.ReadAsStringAsync();
        return Results.Problem($"Failed to list templates: {error}", statusCode: (int)response.StatusCode);
    }

    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
    return Results.Ok(body);
});

// ─── SEND TEMPLATE ────────────────────────────────────────────────────────────
// Demonstrates: POST /api/templates/{id}/send

app.MapPost("/api/nomasign/templates/{templateId}/send", async (
    string templateId,
    [FromBody] SendRequest request,
    IHttpClientFactory httpFactory,
    TokenCache tokenCache) =>
{
    var token = tokenCache.GetCurrent();
    if (token == null)
        return Results.Problem("No access token. Call POST /api/nomasign/token first.", statusCode: 401);

    var client = httpFactory.CreateClient("NomaSign");
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    var payload = new
    {
        signingRequests = new[]
        {
            new
            {
                recipients = request.Recipients.Select(r => new
                {
                    label = r.Label,
                    name = r.Name,
                    email = r.Email
                }),
                fields = request.Fields?.Select(f => new
                {
                    label = f.Label,
                    recipient = f.Recipient,
                    value = f.Value
                }) ?? []
            }
        },
        sendInitialNotification = true
    };

    var response = await client.PostAsJsonAsync($"/api/templates/{templateId}/send", payload);

    if (!response.IsSuccessStatusCode)
    {
        var error = await response.Content.ReadAsStringAsync();
        return Results.Problem($"Send failed: {error}", statusCode: (int)response.StatusCode);
    }

    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
    return Results.Ok(body);
});

// ─── WEBHOOK RECEIVER ─────────────────────────────────────────────────────────
// Demonstrates: Receiving and validating NomaSign webhook notifications.
// NomaSign signs every webhook delivery with HMAC-SHA256 using your webhook secret.

var webhookLog = new List<WebhookPayload>();

app.MapPost("/api/webhooks/nomasign", async (
    HttpContext context,
    IConfiguration config,
    ILogger<Program> logger) =>
{
    // 1. Read the raw body (needed for HMAC verification).
    using var reader = new StreamReader(context.Request.Body);
    var rawBody = await reader.ReadToEndAsync();

    // 2. Verify the HMAC-SHA256 signature.
    var signature = context.Request.Headers["X-NomaSign-Signature"].FirstOrDefault();
    var secret = config["NomaSign:WebhookSecret"]!;

    if (!VerifySignature(rawBody, signature, secret))
    {
        logger.LogWarning("Webhook signature verification failed");
        return Results.Unauthorized();
    }

    // 3. Parse the webhook payload.
    var payload = JsonSerializer.Deserialize<WebhookPayload>(rawBody, new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    });

    logger.LogInformation("Webhook received: {Type} for session {SessionId}",
        payload?.Type, payload?.Session?.Id);

    // 4. Handle different event types.
    switch (payload?.Type)
    {
        case "session.completed":
            logger.LogInformation("All recipients have signed session {SessionId}", payload.Session?.Id);
            // TODO: Your business logic here (e.g. update CRM, send notification, archive document)
            break;

        case "session.declined":
            logger.LogInformation("Session {SessionId} was declined", payload.Session?.Id);
            break;

        case "participant.signed":
            logger.LogInformation("A participant signed in session {SessionId}", payload.Session?.Id);
            break;

        case "session.cancelled":
            logger.LogInformation("Session {SessionId} was cancelled", payload.Session?.Id);
            break;
    }

    // 5. Store in memory for the UI to display.
    if (payload != null)
    {
        webhookLog.Add(payload);
        if (webhookLog.Count > 100) webhookLog.RemoveAt(0);
    }

    // 6. Always return 200 quickly — do heavy processing asynchronously.
    return Results.Ok();
});

// ─── WEBHOOK LOG (for the React frontend to display) ──────────────────────────

app.MapGet("/api/webhooks/log", () => Results.Ok(webhookLog.TakeLast(50)));

app.Run();

// ─── HELPERS ──────────────────────────────────────────────────────────────────

static bool VerifySignature(string payload, string? signatureHeader, string secret)
{
    if (string.IsNullOrEmpty(signatureHeader))
        return false;

    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
    var expected = Convert.ToHexString(hash).ToLowerInvariant();

    // Header format: "sha256=<hex>"
    var actual = signatureHeader.StartsWith("sha256=")
        ? signatureHeader["sha256=".Length..]
        : signatureHeader;

    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(expected),
        Encoding.UTF8.GetBytes(actual.ToLowerInvariant()));
}

// ─── MODELS ───────────────────────────────────────────────────────────────────

record TokenResponse(string AccessToken, int ExpiresIn, string TokenType);

record SendRecipient(string Label, string Name, string Email);
record SendFieldValue(string Label, string? Recipient, string Value);
record SendRequest(List<SendRecipient> Recipients, List<SendFieldValue>? Fields);

record WebhookPayload(string Id, string Type, string ApiVersion, DateTime CreatedAt, WebhookSession? Session);
record WebhookSession(Guid Id, Guid? TemplateId, DateTime? CompletedAt, List<WebhookRecipient>? Recipients, List<WebhookDocument>? Documents);
record WebhookRecipient(string Label, string Name, string Email, string Status, DateTime? SignedAt, DateTime? DeclinedAt);
record WebhookDocument(string Document, string? CloudDocumentId, List<WebhookField>? Fields);
record WebhookField(string Label, string Type, string? Recipient, string? Value);

// ─── TOKEN CACHE ──────────────────────────────────────────────────────────────

class TokenCache
{
    private string? _token;
    private DateTime _expiresAt;

    public string? GetCurrent() =>
        _token != null && DateTime.UtcNow < _expiresAt ? _token : null;

    public void Set(string token, int expiresInSeconds)
    {
        _token = token;
        // Expire 60 seconds early to avoid edge-case failures.
        _expiresAt = DateTime.UtcNow.AddSeconds(expiresInSeconds - 60);
    }
}
