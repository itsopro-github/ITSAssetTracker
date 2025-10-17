using ITSAssetTracker.API.Middleware;
using ITSAssetTracker.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSAssetTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[ADGroupAuthorization("IT_ServiceDesk")]
public class CsvUploadController : ControllerBase
{
    private readonly ICsvProcessingService _csvService;
    private readonly ILogger<CsvUploadController> _logger;

    public CsvUploadController(
        ICsvProcessingService csvService,
        ILogger<CsvUploadController> logger)
    {
        _csvService = csvService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> UploadCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded");
        }

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("File must be a CSV");
        }

        var username = User.Identity?.Name ?? "Unknown";

        try
        {
            using var stream = file.OpenReadStream();
            var result = await _csvService.ProcessCsvUpload(stream, username);

            _logger.LogInformation("CSV upload processed by {User}. Success: {Success}, Failures: {Failures}",
                username, result.SuccessCount, result.FailureCount);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing CSV upload");
            return StatusCode(500, "An error occurred while processing the CSV file");
        }
    }

    [HttpGet("template")]
    public IActionResult GetCsvTemplate()
    {
        var template = "Item Number,Hardware Description,Hardware Type,Cost,Minimum Threshold,Reorder Amount,Current Quantity,Audit User,Audit Date,ServiceNow Ticket URL\n";
        template += "SAMPLE001,Dell Laptop Model XYZ,Laptop,1200.00,5,20,10,john.doe,2024-01-15,https://servicenow.company.com/ticket/12345\n";
        template += "SAMPLE002,HP Monitor 24inch,Monitor,250.00,10,30,8,jane.smith,2024-01-16,\n";

        var bytes = System.Text.Encoding.UTF8.GetBytes(template);
        return File(bytes, "text/csv", "inventory_template.csv");
    }
}
