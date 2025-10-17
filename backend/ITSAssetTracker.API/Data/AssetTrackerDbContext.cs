using Microsoft.EntityFrameworkCore;
using ITSAssetTracker.API.Models;

namespace ITSAssetTracker.API.Data;

public class AssetTrackerDbContext : DbContext
{
    public AssetTrackerDbContext(DbContextOptions<AssetTrackerDbContext> options)
        : base(options)
    {
    }

    public DbSet<Inventory> Inventories { get; set; }
    public DbSet<AuditHistory> AuditHistories { get; set; }
    public DbSet<NotificationConfig> NotificationConfigs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Inventory configuration
        modelBuilder.Entity<Inventory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ItemNumber).IsUnique();
            entity.Property(e => e.ItemNumber).IsRequired().HasMaxLength(100);
            entity.Property(e => e.HardwareDescription).IsRequired().HasMaxLength(500);
            entity.Property(e => e.HardwareType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Cost).HasPrecision(18, 2);
            entity.Property(e => e.LastModifiedBy).IsRequired().HasMaxLength(255);
        });

        // AuditHistory configuration
        modelBuilder.Entity<AuditHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ChangedBy).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ServiceNowTicketUrl).HasMaxLength(500);

            entity.HasOne(e => e.Item)
                .WithMany(i => i.AuditHistories)
                .HasForeignKey(e => e.ItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // NotificationConfig configuration
        modelBuilder.Entity<NotificationConfig>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ADGroupName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.AdditionalEmailRecipients).HasMaxLength(1000);
        });

        // Seed default notification config
        modelBuilder.Entity<NotificationConfig>().HasData(
            new NotificationConfig
            {
                Id = 1,
                ADGroupName = "IT_Governance",
                AdditionalEmailRecipients = ""
            }
        );
    }
}
