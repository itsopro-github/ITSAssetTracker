namespace ITSAssetTracker.API.Models;

public class NotificationConfig
{
    public int Id { get; set; }
    public required string ADGroupName { get; set; }
    public string? AdditionalEmailRecipients { get; set; } // Comma-separated
}
