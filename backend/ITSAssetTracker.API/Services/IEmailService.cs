using ITSAssetTracker.API.Models;

namespace ITSAssetTracker.API.Services;

public interface IEmailService
{
    Task SendLowStockAlert(Inventory item, string appBaseUrl);
    Task SendLowStockAlerts(List<Inventory> items, string appBaseUrl);
}
