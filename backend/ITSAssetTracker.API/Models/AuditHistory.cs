namespace ITSAssetTracker.API.Models;

public class AuditHistory
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public int PreviousQuantity { get; set; }
    public int NewQuantity { get; set; }
    public required string ChangedBy { get; set; }
    public DateTime ChangeDate { get; set; }
    public string? ServiceNowTicketUrl { get; set; }

    public Inventory? Item { get; set; }
}
