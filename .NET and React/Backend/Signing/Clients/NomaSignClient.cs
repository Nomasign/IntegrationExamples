using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Backend.Signing.Models;
using Backend.Signing.Services;

namespace Backend.Signing.Clients;

/// <summary>
/// HTTP client for the NomaSign Integration API.
/// This is the "data access layer" — it handles raw HTTP communication
/// and JSON serialization for the external API.
/// </summary>
public interface INomaSignClient
{
    /// <summary>Exchange a refresh token for an access token.</summary>
    Task<TokenResponse> ExchangeTokenAsync(string refreshToken);

    /// <summary>Send a template to recipients. The template id travels in the payload.</summary>
    Task<JsonElement> SendTemplateAsync(string accessToken, IntegrationSendPayload payload);
}

public class NomaSignClient : INomaSignClient
{
    public const string HttpClientName = "nomasign";

    private readonly IHttpClientFactory _httpFactory;
    private readonly RuntimeSettings _settings;

    public NomaSignClient(IHttpClientFactory httpFactory, RuntimeSettings settings)
    {
        _httpFactory = httpFactory;
        _settings = settings;
    }

    private HttpClient Http() => _httpFactory.CreateClient(HttpClientName);
    private string Url(string path) => $"{_settings.BaseUrl}{path}";

    public async Task<TokenResponse> ExchangeTokenAsync(string refreshToken)
    {
        // Only the refresh token is the caller's to provide — grant_type and
        // client_id are fixed server-side by the Integration API's broker.
        var response = await Http().PostAsync(Url("/connect/token"),
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["refresh_token"] = refreshToken
            }));

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new NomaSignApiException($"Token exchange failed: {error}", (int)response.StatusCode);
        }

        var token = await response.Content.ReadFromJsonAsync<TokenResponse>();
        return token ?? throw new NomaSignApiException("Empty token response", 500);
    }

    public async Task<JsonElement> SendTemplateAsync(string accessToken, IntegrationSendPayload payload)
    {
        var json = JsonSerializer.Serialize(payload);
        using var request = new HttpRequestMessage(HttpMethod.Post, Url("/api/templates/send"))
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await Http().SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new NomaSignApiException($"Send failed: {error}", (int)response.StatusCode);
        }

        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}

/// <summary>Thrown when the Integration API returns a non-success status.</summary>
public class NomaSignApiException : Exception
{
    public int StatusCode { get; }
    public NomaSignApiException(string message, int statusCode) : base(message)
    {
        StatusCode = statusCode;
    }
}
