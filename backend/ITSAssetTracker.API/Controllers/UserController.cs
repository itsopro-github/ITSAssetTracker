using ITSAssetTracker.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSAssetTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IActiveDirectoryService _adService;
    private readonly ILogger<UserController> _logger;

    public UserController(
        IActiveDirectoryService adService,
        ILogger<UserController> logger)
    {
        _adService = adService;
        _logger = logger;
    }

    [HttpGet("me")]
    public ActionResult GetCurrentUser()
    {
        var username = User.Identity?.Name;
        var isServiceDesk = _adService.IsUserInGroup(username ?? "", "IT_ServiceDesk");
        var isReadOnly = _adService.IsUserInGroup(username ?? "", "IT_ReadOnly");

        return Ok(new
        {
            username,
            roles = new
            {
                isServiceDesk,
                isReadOnly,
                isAdmin = isServiceDesk // For now, ServiceDesk members are admins
            }
        });
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<string>>> SearchUsers([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return BadRequest("Query must be at least 2 characters");
        }

        var users = await _adService.SearchUsers(query);
        return Ok(users);
    }
}
