# MS SQL Server Migration Guide - ITS Asset Tracker

[[_TOC_]]

---

## Overview

This guide outlines the preparation work and steps required to migrate the ITS Asset Tracker from SQLite to Microsoft SQL Server.

**Current Database**: SQLite (file-based)
**Target Database**: MS SQL Server
**Migration Tool**: Prisma ORM with provider switch

---

## Prerequisites

### 1. SQL Server Requirements

**Option A: SQL Server (On-Premises)**
- SQL Server 2017 or newer
- SQL Server Management Studio (SSMS) 18.0+
- TCP/IP protocol enabled
- SQL Server Browser service running

**Option B: Azure SQL Database (Cloud)**
- Azure subscription
- Azure SQL Database instance provisioned
- Firewall rules configured for your IP/network

### 2. Access Requirements

- **SQL Server Authentication**: Username and password
  - OR -
- **Windows Authentication**: Domain account with database permissions

### 3. Required Permissions

The SQL Server user account needs:
- `CREATE DATABASE` permission (for initial setup)
- `db_owner` role on the target database
- `db_datareader` and `db_datawriter` permissions minimum

---

## Database Setup

### 1. Create Database

Connect to SQL Server using SSMS or Azure Data Studio and run:

```sql
-- Create database
CREATE DATABASE ITSAssetTracker
GO

-- Verify creation
USE ITSAssetTracker
GO

-- Set database collation (optional but recommended)
ALTER DATABASE ITSAssetTracker
COLLATE SQL_Latin1_General_CP1_CI_AS
GO
```

### 2. Create Database User (if using SQL Authentication)

```sql
-- Create login at server level
CREATE LOGIN AssetTrackerApp
WITH PASSWORD = 'YourSecurePassword123!';
GO

-- Create user in database
USE ITSAssetTracker;
GO

CREATE USER AssetTrackerApp FOR LOGIN AssetTrackerApp;
GO

-- Grant permissions
ALTER ROLE db_owner ADD MEMBER AssetTrackerApp;
GO
```

### 3. Configure Firewall (if using Azure SQL)

```bash
# Using Azure CLI
az sql server firewall-rule create \
  --resource-group YourResourceGroup \
  --server YourSQLServerName \
  --name AllowYourIP \
  --start-ip-address YOUR.IP.ADDRESS \
  --end-ip-address YOUR.IP.ADDRESS
```

Or configure via Azure Portal:
- Navigate to SQL Server → Security → Firewalls and virtual networks
- Add client IP or allow Azure services

---

## Prisma Schema Changes

### 1. Update Database Provider

Edit `backend-express/prisma/schema.prisma`:

**Before (SQLite):**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**After (SQL Server):**
```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

### 2. Update Data Types (if needed)

SQL Server has slightly different type mappings. The current schema should work as-is, but here are potential adjustments:

```prisma
model Inventory {
  id                  Int            @id @default(autoincrement())
  itemNumber          String         @unique @map("ItemNumber") @db.NVarChar(100)
  assetType           String         @map("AssetType") @db.NVarChar(50)
  description         String         @map("Description") @db.NVarChar(500)
  category            String?        @map("Category") @db.NVarChar(100)
  cost                Float          @map("Cost") @db.Decimal(10, 2)
  // ... rest of fields
}
```

**Key Differences:**
- `String` → `NVARCHAR` (Unicode support)
- `Float` → `DECIMAL` or `FLOAT` (for precision)
- `DateTime` → `DATETIME2` (more precision than DATETIME)

### 3. Add Schema Name (Optional)

For multi-schema support:

```prisma
model Inventory {
  // ...
  @@map("Inventories")
  @@schema("dbo") // Default schema
}
```

---

## Environment Configuration

### 1. Connection String Format

Update `backend-express/.env`:

**SQL Server Authentication:**
```env
DATABASE_URL="sqlserver://localhost:1433;database=ITSAssetTracker;user=AssetTrackerApp;password=YourSecurePassword123!;encrypt=true;trustServerCertificate=true"
```

**Windows Authentication:**
```env
DATABASE_URL="sqlserver://localhost:1433;database=ITSAssetTracker;integratedSecurity=true;encrypt=true;trustServerCertificate=true"
```

**Azure SQL Database:**
```env
DATABASE_URL="sqlserver://yourserver.database.windows.net:1433;database=ITSAssetTracker;user=AssetTrackerApp@yourserver;password=YourSecurePassword123!;encrypt=true"
```

### 2. Connection String Parameters Explained

| Parameter | Description | Values |
|-----------|-------------|---------|
| `database` | Database name | `ITSAssetTracker` |
| `user` | SQL user (without @server for on-prem) | `AssetTrackerApp` |
| `password` | SQL password | Secure password |
| `encrypt` | Use TLS/SSL | `true` (recommended) |
| `trustServerCertificate` | Trust self-signed certs | `true` (dev), `false` (prod) |
| `integratedSecurity` | Use Windows Auth | `true` or `false` |
| `connectionTimeout` | Connection timeout in seconds | `30` (default) |
| `requestTimeout` | Query timeout in seconds | `60` (default) |

### 3. Connection Pooling (Production)

For better performance in production:

```env
DATABASE_URL="sqlserver://localhost:1433;database=ITSAssetTracker;user=AssetTrackerApp;password=YourSecurePassword123!;encrypt=true;trustServerCertificate=false;pooling=true;minPoolSize=2;maxPoolSize=10"
```

---

## Migration Steps

### Step 1: Install SQL Server Dependencies

The Prisma Client will automatically use the appropriate database driver, but ensure you have the latest Prisma:

```bash
cd backend-express
npm install prisma@latest @prisma/client@latest
```

### Step 2: Export Existing SQLite Data (Optional)

If you have existing SQLite data to migrate:

**Option A: Manual Export**
```bash
# Generate SQL dump from SQLite
sqlite3 backend-express/assettracker.db .dump > sqlite_data.sql
```

**Option B: Use Prisma Data**
```bash
# Create a backup script to export existing data
node scripts/export-data.js  # You'll need to create this
```

### Step 3: Update Connection String

Update `backend-express/.env` with your SQL Server connection string (see section above).

### Step 4: Generate New Prisma Client

```bash
cd backend-express
npm run prisma:generate
```

### Step 5: Create Migration

```bash
# Create initial migration for SQL Server
npx prisma migrate dev --name init_sqlserver

