using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly IWebhookService _webhookService;

    public WebhooksController(IWebhookService webhookService)
    {
        _webhookService = webhookService;
    }

    /// <summary>
    /// Receives webhook deliveries from NomaSign.
    /// NomaSign POSTs here when signing events occur (session completed, participant signed, etc.).
    /// The signature is verified using HMAC-SHA256 before processing.
    /// </summary>
    [HttpPost("nomasign")]
    public async Task<IActionResult> Receive()
    {
        // Read raw body for HMAC verification (must read before model binding consumes it).
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();

        var signatureHeader = Request.Headers["X-NomaSign-Signature"].FirstOrDefault();

        var payload = _webhookService.VerifyAndParse(rawBody, signatureHeader);
        if (payload == null)
            return Unauthorized();

        _webhookService.HandleEvent(payload);

        // Always return 200 quickly — do heavy processing asynchronously in production.
        return Ok();
    }

    /// <summary>
    /// Returns recent webhook events for the frontend to display.
    /// </summary>
    [HttpGet("log")]
    public IActionResult GetLog()
    {
        var events = _webhookService.GetRecentEvents();
        return Ok(events);
    }
}
