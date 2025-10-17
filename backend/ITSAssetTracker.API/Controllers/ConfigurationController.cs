using ITSAssetTracker.API.Data;
using ITSAssetTracker.API.Middleware;
using ITSAssetTracker.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSAssetTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[ADGroupAuthorization("IT_ServiceDesk")] // Only admins/service desk can manage configuration
public class ConfigurationController : ControllerBase
{
    private readonly AssetTrackerDbContext _context;
    private readonly ILogger<ConfigurationController> _logger;

    public ConfigurationController(
        AssetTrackerDbContext context,
        ILogger<ConfigurationController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("notification")]
    public async Task<ActionResult<NotificationConfig>> GetNotificationConfig()
    {
        var config = await _context.NotificationConfigs.FirstOrDefaultAsync();

        if (config == null)
        {
            return NotFound();
        }

        return Ok(config);
    }

    [HttpPut("notification")]
    public async Task<ActionResult> UpdateNotificationConfig([FromBody] NotificationConfig updatedConfig)
    {
        var config = await _context.NotificationConfigs.FirstOrDefaultAsync();

        if (config == null)
        {
            // Create new config if none exists
            config = new NotificationConfig
            {
                ADGroupName = updatedConfig.ADGroupName,
                AdditionalEmailRecipients = updatedConfig.AdditionalEmailRecipients
            };
            _context.NotificationConfigs.Add(config);
        }
        else
        {
            config.ADGroupName = updatedConfig.ADGroupName;
            config.AdditionalEmailRecipients = updatedConfig.AdditionalEmailRecipients;
        }

        await _context.SaveChangesAsync();

        var username = User.Identity?.Name ?? "Unknown";
        _logger.LogInformation("Notification configuration updated by {User}", username);

        return Ok(config);
    }
}
