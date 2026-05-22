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
    Task<AuthenticateResponse> AuthenticateAsync(string refreshToken);
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

    public async Task<AuthenticateResponse> AuthenticateAsync(string refreshToken)
    {
        // Return cached token if still valid.
        var cached = _tokenCache.GetCurrent();
        if (cached != null)
            return new AuthenticateResponse(cached, FromCache: true);

        // Exchange the refresh token for a new access token.
        var tokenResponse = _client.ExchangeTokenAsync(refreshToken);
        var result = await tokenResponse;
        _tokenCache.Set(result.AccessToken, result.ExpiresIn);

        return new AuthenticateResponse(result.AccessToken, FromCache: false);
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