# OR for production (applies without prompts)
npx prisma migrate deploy
```

This will:
- Create migration files in `prisma/migrations/`
- Apply the schema to SQL Server
- Generate Prisma Client for SQL Server

### Step 6: Seed Database

```bash
npm run prisma:seed
```

This will populate the database with initial test data.

### Step 7: Verify Migration

```bash
# Open Prisma Studio to verify tables
npx prisma studio
```

Or query directly:

```sql
USE ITSAssetTracker;
GO

-- Check tables
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE';

-- Check record counts
SELECT 'Inventories' AS TableName, COUNT(*) AS Records FROM Inventories
UNION ALL
SELECT 'AuditHistory', COUNT(*) FROM AuditHistory
UNION ALL
SELECT 'NotificationConfig', COUNT(*) FROM NotificationConfig;
```

---

## Data Migration (SQLite to SQL Server)

If you need to migrate existing data:

### Option 1: Prisma Studio (Small Datasets)

1. Export data from SQLite using Prisma Studio
2. Switch connection string to SQL Server
3. Import data manually via Prisma Studio

### Option 2: Custom Migration Script

Create `backend-express/scripts/migrate-to-sqlserver.ts`:

```typescript
import { PrismaClient as SQLitePrismaClient } from '@prisma/client';
import { PrismaClient as SQLServerPrismaClient } from '@prisma/client';

async function migrate() {
  // Connect to SQLite
  const sqliteDb = new SQLitePrismaClient({
    datasources: {
      db: {
        url: 'file:./assettracker.db'
      }
    }
  });

  // Connect to SQL Server
  const sqlServerDb = new SQLServerPrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || ''
      }
    }
  });

  try {
    console.log('Starting migration...');

    // Migrate Inventory
    const inventory = await sqliteDb.inventory.findMany();
    for (const item of inventory) {
      await sqlServerDb.inventory.create({
        data: {
          itemNumber: item.itemNumber,
          assetType: item.assetType,
          description: item.description,
          category: item.category,
          cost: item.cost,
          minimumThreshold: item.minimumThreshold,
          reorderAmount: item.reorderAmount,
          currentQuantity: item.currentQuantity,
          lastModifiedBy: item.lastModifiedBy,
          lastModifiedDate: item.lastModifiedDate,
        }
      });
    }
    console.log(`Migrated ${inventory.length} inventory items`);

    // Migrate Audit History
    const audits = await sqliteDb.auditHistory.findMany();
    for (const audit of audits) {
      await sqlServerDb.auditHistory.create({
        data: {
          itemId: audit.itemId,
          previousQuantity: audit.previousQuantity,
          newQuantity: audit.newQuantity,
          changedBy: audit.changedBy,
          changeDate: audit.changeDate,
          serviceNowTicketUrl: audit.serviceNowTicketUrl,
        }
      });
    }
    console.log(`Migrated ${audits.length} audit records`);

    // Migrate Notification Config
    const configs = await sqliteDb.notificationConfig.findMany();
    for (const config of configs) {
      await sqlServerDb.notificationConfig.create({
        data: {
          adGroupName: config.adGroupName,
          additionalEmailRecipients: config.additionalEmailRecipients,
        }
      });
    }
    console.log(`Migrated ${configs.length} notification configs`);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sqliteDb.$disconnect();
    await sqlServerDb.$disconnect();
  }
}

