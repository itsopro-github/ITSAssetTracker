namespace ITSAssetTracker.API.Models;

public class Inventory
{
    public int Id { get; set; }
    public required string ItemNumber { get; set; }
    public required string AssetType { get; set; } // "Hardware" or "Software"
    public required string Description { get; set; }
    public string? Category { get; set; } // For Hardware: "Laptop", "Monitor", etc. For Software: "License", "Subscription", etc.
    public decimal Cost { get; set; }
    public int MinimumThreshold { get; set; }
    public int ReorderAmount { get; set; }
    public int CurrentQuantity { get; set; }
    public required string LastModifiedBy { get; set; }
    public DateTime LastModifiedDate { get; set; }

    // Legacy properties for backward compatibility - will be removed in future
    public string? HardwareDescription { get; set; }
    public string? HardwareType { get; set; }

    public ICollection<AuditHistory> AuditHistories { get; set; } = new List<AuditHistory>();
}
