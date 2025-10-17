using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using ITSAssetTracker.API.Data;
using ITSAssetTracker.API.Models;
using ITSAssetTracker.API.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ITSAssetTracker.API.Services;

public class CsvProcessingService : ICsvProcessingService
{
    private readonly AssetTrackerDbContext _context;
    private readonly ILogger<CsvProcessingService> _logger;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public CsvProcessingService(
        AssetTrackerDbContext context,
        ILogger<CsvProcessingService> logger,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
        _configuration = configuration;
    }

    public async Task<CsvUploadResultDto> ProcessCsvUpload(Stream csvStream, string uploadedBy)
    {
        var result = new CsvUploadResultDto();
        var lowStockItems = new List<Inventory>();

        try
        {
            using var reader = new StreamReader(csvStream);
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null
            };

            using var csv = new CsvReader(reader, config);
            var records = csv.GetRecords<InventoryCsvRow>().ToList();

            _logger.LogInformation("Processing {Count} CSV records uploaded by {User}", records.Count, uploadedBy);

            foreach (var record in records)
            {
                try
                {
                    await ProcessCsvRow(record, uploadedBy, lowStockItems);
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row with ItemNumber '{record.ItemNumber}': {ex.Message}");
                    _logger.LogError(ex, "Error processing CSV row for item {ItemNumber}", record.ItemNumber);
                }
            }

            await _context.SaveChangesAsync();

            // Send email alerts for low stock items
            if (lowStockItems.Any())
            {
                var appBaseUrl = _configuration["AppSettings:BaseUrl"] ?? "http://localhost:3000";
                await _emailService.SendLowStockAlerts(lowStockItems, appBaseUrl);

                result.LowStockAlerts = lowStockItems
                    .Select(i => $"{i.ItemNumber} - {i.HardwareDescription} (Qty: {i.CurrentQuantity}, Threshold: {i.MinimumThreshold})")
                    .ToList();
            }

            _logger.LogInformation("CSV upload completed. Success: {Success}, Failures: {Failures}, Low Stock Alerts: {Alerts}",
                result.SuccessCount, result.FailureCount, lowStockItems.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing CSV upload");
            throw;
        }

        return result;
    }

    private async Task ProcessCsvRow(InventoryCsvRow row, string uploadedBy, List<Inventory> lowStockItems)
    {
        var existingItem = await _context.Inventories
            .FirstOrDefaultAsync(i => i.ItemNumber == row.ItemNumber);

        if (existingItem != null)
        {
            // Update existing item
            var previousQuantity = existingItem.CurrentQuantity;

            existingItem.HardwareDescription = row.HardwareDescription;
            existingItem.HardwareType = row.HardwareType;
            existingItem.Cost = row.Cost;
            existingItem.MinimumThreshold = row.MinimumThreshold;
            existingItem.ReorderAmount = row.ReorderAmount;
            existingItem.CurrentQuantity = row.CurrentQuantity;
            existingItem.LastModifiedBy = row.AuditUser ?? uploadedBy;
            existingItem.LastModifiedDate = DateTime.UtcNow;

            // Create audit entry if quantity changed
            if (previousQuantity != row.CurrentQuantity)
            {
                var auditEntry = new AuditHistory
                {
                    ItemId = existingItem.Id,
                    PreviousQuantity = previousQuantity,
                    NewQuantity = row.CurrentQuantity,
                    ChangedBy = row.AuditUser ?? uploadedBy,
                    ChangeDate = DateTime.UtcNow,
                    ServiceNowTicketUrl = row.ServiceNowTicketUrl
                };

                _context.AuditHistories.Add(auditEntry);
            }

            // Check if item is now below threshold
            if (existingItem.CurrentQuantity <= existingItem.MinimumThreshold)
            {
                lowStockItems.Add(existingItem);
            }
        }
        else
        {
            // Create new item
            var newItem = new Inventory
            {
                ItemNumber = row.ItemNumber,
                HardwareDescription = row.HardwareDescription,
                HardwareType = row.HardwareType,
                Cost = row.Cost,
                MinimumThreshold = row.MinimumThreshold,
                ReorderAmount = row.ReorderAmount,
                CurrentQuantity = row.CurrentQuantity,
                LastModifiedBy = row.AuditUser ?? uploadedBy,
                LastModifiedDate = DateTime.UtcNow
            };

            _context.Inventories.Add(newItem);
            await _context.SaveChangesAsync(); // Save to get the ID

            // Create audit entry for new item
            var auditEntry = new AuditHistory
            {
                ItemId = newItem.Id,
                PreviousQuantity = 0,
                NewQuantity = row.CurrentQuantity,
                ChangedBy = row.AuditUser ?? uploadedBy,
                ChangeDate = DateTime.UtcNow,
                ServiceNowTicketUrl = row.ServiceNowTicketUrl
            };

            _context.AuditHistories.Add(auditEntry);

            // Check if new item is below threshold
            if (newItem.CurrentQuantity <= newItem.MinimumThreshold)
            {
                lowStockItems.Add(newItem);
            }
        }
    }
}
