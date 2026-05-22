using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Backend.Models;

namespace Backend.Clients;

/// <summary>
/// HTTP client for the NomaSign Integration API.
/// This is the "data access layer" — it handles raw HTTP communication
/// and JSON serialization for the external API.
/// </summary>
public interface INomaSignClient
{
    /// <summary>Exchange a refresh token for an access token.</summary>
    Task<TokenResponse> ExchangeTokenAsync(string refreshToken);

    /// <summary>Fetch templates available to the authenticated user.</summary>
    Task<JsonElement> GetTemplatesAsync(string accessToken);

    /// <summary>Send a template to recipients.</summary>
    Task<JsonElement> SendTemplateAsync(string accessToken, string templateId, IntegrationSendPayload payload);
}

public class NomaSignClient : INomaSignClient
{
    private readonly HttpClient _http;
    private readonly string _clientId;

    public NomaSignClient(HttpClient httpClient, IConfiguration config)
    {
        _http = httpClient;
        _clientId = config["NomaSign:ClientId"]!;
    }

    public async Task<TokenResponse> ExchangeTokenAsync(string refreshToken)
    {
        var response = await _http.PostAsync("/connect/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["client_id"] = _clientId,
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

    public async Task<JsonElement> GetTemplatesAsync(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/templates");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _http.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new NomaSignApiException($"Failed to list templates: {error}", (int)response.StatusCode);
        }

        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public async Task<JsonElement> SendTemplateAsync(string accessToken, string templateId, IntegrationSendPayload payload)
    {
        var json = JsonSerializer.Serialize(payload);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/templates/{templateId}/send")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _http.SendAsync(request);
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
