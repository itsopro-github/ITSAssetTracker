namespace ITSAssetTracker.API.Models;

public class Inventory
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

    public ICollection<AuditHistory> AuditHistories { get; set; } = new List<AuditHistory>();
}