migrate();
```

Run migration:
```bash
npx ts-node scripts/migrate-to-sqlserver.ts
```

### Option 3: SQL Server Import Wizard

1. Export SQLite to CSV using Prisma Studio or sqlite3
2. Use SQL Server Import/Export Wizard (SSMS)
3. Map columns and import data

---

## Performance Optimization

### 1. Add Indexes

Create indexes for frequently queried columns:

```sql
USE ITSAssetTracker;
GO

-- Index on itemNumber (most queries use this)
CREATE INDEX IX_Inventories_ItemNumber
ON Inventories(ItemNumber);

-- Index on assetType and category for filtering
CREATE INDEX IX_Inventories_AssetType_Category
ON Inventories(AssetType, Category);

-- Index on needsReorder (for low stock queries)
-- Note: Computed column approach
ALTER TABLE Inventories
ADD NeedsReorder AS CASE WHEN CurrentQuantity < MinimumThreshold THEN 1 ELSE 0 END;

CREATE INDEX IX_Inventories_NeedsReorder
ON Inventories(NeedsReorder);

-- Index for audit history queries
CREATE INDEX IX_AuditHistory_ItemId
ON AuditHistory(ItemId);

CREATE INDEX IX_AuditHistory_ChangeDate
ON AuditHistory(ChangeDate DESC);
```

### 2. Enable Query Store (SQL Server 2016+)

```sql
ALTER DATABASE ITSAssetTracker
SET QUERY_STORE = ON;
```

### 3. Regular Maintenance

Schedule regular maintenance:

```sql
-- Update statistics
UPDATE STATISTICS Inventories;
UPDATE STATISTICS AuditHistory;

-- Rebuild indexes (weekly)
ALTER INDEX ALL ON Inventories REBUILD;
ALTER INDEX ALL ON AuditHistory REBUILD;
```

---

## Testing Checklist

After migration, test the following:

### Functional Tests

- [ ] Application starts without errors
- [ ] Can view inventory list
- [ ] Can search and filter inventory
- [ ] Can assign assets (update quantity)
- [ ] Audit history is recorded
- [ ] Dashboard displays correct statistics
- [ ] CSV upload works
- [ ] Email notifications send (if configured)
- [ ] Configuration page saves settings

### Performance Tests

- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Large dataset queries perform well (1000+ records)
- [ ] Concurrent user testing (10+ users)

### SQL Server Specific

```bash
# Test connection
npx prisma db pull  # Should succeed

# Run migrations
npx prisma migrate deploy

# Test queries
npx prisma studio
```

---

## Troubleshooting

### Connection Issues

**Error: Login failed for user**
- Verify username/password
- Check SQL Server authentication mode (mixed mode enabled)
- Verify user permissions

**Error: Cannot connect to SQL Server**
- Check SQL Server service is running
- Verify TCP/IP is enabled in SQL Server Configuration Manager
- Check firewall rules (port 1433)
- Test with: `telnet servername 1433`

**Error: Certificate validation failed**
- Set `trustServerCertificate=true` in connection string (dev only)
- For production, install proper SSL certificate

### Migration Issues

**Error: Table already exists**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually drop tables
DROP TABLE AuditHistory;
DROP TABLE Inventories;
DROP TABLE NotificationConfig;
```

**Error: Migration failed**
- Check Prisma logs: `npx prisma migrate status`
- Verify SQL Server version compatibility
- Check database permissions

### Performance Issues

**Slow queries**
```sql
-- Check for missing indexes
SELECT * FROM sys.dm_db_missing_index_details;

-- View query execution plans
SET SHOWPLAN_TEXT ON;
GO
-- Run your query
```

**Connection pool exhausted**
- Increase `maxPoolSize` in connection string
- Check for connection leaks in code
- Monitor active connections:
```sql
SELECT
    DB_NAME(dbid) as DBName,
    COUNT(dbid) as NumberOfConnections
FROM sys.sysprocesses
WHERE dbid > 0
GROUP BY dbid;
```

