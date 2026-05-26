namespace Backend.Signing.Models;

// ─── Frontend request DTOs ────────────────────────────────────────────────────
// These are intentionally simple — the frontend sends basic data,
// the service layer maps it to what the Integration API expects.

/// <summary>POST /api/templates/{id}/send — frontend sends one recipient.</summary>
public record SendTemplateRequest
{
    public string Label { get; init; } = "Recipient 1";
    public string Name { get; init; } = "";
    public string Email { get; init; } = "";
}

/// <summary>POST /api/config/refresh-token — frontend stores the long-lived refresh token.</summary>
public record SetRefreshTokenRequest(string RefreshToken);

/// <summary>POST /api/config/webhook-secret — frontend sets the HMAC secret.</summary>
public record SetWebhookSecretRequest(string Secret);

/// <summary>POST /api/config/base-url — frontend changes the Integration API target.</summary>
public record SetBaseUrlRequest(string BaseUrl);
