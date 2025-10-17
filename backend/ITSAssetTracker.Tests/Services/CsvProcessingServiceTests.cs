using ITSAssetTracker.API.Data;
using ITSAssetTracker.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ITSAssetTracker.Tests.Services;

public class CsvProcessingServiceTests
{
    private readonly Mock<ILogger<CsvProcessingService>> _loggerMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly AssetTrackerDbContext _context;
    private readonly CsvProcessingService _service;

    public CsvProcessingServiceTests()
    {
        _loggerMock = new Mock<ILogger<CsvProcessingService>>();
        _emailServiceMock = new Mock<IEmailService>();
        _configurationMock = new Mock<IConfiguration>();

        var options = new DbContextOptionsBuilder<AssetTrackerDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AssetTrackerDbContext(options);
        _service = new CsvProcessingService(_context, _loggerMock.Object, _emailServiceMock.Object, _configurationMock.Object);
    }

    [Fact]
    public async Task ProcessCsvUpload_ValidData_CreatesNewItems()
    {
        // Arrange
        var csvContent = "Item Number,Hardware Description,Hardware Type,Cost,Minimum Threshold,Reorder Amount,Current Quantity,Audit User,Audit Date,ServiceNow Ticket URL\n" +
                        "TEST001,Test Laptop,Laptop,1200.00,5,20,10,testuser,2024-01-15,\n";

        var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(csvContent));

        // Act
        var result = await _service.ProcessCsvUpload(stream, "admin");

        // Assert
        Assert.Equal(1, result.SuccessCount);
        Assert.Equal(0, result.FailureCount);

        var item = await _context.Inventories.FirstOrDefaultAsync(i => i.ItemNumber == "TEST001");
        Assert.NotNull(item);
        Assert.Equal("Test Laptop", item.HardwareDescription);
        Assert.Equal(10, item.CurrentQuantity);
    }

    [Fact]
    public async Task ProcessCsvUpload_ExistingItem_UpdatesQuantity()
    {
        // Arrange
        var existingItem = new ITSAssetTracker.API.Models.Inventory
        {
            ItemNumber = "EXIST001",
            HardwareDescription = "Existing Item",
            HardwareType = "Laptop",
            Cost = 1000,
            MinimumThreshold = 5,
            ReorderAmount = 10,
            CurrentQuantity = 20,
            LastModifiedBy = "system",
            LastModifiedDate = DateTime.UtcNow
        };

        _context.Inventories.Add(existingItem);
        await _context.SaveChangesAsync();

        var csvContent = "Item Number,Hardware Description,Hardware Type,Cost,Minimum Threshold,Reorder Amount,Current Quantity,Audit User,Audit Date,ServiceNow Ticket URL\n" +
                        "EXIST001,Updated Item,Laptop,1200.00,5,20,15,testuser,2024-01-15,\n";

        var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(csvContent));

        // Act
        var result = await _service.ProcessCsvUpload(stream, "admin");

        // Assert
        Assert.Equal(1, result.SuccessCount);

        var updatedItem = await _context.Inventories.FirstOrDefaultAsync(i => i.ItemNumber == "EXIST001");
        Assert.NotNull(updatedItem);
        Assert.Equal(15, updatedItem.CurrentQuantity);
        Assert.Equal("Updated Item", updatedItem.HardwareDescription);
    }

    [Fact]
    public async Task ProcessCsvUpload_LowStock_CreatesAuditEntry()
    {
        // Arrange
        var csvContent = "Item Number,Hardware Description,Hardware Type,Cost,Minimum Threshold,Reorder Amount,Current Quantity,Audit User,Audit Date,ServiceNow Ticket URL\n" +
                        "LOW001,Low Stock Item,Laptop,1200.00,10,20,5,testuser,2024-01-15,\n";

        var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(csvContent));

        // Act
        var result = await _service.ProcessCsvUpload(stream, "admin");

        // Assert
        var auditEntries = await _context.AuditHistories.ToListAsync();
        Assert.Single(auditEntries);

        var audit = auditEntries[0];
        Assert.Equal(0, audit.PreviousQuantity); // New item
        Assert.Equal(5, audit.NewQuantity);
    }
}
