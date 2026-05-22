using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/config")]
public class ConfigController : ControllerBase
{
    private readonly IWebhookService _webhookService;
    private readonly RuntimeSettings _runtimeSettings;

    public ConfigController(IWebhookService webhookService, RuntimeSettings runtimeSettings)
    {
        _webhookService = webhookService;
        _runtimeSettings = runtimeSettings;
    }

    /// <summary>Get the current Integration API base URL.</summary>
    [HttpGet("base-url")]
    public IActionResult GetBaseUrl()
    {
        return Ok(new { baseUrl = _runtimeSettings.BaseUrl });
    }

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
    /// Set the HMAC webhook secret at runtime (from the frontend UI).
    /// In production, store this in a vault — not in memory.
    /// </summary>
    [HttpPost("webhook-secret")]
    public IActionResult SetWebhookSecret([FromBody] SetWebhookSecretRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Secret))
            return BadRequest("Secret is required.");

        _webhookService.SetSecret(request.Secret.Trim());
        return Ok(new WebhookSecretStatusResponse(Configured: true));
    }

    /// <summary>Check if the webhook secret is configured.</summary>
    [HttpGet("webhook-secret")]
    public IActionResult GetWebhookSecretStatus()
    {
        return Ok(new WebhookSecretStatusResponse(_webhookService.IsSecretConfigured));
    }

    /// <summary>Clear the cached access token, forcing re-exchange on next request.</summary>
    [HttpPost("clear-cache")]
    public IActionResult ClearTokenCache([FromServices] TokenCache cache)
    {
        cache.Clear();
        return Ok(new { cleared = true });
    }
}
