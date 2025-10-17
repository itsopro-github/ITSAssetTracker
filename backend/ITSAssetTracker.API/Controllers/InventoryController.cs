using ITSAssetTracker.API.Data;
using ITSAssetTracker.API.Middleware;
using ITSAssetTracker.API.Models;
using ITSAssetTracker.API.Models.DTOs;
using ITSAssetTracker.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ITSAssetTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly AssetTrackerDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(
        AssetTrackerDbContext context,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<InventoryController> logger)
    {
        _context = context;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InventoryDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? hardwareType,
        [FromQuery] bool? needsReorder,
        [FromQuery] string? sortBy,
        [FromQuery] bool sortDesc = false)
    {
        var query = _context.Inventories.AsQueryable();

        // Apply filters
        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(i =>
                i.ItemNumber.Contains(search) ||
                i.HardwareDescription.Contains(search));
        }

        if (!string.IsNullOrEmpty(hardwareType))
        {
            query = query.Where(i => i.HardwareType == hardwareType);
        }

        if (needsReorder == true)
        {
            query = query.Where(i => i.CurrentQuantity <= i.MinimumThreshold);
        }

        // Apply sorting
        query = sortBy?.ToLower() switch
        {
            "itemnumber" => sortDesc ? query.OrderByDescending(i => i.ItemNumber) : query.OrderBy(i => i.ItemNumber),
            "description" => sortDesc ? query.OrderByDescending(i => i.HardwareDescription) : query.OrderBy(i => i.HardwareDescription),
            "type" => sortDesc ? query.OrderByDescending(i => i.HardwareType) : query.OrderBy(i => i.HardwareType),
            "quantity" => sortDesc ? query.OrderByDescending(i => i.CurrentQuantity) : query.OrderBy(i => i.CurrentQuantity),
            "cost" => sortDesc ? query.OrderByDescending(i => i.Cost) : query.OrderBy(i => i.Cost),
            "modified" => sortDesc ? query.OrderByDescending(i => i.LastModifiedDate) : query.OrderBy(i => i.LastModifiedDate),
            _ => query.OrderBy(i => i.ItemNumber)
        };

        var items = await query.ToListAsync();

        var dtos = items.Select(i => new InventoryDto
        {
            Id = i.Id,
            ItemNumber = i.ItemNumber,
            HardwareDescription = i.HardwareDescription,
            HardwareType = i.HardwareType,
            Cost = i.Cost,
            MinimumThreshold = i.MinimumThreshold,
            ReorderAmount = i.ReorderAmount,
            CurrentQuantity = i.CurrentQuantity,
            LastModifiedBy = i.LastModifiedBy,
            LastModifiedDate = i.LastModifiedDate
        }).ToList();

        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<InventoryDto>> GetById(int id)
    {
        var item = await _context.Inventories.FindAsync(id);

        if (item == null)
        {
            return NotFound();
        }

        var dto = new InventoryDto
        {
            Id = item.Id,
            ItemNumber = item.ItemNumber,
            HardwareDescription = item.HardwareDescription,
            HardwareType = item.HardwareType,
            Cost = item.Cost,
            MinimumThreshold = item.MinimumThreshold,
            ReorderAmount = item.ReorderAmount,
            CurrentQuantity = item.CurrentQuantity,
            LastModifiedBy = item.LastModifiedBy,
            LastModifiedDate = item.LastModifiedDate
        };

        return Ok(dto);
    }

    [HttpGet("{id}/audit-history")]
    public async Task<ActionResult<IEnumerable<AuditHistory>>> GetAuditHistory(int id)
    {
        var history = await _context.AuditHistories
            .Where(a => a.ItemId == id)
            .OrderByDescending(a => a.ChangeDate)
            .ToListAsync();

        return Ok(history);
    }

    [HttpGet("types")]
    public async Task<ActionResult<IEnumerable<string>>> GetHardwareTypes()
    {
        var types = await _context.Inventories
            .Select(i => i.HardwareType)
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();

        return Ok(types);
    }

    [HttpGet("low-stock-count")]
    public async Task<ActionResult<int>> GetLowStockCount()
    {
        var count = await _context.Inventories
            .CountAsync(i => i.CurrentQuantity <= i.MinimumThreshold);

        return Ok(count);
    }

    [HttpPost("update-quantity")]
    [ADGroupAuthorization("IT_ServiceDesk")]
    public async Task<ActionResult> UpdateQuantity([FromBody] UpdateInventoryDto dto)
    {
        var username = User.Identity?.Name ?? "Unknown";

        var item = await _context.Inventories
            .FirstOrDefaultAsync(i => i.ItemNumber == dto.ItemNumber);

        if (item == null)
        {
            return NotFound($"Item {dto.ItemNumber} not found");
        }

        var previousQuantity = item.CurrentQuantity;
        var newQuantity = previousQuantity + dto.QuantityChange;

        if (newQuantity < 0)
        {
            return BadRequest("Quantity cannot be negative");
        }

        item.CurrentQuantity = newQuantity;
        item.LastModifiedBy = username;
        item.LastModifiedDate = DateTime.UtcNow;

        // Create audit entry
        var auditEntry = new AuditHistory
        {
            ItemId = item.Id,
            PreviousQuantity = previousQuantity,
            NewQuantity = newQuantity,
            ChangedBy = username,
            ChangeDate = DateTime.UtcNow,
            ServiceNowTicketUrl = dto.ServiceNowTicketUrl
        };

        _context.AuditHistories.Add(auditEntry);
        await _context.SaveChangesAsync();

        // Send alert if item is now below threshold
        if (newQuantity <= item.MinimumThreshold && previousQuantity > item.MinimumThreshold)
        {
            var appBaseUrl = _configuration["AppSettings:BaseUrl"] ?? "http://localhost:3000";
            await _emailService.SendLowStockAlert(item, appBaseUrl);
        }

        _logger.LogInformation("Inventory updated: {ItemNumber} from {Old} to {New} by {User}",
            dto.ItemNumber, previousQuantity, newQuantity, username);

        return Ok(new { previousQuantity, newQuantity, itemNumber = item.ItemNumber });
    }

    [HttpGet("dashboard-stats")]
    public async Task<ActionResult> GetDashboardStats()
    {
        var totalItems = await _context.Inventories.CountAsync();
        var lowStockCount = await _context.Inventories
            .CountAsync(i => i.CurrentQuantity <= i.MinimumThreshold);
        var totalValue = await _context.Inventories
            .SumAsync(i => i.Cost * i.CurrentQuantity);
        var recentChanges = await _context.AuditHistories
            .OrderByDescending(a => a.ChangeDate)
            .Take(10)
            .Include(a => a.Item)
            .ToListAsync();

        return Ok(new
        {
            totalItems,
            lowStockCount,
            totalValue,
            recentChanges
        });
    }
}
