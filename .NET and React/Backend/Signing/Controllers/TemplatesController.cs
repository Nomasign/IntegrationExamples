using System.Text.Json;
using Backend.Signing.Clients;
using Backend.Signing.Models;
using Backend.Signing.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Signing.Controllers;

[ApiController]
[Route("api/signing/templates")]
public class TemplatesController : ControllerBase
{
    private readonly INomaSignService _nomaSignService;

    public TemplatesController(INomaSignService nomaSignService)
    {
        _nomaSignService = nomaSignService;
    }

    /// <summary>
    /// Send a template for signature. The frontend POSTs the payload copied from
    /// the NomaSign app's "Copy Payload for Integration" action (templateId +
    /// signingRequests); the backend forwards it as-is with the access token
    /// attached. (Templates are discovered in the app, not via a list endpoint.)
    /// </summary>
    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] JsonElement payload)
    {
        if (payload.ValueKind != JsonValueKind.Object || !payload.TryGetProperty("templateId", out _))
            return BadRequest("Payload must be a JSON object with a templateId.");

        try
        {
            var result = await _nomaSignService.SendRawAsync(payload);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (NomaSignApiException ex)
        {
            return Problem(ex.Message, statusCode: ex.StatusCode);
        }
    }
}
