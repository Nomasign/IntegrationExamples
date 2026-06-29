namespace Backend.Signing.Models;

// ─── Frontend request DTOs ────────────────────────────────────────────────────
// The send payload itself is forwarded as raw JSON (see TemplatesController.Send),
// so there's no send DTO here — only the small config writes below.

/// <summary>POST /api/config/refresh-token — frontend stores the long-lived refresh token.</summary>
public record SetRefreshTokenRequest(string RefreshToken);

/// <summary>POST /api/config/webhook-secret — frontend sets the HMAC secret.</summary>
public record SetWebhookSecretRequest(string Secret);

/// <summary>POST /api/config/base-url — frontend changes the Integration API target.</summary>
public record SetBaseUrlRequest(string BaseUrl);
