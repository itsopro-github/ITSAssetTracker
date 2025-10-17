namespace ITSAssetTracker.API.Models.DTOs;

public class InventoryDto
{
    public int Id { get; set; }
    public required string ItemNumber { get; set; }
    public required string HardwareDescription { get; set; }
    public required string HardwareType { get; set; }
    public decimal Cost { get; set; }
    public int MinimumThreshold { get; set; }
    public int ReorderAmount { get; set; }
    public int CurrentQuantity { get; set; }
    public required string LastModifiedBy { get; set; }
    public DateTime LastModifiedDate { get; set; }
    public bool NeedsReorder => CurrentQuantity <= MinimumThreshold;
}

public class UpdateInventoryDto
{
    public required string ItemNumber { get; set; }
    public int QuantityChange { get; set; }
    public string? ServiceNowTicketUrl { get; set; }
    public string? AssignedToUser { get; set; }
}

public class CsvUploadResultDto
{
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> LowStockAlerts { get; set; } = new();
}

public class InventoryCsvRow
{
    public required string ItemNumber { get; set; }
    public required string HardwareDescription { get; set; }
    public required string HardwareType { get; set; }
    public decimal Cost { get; set; }
    public int MinimumThreshold { get; set; }
    public int ReorderAmount { get; set; }
    public int CurrentQuantity { get; set; }
    public string? AuditUser { get; set; }
    public string? AuditDate { get; set; }
    public string? ServiceNowTicketUrl { get; set; }
}
