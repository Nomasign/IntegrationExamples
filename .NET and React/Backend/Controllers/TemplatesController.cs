using Backend.Clients;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/templates")]
public class TemplatesController : ControllerBase
{
    private readonly INomaSignService _nomaSignService;

    public TemplatesController(INomaSignService nomaSignService)
    {
        _nomaSignService = nomaSignService;
    }

    /// <summary>
    /// List available signing templates.
    /// The frontend just calls GET — no parameters needed.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List()
    {
        try
        {
            var templates = await _nomaSignService.GetTemplatesAsync();
            return Ok(templates);
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

    /// <summary>
    /// Send a template for signature.
    /// The frontend sends a simple { label, name, email } — the service layer
    /// maps this into the Integration API's signingRequests format.
    /// </summary>
    [HttpPost("{templateId}/send")]
    public async Task<IActionResult> Send(string templateId, [FromBody] SendTemplateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Email is required.");

        try
        {
            var result = await _nomaSignService.SendTemplateAsync(templateId, request);
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
