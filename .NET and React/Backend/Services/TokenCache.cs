namespace Backend.Services;

/// <summary>
/// In-memory token cache. In production, use a distributed cache (Redis, etc.)
/// or a proper token manager with automatic refresh.
/// </summary>
public class TokenCache
{
    private string? _token;
    private DateTime _expiresAt;

    public string? GetCurrent() =>
        _token != null && DateTime.UtcNow < _expiresAt ? _token : null;

    public void Set(string token, int expiresInSeconds)
    {
        _token = token;
        // Expire 60 seconds early to avoid edge-case failures.
        _expiresAt = DateTime.UtcNow.AddSeconds(expiresInSeconds - 60);
    }
}
