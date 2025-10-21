namespace ITSAssetTracker.API.Models.DTOs;

public class InventoryDto
{
    public int Id { get; set; }
    public required string ItemNumber { get; set; }
    public required string AssetType { get; set; } // "Hardware" or "Software"
    public required string Description { get; set; }
    public string? Category { get; set; }
    public decimal Cost { get; set; }
    public int MinimumThreshold { get; set; }
    public int ReorderAmount { get; set; }
    public int CurrentQuantity { get; set; }
    public required string LastModifiedBy { get; set; }
    public DateTime LastModifiedDate { get; set; }
    public bool NeedsReorder => CurrentQuantity <= MinimumThreshold;

    // Legacy properties for backward compatibility
    public string? HardwareDescription { get; set; }
    public string? HardwareType { get; set; }
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
    public string? AssetType { get; set; } // "Hardware" or "Software"
    public string? Description { get; set; }
    public string? Category { get; set; }

    // Legacy fields for backward compatibility
    public string? HardwareDescription { get; set; }
    public string? HardwareType { get; set; }

    public decimal Cost { get; set; }
    public int MinimumThreshold { get; set; }
    public int ReorderAmount { get; set; }
    public int CurrentQuantity { get; set; }
    public string? AuditUser { get; set; }
    public string? AuditDate { get; set; }
    public string? ServiceNowTicketUrl { get; set; }
}
