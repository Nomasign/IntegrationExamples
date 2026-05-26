using Backend.Signing.Models;
using Backend.Signing.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Signing.Controllers;

[ApiController]
[Route("api/signing/config")]
public class ConfigController : ControllerBase
{
    private readonly INomaSignService _nomaSignService;
    private readonly IWebhookService _webhookService;
    private readonly RuntimeSettings _runtimeSettings;

    public ConfigController(INomaSignService nomaSignService, IWebhookService webhookService, RuntimeSettings runtimeSettings)
    {
        _nomaSignService = nomaSignService;
        _webhookService = webhookService;
        _runtimeSettings = runtimeSettings;
    }

    /// <summary>Get the current Integration API base URL.</summary>
    [HttpGet("base-url")]
    public IActionResult GetBaseUrl() => Ok(new { baseUrl = _runtimeSettings.BaseUrl });

    /// <summary>Change the Integration API base URL at runtime.</summary>
    [HttpPost("base-url")]
    public IActionResult SetBaseUrl([FromBody] SetBaseUrlRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.BaseUrl))
            return BadRequest("BaseUrl is required.");

        _runtimeSettings.BaseUrl = request.BaseUrl.Trim();
        return Ok(new { baseUrl = _runtimeSettings.BaseUrl });
    }

    /// <summary>
    /// Save the long-lived refresh token to the secret store.
    /// In production, provision this at deployment time — not via an HTTP endpoint.
    /// </summary>
    [HttpPost("refresh-token")]
    public async Task<IActionResult> SetRefreshToken([FromBody] SetRefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest("RefreshToken is required.");

        await _nomaSignService.SetRefreshTokenAsync(request.RefreshToken.Trim());
        _nomaSignService.ClearAccessToken();
        return Ok(new { configured = true });
    }

    /// <summary>Check if a refresh token is configured.</summary>
    [HttpGet("refresh-token")]
    public async Task<IActionResult> GetRefreshTokenStatus()
    {
        var configured = await _nomaSignService.HasRefreshTokenAsync();
        return Ok(new { configured });
    }

    /// <summary>
    /// Save the HMAC webhook secret to the secret store.
    /// Same caveat as refresh token: provision out-of-band in production.
    /// </summary>
    [HttpPost("webhook-secret")]
    public async Task<IActionResult> SetWebhookSecret([FromBody] SetWebhookSecretRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Secret))
            return BadRequest("Secret is required.");

        await _webhookService.SetSecretAsync(request.Secret.Trim());
        return Ok(new WebhookSecretStatusResponse(Configured: true));
    }

    /// <summary>Check if the webhook secret is configured.</summary>
    [HttpGet("webhook-secret")]
    public async Task<IActionResult> GetWebhookSecretStatus()
    {
        var configured = await _webhookService.IsSecretConfiguredAsync();
        return Ok(new WebhookSecretStatusResponse(configured));
    }
}
