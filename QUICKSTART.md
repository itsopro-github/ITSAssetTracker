# Quick Start Guide

## Get Up and Running in 5 Minutes

### Prerequisites Check
- [ ] .NET 8 SDK installed (`dotnet --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Windows environment with Active Directory access
- [ ] SMTP server details handy

### Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd /Users/haroun/ITSAssetTracker/backend/ITSAssetTracker.API

# Restore packages (if using dotnet CLI)
dotnet restore

# Update database (creates SQLite file)
dotnet ef database update

# Run the backend
dotnet run
```

The API will start on `https://localhost:5001`

### Step 2: Frontend Setup (2 minutes)

Open a new terminal:

```bash
# Navigate to frontend
cd /Users/haroun/ITSAssetTracker/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:3000`

### Step 3: Initial Configuration (1 minute)

1. Open browser to `http://localhost:3000`
2. You'll be authenticated via Windows Authentication
3. Navigate to **Configuration** page
4. Set up email notification settings:
   - AD Group Name: `IT_Governance` (or your group)
   - Additional emails: any extra recipients

### Step 4: Test It Out

#### Upload Sample Data

1. Go to **CSV Upload** page
2. Click **Download CSV Template**
3. Add a few test items to the CSV
4. Upload the file
5. Check Dashboard for new inventory

#### Update Inventory

1. Go to **Inventory** page
2. Click **Update** on any item
3. Change quantity (positive to add, negative to remove)
4. Check **Dashboard** > **Recent Changes**

## Default Configuration

The application comes with sensible defaults:

### Backend (appsettings.json)
- **Database:** SQLite at `assettracker.db`
- **SMTP:** localhost:25 (update for production)
- **CORS:** Allows localhost:3000

### Required AD Groups
- **IT_ServiceDesk** - Full access
- **IT_ReadOnly** - View only

Create these groups in Active Directory and add test users.

## Common Issues

### "Cannot connect to database"
Run: `dotnet ef database update` in the backend directory

### "CORS error"
Check that frontend URL in `appsettings.json` matches your dev server

### "Authentication failed"
Ensure you're running on Windows with AD connectivity

### "Email not sending"
Update SMTP settings in `appsettings.json` with your server details

## Next Steps

1. **Customize AD Groups:** Update group names in code if needed
2. **Configure SMTP:** Set up real email server settings
3. **Add Sample Data:** Import your inventory via CSV
4. **Set Thresholds:** Configure minimum stock levels
5. **Test Alerts:** Drop inventory below threshold to test emails

## File Structure at a Glance

```
ITSAssetTracker/
├── backend/ITSAssetTracker.API/
│   ├── appsettings.json          ← Configure here
│   └── assettracker.db           ← Created after first run
│
└── frontend/
    ├── src/
    │   ├── pages/                ← Main UI pages
    │   └── services/api.ts       ← API client
    └── package.json
```

## Development Workflow

### Making Backend Changes
1. Edit C# code
2. `dotnet run` auto-reloads with `dotnet watch run`
3. Test via Swagger at `https://localhost:5001/swagger`

### Making Frontend Changes
1. Edit React/TypeScript code
2. Vite hot-reloads automatically
3. Changes appear instantly in browser

## Production Checklist

Before deploying to production:

- [ ] Update SMTP settings with production server
- [ ] Configure production database connection string
- [ ] Set up HTTPS with valid certificate
- [ ] Configure IIS with Windows Authentication
- [ ] Update CORS to allow production frontend URL
- [ ] Set appropriate AD group names
- [ ] Test email notifications end-to-end
- [ ] Review and set inventory thresholds
- [ ] Train users on CSV format and upload process

## Support

See the main [README.md](README.md) for detailed documentation.

For quick help:
- Check browser console for frontend errors
- Check terminal/console for backend errors
- Review `assettracker.db` to verify data persistence
