using Backend.Signing.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Signing.Controllers;

[ApiController]
[Route("api/signing/auth")]
public class AuthController : ControllerBase
{
    private readonly INomaSignService _nomaSignService;

    public AuthController(INomaSignService nomaSignService)
    {
        _nomaSignService = nomaSignService;
    }

    /// <summary>
    /// Trigger a token exchange using the refresh token stored in the secret store
    /// (set it first via POST /api/config/refresh-token). The access token is cached
    /// server-side and never returned to the caller.
    /// </summary>
    [HttpPost("token")]
    public async Task<IActionResult> Authenticate([FromQuery] bool forceRefresh = false)
    {
        if (!await _nomaSignService.HasRefreshTokenAsync())
            return BadRequest("No refresh token configured. POST it to /api/config/refresh-token first.");

        var result = await _nomaSignService.AuthenticateAsync(forceRefresh);
        return Ok(result);
    }
}
