using System.Text.Json;
using Backend.Infra;
using Backend.Signing.Clients;
using Backend.Signing.Models;

namespace Backend.Signing.Services;

/// <summary>
/// Core service layer — orchestrates authentication, template operations, and
/// maps simple frontend requests into the Integration API's expected format.
///
/// The refresh token lives in <see cref="ISecretStore"/> (set once via the demo UI, or
/// provisioned to Key Vault in production). The short-lived access token lives in this
/// service's private fields — there's no separate "TokenCache" class because the lifetime,
/// ownership, and refresh rules are inseparable from the auth logic.
/// </summary>
public interface INomaSignService
{
    /// <summary>
    /// Ensure we have a fresh access token. Returns whether one was already cached
    /// or had to be minted by exchanging the refresh token.
    /// </summary>
    Task<AuthenticateResponse> AuthenticateAsync(bool forceRefresh = false);

    Task<JsonElement> GetTemplatesAsync();
    Task<JsonElement> SendTemplateAsync(string templateId, SendTemplateRequest request);

    /// <summary>Store the user's refresh token in the secret store.</summary>
    Task SetRefreshTokenAsync(string refreshToken);

    /// <summary>True if a refresh token is currently configured in the secret store.</summary>
    Task<bool> HasRefreshTokenAsync();

    /// <summary>Drop the cached access token, forcing a re-exchange on the next call.</summary>
    void ClearAccessToken();
}

public class NomaSignService : INomaSignService
{
    public const string RefreshTokenKey = "nomasign-refresh-token";

    private readonly INomaSignClient _client;
    private readonly ISecretStore _secretStore;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private string? _accessToken;
    private DateTime _accessExpiresAt;

    public NomaSignService(INomaSignClient client, ISecretStore secretStore)
    {
        _client = client;
        _secretStore = secretStore;
    }

    public Task SetRefreshTokenAsync(string refreshToken) =>
        _secretStore.SetSecretAsync(RefreshTokenKey, refreshToken);

    public async Task<bool> HasRefreshTokenAsync() =>
        await _secretStore.GetSecretAsync(RefreshTokenKey) is not null;

    public void ClearAccessToken()
    {
        _accessToken = null;
        _accessExpiresAt = DateTime.MinValue;
    }

    public async Task<AuthenticateResponse> AuthenticateAsync(bool forceRefresh = false)
    {
        if (!forceRefresh && _accessToken is not null && DateTime.UtcNow < _accessExpiresAt)
            return new AuthenticateResponse(Authenticated: true, FromCache: true, ExpiresAt: _accessExpiresAt);

        await ExchangeAsync();
        return new AuthenticateResponse(Authenticated: true, FromCache: false, ExpiresAt: _accessExpiresAt);
    }

    public async Task<JsonElement> GetTemplatesAsync()
    {
        var token = await EnsureAccessTokenAsync();
        return await _client.GetTemplatesAsync(token);
    }

    /// <summary>
    /// Maps the simple frontend request (name, email, label) into the
    /// Integration API's signingRequests payload format.
    /// </summary>
    public async Task<JsonElement> SendTemplateAsync(string templateId, SendTemplateRequest request)
    {
        var token = await EnsureAccessTokenAsync();

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

    /// <summary>
    /// Returns a non-expired access token, minting a new one from the stored refresh token if needed.
    /// </summary>
    private async Task<string> EnsureAccessTokenAsync()
    {
        if (_accessToken is not null && DateTime.UtcNow < _accessExpiresAt)
            return _accessToken;

        await ExchangeAsync();
        return _accessToken!;
    }

    /// <summary>
    /// Exchange the stored refresh token for a new access token.
    /// Guarded by a semaphore so concurrent requests don't all hit /connect/token.
    /// </summary>
    private async Task ExchangeAsync()
    {
        await _refreshLock.WaitAsync();
        try
        {
            // Double-check inside the lock: another caller may have refreshed while we waited.
            if (_accessToken is not null && DateTime.UtcNow < _accessExpiresAt) return;

            var refreshToken = await _secretStore.GetSecretAsync(RefreshTokenKey)
                ?? throw new InvalidOperationException(
                    "No refresh token configured. Save it via POST /api/config/refresh-token first.");

            var result = await _client.ExchangeTokenAsync(refreshToken);
            var subscriptionExpiry = ExtractSubscriptionExpiry(result.AccessToken);

            _accessToken = result.AccessToken;
            // Expire at whichever comes first: token expiry (minus 60s buffer) or subscription period end.
            var tokenExpiry = DateTime.UtcNow.AddSeconds(result.ExpiresIn - 60);
            _accessExpiresAt = subscriptionExpiry.HasValue && subscriptionExpiry.Value < tokenExpiry
                ? subscriptionExpiry.Value
                : tokenExpiry;
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    /// <summary>
    /// Reads <c>subscription_expires_at</c> from the JWT payload without validating the signature
    /// (the API will validate when we use the token). Lets us evict the cached token early if the
    /// subscription ends before the token's nominal expiry.
    /// </summary>
    private static DateTime? ExtractSubscriptionExpiry(string jwt)
    {
        var parts = jwt.Split('.');
        if (parts.Length != 3) return null;

        var payload = parts[1].Replace('-', '+').Replace('_', '/');
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
        catch { /* fall back to token expiry */ }

        return null;
    }
}
