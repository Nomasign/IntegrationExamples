using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Models;

namespace Backend.Services;

/// <summary>
/// Handles webhook signature verification, payload parsing, and event routing.
/// </summary>
public interface IWebhookService
{
    /// <summary>Verify the HMAC-SHA256 signature and parse the webhook payload.</summary>
    WebhookPayload? VerifyAndParse(string rawBody, string? signatureHeader);

    /// <summary>Process a verified webhook event (route to handlers).</summary>
    void HandleEvent(WebhookPayload payload);

    /// <summary>Get recent webhook events.</summary>
    IEnumerable<WebhookEventDto> GetRecentEvents(int count = 50);

    /// <summary>
    /// Set the HMAC secret at runtime (used by the interactive demo UI).
    /// In production, we recommend storing this in Azure Key Vault (or a similar
    /// secrets manager). You can also set it in appsettings.json, but a vault is preferred.
    /// </summary>
    void SetSecret(string secret);

    /// <summary>
    /// Check if a secret is configured. This is only needed for the interactive demo —
    /// in production your secret should always be available from your vault at startup.
    /// </summary>
    bool IsSecretConfigured { get; }
}

public class WebhookService : IWebhookService
{
    private readonly ILogger<WebhookService> _logger;
    private readonly List<WebhookPayload> _eventLog = [];
    private string? _runtimeSecret;

    public bool IsSecretConfigured => _runtimeSecret != null;

    public WebhookService(ILogger<WebhookService> logger)
    {
        _logger = logger;
    }

    public void SetSecret(string secret) => _runtimeSecret = secret;

    public WebhookPayload? VerifyAndParse(string rawBody, string? signatureHeader)
    {
        if (_runtimeSecret is null)
        {
            _logger.LogWarning("Webhook secret not configured — set it via the UI");
            return null;
        }

        if (!VerifySignature(rawBody, signatureHeader, _runtimeSecret))
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

        // Signed payload is "{timestamp}.{body}"
        var signedPayload = $"{timestamp}.{body}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload))).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(v1.ToLowerInvariant()));
    }
}
