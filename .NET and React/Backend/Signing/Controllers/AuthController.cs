using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly INomaSignService _nomaSignService;

    public AuthController(INomaSignService nomaSignService)
    {
        _nomaSignService = nomaSignService;
    }

    /// <summary>
    /// Exchange a refresh token for an access token.
    /// The frontend sends the refresh token (pasted by the user in the UI).
    /// </summary>
    [HttpPost("token")]
    public async Task<IActionResult> Authenticate([FromBody] AuthenticateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest("Refresh token is required.");

        try
        {
            var result = await _nomaSignService.AuthenticateAsync(request.RefreshToken, request.ForceRefresh);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Problem(ex.Message, statusCode: 500);
        }
    }
}
