using System.Text.Json.Serialization;

namespace Backend.Signing.Models;

// ─── Integration API models ───────────────────────────────────────────────────
// These match the JSON shapes the NomaSign Integration API sends/receives.
// They are internal to the backend — the frontend never sees these directly.

/// <summary>Response from POST /connect/token.</summary>
public record TokenResponse(
    [property: JsonPropertyName("access_token")] string AccessToken,
    [property: JsonPropertyName("expires_in")] int ExpiresIn,
    [property: JsonPropertyName("token_type")] string TokenType);

// The send payload (templateId + signingRequests) is built in the NomaSign app
// via "Copy Payload for Integration" and forwarded as raw JSON, so it needs no
// DTO here. See TemplatesController.Send / NomaSignClient.SendRawAsync.

/// <summary>Webhook payload delivered by NomaSign to our endpoint.</summary>
public record WebhookPayload(string Id, string Type, string ApiVersion, DateTime CreatedAt, WebhookSession? Session);
public record WebhookSession(Guid Id, Guid? TemplateId, DateTime? CompletedAt, List<WebhookRecipient>? Recipients, List<WebhookDocument>? Documents);
public record WebhookRecipient(string Label, string Name, string Email, string Status, DateTime? SignedAt, DateTime? DeclinedAt);
public record WebhookDocument(string Document, string? CloudDocumentId, List<WebhookField>? Fields);
public record WebhookField(string Label, string Type, string? Recipient, string? Value);
