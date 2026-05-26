using System.Text.Json;
using Backend.Clients;
using Backend.Models;

namespace Backend.Services;

/// <summary>
/// Core service layer — orchestrates authentication, template operations, and
/// maps simple frontend requests into the Integration API's expected format.
/// </summary>
public interface INomaSignService
{
    /// <summary>
    /// Exchange a Refresh Token for a short-lived Access Token (used by the interactive demo UI).
    /// In production, we recommend storing the Refresh Token in Azure Key Vault (or a similar
    /// secrets manager). You can also set it in appsettings.json, but a vault is preferred.
    /// </summary>
    Task<AuthenticateResponse> AuthenticateAsync(string refreshToken, bool forceRefresh = false);
    Task<JsonElement> GetTemplatesAsync();
    Task<JsonElement> SendTemplateAsync(string templateId, SendTemplateRequest request);
    string? GetCurrentToken();
}

public class NomaSignService : INomaSignService
{
    private readonly INomaSignClient _client;
    private readonly TokenCache _tokenCache;

    public NomaSignService(INomaSignClient client, TokenCache tokenCache)
    {
        _client = client;
        _tokenCache = tokenCache;
    }

    public async Task<AuthenticateResponse> AuthenticateAsync(string refreshToken, bool forceRefresh = false)
    {
        // Return cached token if still valid (unless caller requests fresh).
        if (!forceRefresh)
        {
            var cached = _tokenCache.GetCurrent();
            if (cached != null)
                return new AuthenticateResponse(cached, FromCache: true);
        }

        // Exchange the refresh token for a new access token.
        var result = await _client.ExchangeTokenAsync(refreshToken);
        var subscriptionExpiry = ExtractSubscriptionExpiry(result.AccessToken);
        _tokenCache.Set(result.AccessToken, result.ExpiresIn, subscriptionExpiry);

        return new AuthenticateResponse(result.AccessToken, FromCache: false);
    }

    /// <summary>
    /// Reads subscription_expires_at from the JWT payload without full validation
    /// (the API will validate the signature). Used only for cache eviction timing.
    /// </summary>
    private static DateTime? ExtractSubscriptionExpiry(string jwt)
    {
        var parts = jwt.Split('.');
        if (parts.Length != 3) return null;

        var payload = parts[1];
        // Pad base64url to standard base64.
        payload = payload.Replace('-', '+').Replace('_', '/');
        switch (payload.Length % 4)
        {
            case 2: payload += "=="; break;
            case 3: payload += "="; break;
        }

        try
        {
            var json = JsonDocument.Parse(Convert.FromBase64String(payload));
            if (json.RootElement.TryGetProperty("subscription_expires_at", out var prop))
            {
                var value = prop.GetString();
                if (DateTime.TryParse(value, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt))
                    return dt.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(dt, DateTimeKind.Utc) : dt.ToUniversalTime();
            }
        }
        catch { /* cache will just use token expiry */ }

        return null;
    }

    public async Task<JsonElement> GetTemplatesAsync()
    {
        var token = GetCurrentTokenOrThrow();
        return await _client.GetTemplatesAsync(token);
    }

    /// <summary>
    /// Maps the simple frontend request (name, email, label) into the
    /// Integration API's signingRequests payload format.
    /// </summary>
    public async Task<JsonElement> SendTemplateAsync(string templateId, SendTemplateRequest request)
    {
        var token = GetCurrentTokenOrThrow();

        // Map simple frontend DTO → Integration API payload.
        var payload = new IntegrationSendPayload
        {
            SigningRequests = [
                new IntegrationSigningRequest
                {
                    Recipients = [
                        new IntegrationRecipient
                        {
                            Label = request.Label,
                            Name = request.Name,
                            Email = request.Email
                        }
                    ],
                    Fields = []
                }
            ],
            SendInitialNotification = true
        };

        return await _client.SendTemplateAsync(token, templateId, payload);
    }

    public string? GetCurrentToken() => _tokenCache.GetCurrent();

    private string GetCurrentTokenOrThrow()
    {
        return _tokenCache.GetCurrent()
            ?? throw new InvalidOperationException("No access token. Authenticate first.");
    }
}
