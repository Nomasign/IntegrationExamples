namespace Backend.Signing.Models;

// ─── Frontend response DTOs ───────────────────────────────────────────────────
// Clean, simple objects returned to the React UI.

public record AuthenticateResponse(bool Authenticated, bool FromCache, DateTime ExpiresAt);

public record TemplateDto(string Id, string Title);

public record TemplateListResponse(List<TemplateDto> Templates);

public record SendTemplateResponse(Guid SessionId, string Status);

public record WebhookEventDto(
    string Id,
    string Type,
    DateTime CreatedAt,
    Guid? SessionId,
    string? TemplateId,
    List<WebhookRecipientDto>? Recipients
);

public record WebhookRecipientDto(string Label, string Name, string Email, string Status);

public record WebhookSecretStatusResponse(bool Configured);

public record HealthResponse(string Status);
