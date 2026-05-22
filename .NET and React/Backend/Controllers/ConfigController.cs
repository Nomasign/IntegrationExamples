using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/config")]
public class ConfigController : ControllerBase
{
    private readonly IWebhookService _webhookService;

    public ConfigController(IWebhookService webhookService)
    {
        _webhookService = webhookService;
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
}