---

## Rollback Plan

If migration fails:

### 1. Keep SQLite Database

Don't delete the SQLite database until SQL Server is fully tested:

```bash
# Backup SQLite database
cp backend-express/assettracker.db backend-express/assettracker.db.backup
```

### 2. Quick Rollback

Revert changes in `.env`:

```env
# Change back to SQLite
DATABASE_URL="file:./assettracker.db"
```

Revert `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Regenerate Prisma Client:

```bash
npm run prisma:generate
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] SQL Server database created and configured
- [ ] Database user created with appropriate permissions
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates installed (if not using trustServerCertificate)
- [ ] Connection string tested and verified
- [ ] Backup strategy implemented
- [ ] Monitoring alerts configured

### Deployment

- [ ] Update `.env` with production connection string
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify all tables created
- [ ] Seed initial data (if needed)
- [ ] Test application functionality
- [ ] Monitor error logs
- [ ] Check performance metrics

### Post-Deployment

- [ ] Verify all features working
- [ ] Check audit logs
- [ ] Monitor database size and growth
- [ ] Schedule regular backups
- [ ] Document connection details securely
- [ ] Train team on SQL Server maintenance

---

## Backup and Recovery

### Automated Backups (SQL Server)

```sql
-- Full backup (daily)
BACKUP DATABASE ITSAssetTracker
TO DISK = 'D:\Backups\ITSAssetTracker_Full.bak'
WITH FORMAT, COMPRESSION;

-- Differential backup (every 6 hours)
BACKUP DATABASE ITSAssetTracker
TO DISK = 'D:\Backups\ITSAssetTracker_Diff.bak'
WITH DIFFERENTIAL, COMPRESSION;

-- Transaction log backup (every hour)
BACKUP LOG ITSAssetTracker
TO DISK = 'D:\Backups\ITSAssetTracker_Log.bak'
WITH COMPRESSION;
```

### Azure SQL Automated Backups

Azure SQL Database provides automatic backups:
- Full backup: Weekly
- Differential backup: Every 12-24 hours
- Transaction log backup: Every 5-10 minutes
- Retention: 7-35 days (configurable)

### Restore Database

```sql
-- Restore from backup
USE master;
GO

RESTORE DATABASE ITSAssetTracker
FROM DISK = 'D:\Backups\ITSAssetTracker_Full.bak'
WITH REPLACE;
GO
```

---

## Security Best Practices

### 1. Connection Security

- Use encrypted connections (`encrypt=true`)
- Use strong passwords (16+ characters, mixed case, numbers, symbols)
- Don't commit connection strings to version control
- Use environment variables or Azure Key Vault
- Rotate passwords regularly

### 2. Database Security

```sql
-- Enable Transparent Data Encryption (TDE)
USE master;
GO
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'StrongPassword123!';
GO
CREATE CERTIFICATE TDECert WITH SUBJECT = 'TDE Certificate';
GO

USE ITSAssetTracker;
GO
CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE TDECert;
GO
ALTER DATABASE ITSAssetTracker SET ENCRYPTION ON;
GO
```

### 3. Audit Logging

```sql
-- Enable SQL Server Audit
CREATE SERVER AUDIT ITSAssetTrackerAudit
TO FILE (FILEPATH = 'D:\Audits\');
GO

CREATE DATABASE AUDIT SPECIFICATION ITSAssetTrackerDBAudit
FOR SERVER AUDIT ITSAssetTrackerAudit
ADD (SELECT, INSERT, UPDATE, DELETE ON DATABASE::ITSAssetTracker BY public);
GO

ALTER SERVER AUDIT ITSAssetTrackerAudit WITH (STATE = ON);
GO
```

---

## Additional Resources

### Documentation

- [Prisma SQL Server Connector](https://www.prisma.io/docs/concepts/database-connectors/sql-server)
- [SQL Server on Linux](https://docs.microsoft.com/en-us/sql/linux/)
- [Azure SQL Database Documentation](https://docs.microsoft.com/en-us/azure/azure-sql/)

### Tools

- [SQL Server Management Studio (SSMS)](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
- [Azure Data Studio](https://docs.microsoft.com/en-us/sql/azure-data-studio/)
- [Prisma Studio](https://www.prisma.io/studio)

### Support

- SQL Server: Microsoft Support
- Prisma: [GitHub Issues](https://github.com/prisma/prisma/issues)
- Azure SQL: Azure Support Portal

---

## Document Information

**Version**: 1.0
**Last Updated**: 2025-11-18
**Author**: ITS Development Team
**Review Cycle**: As needed

---

**End of Document**
