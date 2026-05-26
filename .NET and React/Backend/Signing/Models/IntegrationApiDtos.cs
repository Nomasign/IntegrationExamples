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

/// <summary>Body sent to POST /api/templates/{id}/send.</summary>
public record IntegrationSendPayload
{
    [JsonPropertyName("signingRequests")]
    public required IntegrationSigningRequest[] SigningRequests { get; init; }

    [JsonPropertyName("sendInitialNotification")]
    public bool SendInitialNotification { get; init; } = true;
}

public record IntegrationSigningRequest
{
    [JsonPropertyName("recipients")]
    public required IntegrationRecipient[] Recipients { get; init; }

    [JsonPropertyName("fields")]
    public IntegrationFieldValue[] Fields { get; init; } = [];
}

public record IntegrationRecipient
{
    [JsonPropertyName("label")]
    public required string Label { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("email")]
    public required string Email { get; init; }
}

public record IntegrationFieldValue
{
    [JsonPropertyName("label")]
    public required string Label { get; init; }

    [JsonPropertyName("recipient")]
    public string? Recipient { get; init; }

    [JsonPropertyName("value")]
    public required string Value { get; init; }
}

/// <summary>Webhook payload delivered by NomaSign to our endpoint.</summary>
public record WebhookPayload(string Id, string Type, string ApiVersion, DateTime CreatedAt, WebhookSession? Session);
public record WebhookSession(Guid Id, Guid? TemplateId, DateTime? CompletedAt, List<WebhookRecipient>? Recipients, List<WebhookDocument>? Documents);
public record WebhookRecipient(string Label, string Name, string Email, string Status, DateTime? SignedAt, DateTime? DeclinedAt);
public record WebhookDocument(string Document, string? CloudDocumentId, List<WebhookField>? Fields);
public record WebhookField(string Label, string Type, string? Recipient, string? Value);
