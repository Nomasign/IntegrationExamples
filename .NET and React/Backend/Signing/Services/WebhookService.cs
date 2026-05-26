using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Infra;
using Backend.Signing.Models;

namespace Backend.Signing.Services;

/// <summary>
/// Handles webhook signature verification, payload parsing, and event routing.
/// </summary>
public interface IWebhookService
{
    /// <summary>Verify the HMAC-SHA256 signature and parse the webhook payload.</summary>
    Task<WebhookPayload?> VerifyAndParseAsync(string rawBody, string? signatureHeader);

    /// <summary>Process a verified webhook event (route to handlers).</summary>
    void HandleEvent(WebhookPayload payload);

    /// <summary>Get recent webhook events.</summary>
    IEnumerable<WebhookEventDto> GetRecentEvents(int count = 50);

    /// <summary>
    /// Set the HMAC secret at runtime. The demo UI calls this so users can paste their
    /// webhook secret without restarting. In production, secrets should be provisioned
    /// to your <see cref="ISecretStore"/> at deployment time (e.g. Key Vault).
    /// </summary>
    Task SetSecretAsync(string secret);

    /// <summary>
    /// True if a webhook secret is currently available from the secret store.
    /// Used by the demo UI to show a "configured" indicator.
    /// </summary>
    Task<bool> IsSecretConfiguredAsync();
}

public class WebhookService : IWebhookService
{
    private readonly ILogger<WebhookService> _logger;
    private readonly ISecretStore _secretStore;
    private readonly List<WebhookPayload> _eventLog = [];

    private const string WebhookSecretKey = "nomasign-webhook-secret";

    public WebhookService(ILogger<WebhookService> logger, ISecretStore secretStore)
    {
        _logger = logger;
        _secretStore = secretStore;
    }

    public Task SetSecretAsync(string secret) => _secretStore.SetSecretAsync(WebhookSecretKey, secret);

    public async Task<bool> IsSecretConfiguredAsync() =>
        await _secretStore.GetSecretAsync(WebhookSecretKey) is not null;

    public async Task<WebhookPayload?> VerifyAndParseAsync(string rawBody, string? signatureHeader)
    {
        var secret = await _secretStore.GetSecretAsync(WebhookSecretKey);
        if (secret is null)
        {
            _logger.LogWarning("Webhook secret not configured — set it via the UI or provision it in your ISecretStore");
            return null;
        }

        if (!VerifySignature(rawBody, signatureHeader, secret))
        {
            _logger.LogWarning("Webhook signature verification failed");
            return null;
        }

        return JsonSerializer.Deserialize<WebhookPayload>(rawBody, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }

    public void HandleEvent(WebhookPayload payload)
    {
        // Route to the appropriate handler based on event type.
        switch (payload.Type)
        {
            case "signing_session.completed":
                _logger.LogInformation("All recipients have signed session {SessionId}", payload.Session?.Id);
                // TODO: Your business logic (update CRM, send notification, archive document)
                break;

            case "signing_session.declined":
                _logger.LogInformation("Session {SessionId} was declined", payload.Session?.Id);
                break;

            case "signing_participant.signed":
                _logger.LogInformation("A participant signed in session {SessionId}", payload.Session?.Id);
                break;

            case "signing_session.cancelled":
                _logger.LogInformation("Session {SessionId} was cancelled", payload.Session?.Id);
                break;

            default:
                _logger.LogInformation("Unhandled webhook event: {Type}", payload.Type);
                break;
        }

        // Store in memory for the UI to display.
        _eventLog.Add(payload);
        if (_eventLog.Count > 100) _eventLog.RemoveAt(0);
    }

    public IEnumerable<WebhookEventDto> GetRecentEvents(int count = 50)
    {
        return _eventLog.TakeLast(count).Select(p => new WebhookEventDto(
            Id: p.Id,
            Type: p.Type,
            CreatedAt: p.CreatedAt,
            SessionId: p.Session?.Id,
            TemplateId: p.Session?.TemplateId?.ToString(),
            Recipients: p.Session?.Recipients?.Select(r =>
                new WebhookRecipientDto(r.Label, r.Name, r.Email, r.Status)
            ).ToList()
        ));
    }

    // ─── Signature verification ───────────────────────────────────────────────

    private static bool VerifySignature(string body, string? signatureHeader, string secret)
    {
        if (string.IsNullOrEmpty(signatureHeader))
            return false;

        // Header format: "t=<unix-timestamp>,v1=<hex-hmac-sha256>"
        var parts = signatureHeader.Split(',')
            .Select(p => p.Split('=', 2))
            .Where(p => p.Length == 2)
            .ToDictionary(p => p[0].Trim(), p => p[1].Trim());

        if (!parts.TryGetValue("t", out var timestamp) || !parts.TryGetValue("v1", out var v1))
            return false;

        // Replay protection: reject deliveries whose timestamp is more than 5 minutes old.
        // Without this, a captured (body, signature) pair stays valid forever.
        if (!long.TryParse(timestamp, out var unixTs)) return false;
        if (Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeSeconds() - unixTs) > 300) return false;

        // Signed payload is "{timestamp}.{body}"
        var signedPayload = $"{timestamp}.{body}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload))).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(v1.ToLowerInvariant()));
    }
}
