namespace Backend.Services;

/// <summary>
/// In-memory token cache. In production, use a distributed cache (Redis, etc.)
/// or a proper token manager with automatic refresh.
/// </summary>
public class TokenCache
{
    private string? _token;
    private DateTime _expiresAt;

    public bool FromCache => _token != null && DateTime.UtcNow < _expiresAt;

    public string? GetCurrent() =>
        _token != null && DateTime.UtcNow < _expiresAt ? _token : null;

    public void Set(string token, int expiresInSeconds, DateTime? subscriptionExpiresAt = null)
    {
        _token = token;
        // Expire at whichever comes first: token expiry (minus 60s buffer) or subscription period end.
        var tokenExpiry = DateTime.UtcNow.AddSeconds(expiresInSeconds - 60);
        _expiresAt = subscriptionExpiresAt.HasValue && subscriptionExpiresAt.Value < tokenExpiry
            ? subscriptionExpiresAt.Value
            : tokenExpiry;
    }

    public void Clear()
    {
        _token = null;
        _expiresAt = DateTime.MinValue;
    }
}
