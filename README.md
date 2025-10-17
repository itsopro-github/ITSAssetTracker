# ITS Asset Tracker

A comprehensive web application for tracking IT hardware inventory with Windows Authentication, automated email alerts, and CSV bulk upload capabilities.

## Tech Stack

### Backend
- **Framework:** ASP.NET Core Web API (.NET 8)
- **Database:** SQLite with Entity Framework Core
- **Authentication:** Windows Authentication via Active Directory
- **Email:** SMTP integration for automated alerts

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Charts:** Recharts
- **HTTP Client:** Axios

## Features

### Core Functionality
- **Inventory Dashboard:** Real-time view of hardware assets with statistics and charts
- **Bulk CSV Upload:** Import/update inventory data via CSV files
- **Automated Alerts:** Email notifications when stock falls below thresholds
- **Audit Trail:** Complete history of all inventory changes
- **Role-Based Access:** Service Desk and Read-Only user roles
- **ServiceNow Integration:** Link inventory changes to ServiceNow tickets

### User Roles
- **IT_ServiceDesk:** Full access - upload CSV, update inventory, configure settings
- **IT_ReadOnly:** View-only access to dashboard and inventory

## Project Structure

```
ITSAssetTracker/
├── backend/
│   └── ITSAssetTracker.API/
│       ├── Controllers/        # API endpoints
│       ├── Models/            # Database entities and DTOs
│       ├── Services/          # Business logic
│       ├── Data/              # DbContext and migrations
│       ├── Middleware/        # Authorization attributes
│       ├── Program.cs         # Application entry point
│       └── appsettings.json   # Configuration
│
└── frontend/
    ├── src/
    │   ├── components/        # Reusable React components
    │   ├── pages/            # Page components
    │   ├── services/         # API client
    │   ├── types/            # TypeScript type definitions
    │   ├── App.tsx           # Main app component
    │   └── main.tsx          # Entry point
    ├── package.json
    └── vite.config.ts
```

## Prerequisites

### Backend Requirements
- .NET 8 SDK or later
- Windows Server with Active Directory (for production)
- SMTP server access for email notifications

### Frontend Requirements
- Node.js 18+ and npm

## Installation & Setup

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend/ITSAssetTracker.API
```

Install dependencies (if using dotnet CLI):
```bash
dotnet restore
```

Configure Active Directory groups in appsettings.json (or use environment-specific config):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=assettracker.db"
  },
  "Email": {
    "SmtpHost": "smtp.your-company.com",
    "SmtpPort": "587",
    "SmtpUsername": "your-smtp-user",
    "SmtpPassword": "your-smtp-password",
    "FromAddress": "noreply@company.com",
    "FromName": "ITS Asset Tracker",
    "EnableSsl": "true"
  },
  "AppSettings": {
    "BaseUrl": "http://localhost:3000",
    "FrontendUrl": "http://localhost:3000"
  }
}
```

Run database migrations:
```bash
dotnet ef database update
```

Start the backend server:
```bash
dotnet run
```

The API will be available at `https://localhost:5001` (or `http://localhost:5000`)

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Configuration

### Active Directory Groups

Create the following AD groups (or modify the group names in code):

1. **IT_ServiceDesk** - Users with full access
2. **IT_ReadOnly** - Users with read-only access

Add users to these groups using Active Directory Users and Computers.

### SMTP Email Settings

Update the `Email` section in `appsettings.json`:

- **SmtpHost:** Your SMTP server address
- **SmtpPort:** SMTP port (usually 587 for TLS, 25 for non-TLS)
- **SmtpUsername/Password:** SMTP credentials (if required)
- **FromAddress:** Email sender address
- **EnableSsl:** true/false for SSL/TLS encryption

### Notification Recipients

Configure email recipients through the web UI:
1. Log in as a Service Desk user
2. Navigate to Configuration page
3. Set the AD Group Name (e.g., IT_Governance)
4. Add additional email addresses (comma-separated)

## CSV Upload Format

Download the template from the CSV Upload page, or use this format:

```csv
Item Number,Hardware Description,Hardware Type,Cost,Minimum Threshold,Reorder Amount,Current Quantity,Audit User,Audit Date,ServiceNow Ticket URL
LAPTOP001,Dell Latitude 5520,Laptop,1200.00,5,20,10,john.doe,2024-01-15,https://servicenow.company.com/ticket/12345
MONITOR001,HP 24" Monitor,Monitor,250.00,10,30,8,jane.smith,2024-01-16,
```

### CSV Behavior
- **Existing items:** Updates quantity, thresholds, and other fields
- **New items:** Creates new inventory records
- **Audit trail:** Logs all changes with username and timestamp
- **Alerts:** Sends email if items fall below threshold

## API Endpoints

### Inventory
- `GET /api/inventory` - Get all inventory items with filters
- `GET /api/inventory/{id}` - Get specific item
- `GET /api/inventory/{id}/audit-history` - Get audit history for item
- `GET /api/inventory/types` - Get all hardware types
- `GET /api/inventory/dashboard-stats` - Get dashboard statistics
- `POST /api/inventory/update-quantity` - Update item quantity (Service Desk only)

### CSV Upload
- `POST /api/csvupload` - Upload and process CSV file (Service Desk only)
- `GET /api/csvupload/template` - Download CSV template

### Configuration
- `GET /api/configuration/notification` - Get notification settings
- `PUT /api/configuration/notification` - Update notification settings (Service Desk only)

### User
- `GET /api/user/me` - Get current user info and roles
- `GET /api/user/search?query={query}` - Search AD users

## Database Schema

### Inventory Table
- **Id:** Primary key
- **ItemNumber:** Unique identifier
- **HardwareDescription:** Item description
- **HardwareType:** Category/type
- **Cost:** Unit cost
- **MinimumThreshold:** Reorder threshold
- **ReorderAmount:** Recommended reorder quantity
- **CurrentQuantity:** Current stock level
- **LastModifiedBy:** Username who last modified
- **LastModifiedDate:** Last modification timestamp

### AuditHistory Table
- **Id:** Primary key
- **ItemId:** Foreign key to Inventory
- **PreviousQuantity:** Quantity before change
- **NewQuantity:** Quantity after change
- **ChangedBy:** Username who made change
- **ChangeDate:** Change timestamp
- **ServiceNowTicketUrl:** Related ServiceNow ticket (optional)

### NotificationConfig Table
- **Id:** Primary key
- **ADGroupName:** AD group to notify
- **AdditionalEmailRecipients:** Comma-separated email list

## Development

### Backend Development

Run in development mode:
```bash
cd backend/ITSAssetTracker.API
dotnet watch run
```

Run tests:
```bash
cd backend/ITSAssetTracker.Tests
dotnet test
```

### Frontend Development

Run development server with hot reload:
```bash
cd frontend
npm run dev
```

Build for production:
```bash
npm run build
```

Type checking:
```bash
npm run lint
```

## Production Deployment

### Backend Deployment

1. **Publish the application:**
```bash
dotnet publish -c Release -o ./publish
```

2. **Configure IIS:**
   - Install .NET 8 Hosting Bundle
   - Create new website in IIS
   - Point to published directory
   - Configure Application Pool to use No Managed Code
   - Enable Windows Authentication in IIS
   - Disable Anonymous Authentication

3. **Update appsettings.json** with production values

4. **Set up HTTPS** with valid SSL certificate

### Frontend Deployment

1. **Build production bundle:**
```bash
npm run build
```

2. **Deploy dist/ folder** to web server or CDN

3. **Configure reverse proxy** to API backend

### Environment Variables

For production, consider using environment variables instead of appsettings.json:

```bash
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection="Data Source=/var/app/assettracker.db"
Email__SmtpHost="smtp.company.com"
Email__SmtpPort="587"
# etc...
```

## Troubleshooting

### Windows Authentication Not Working

1. Ensure Windows Authentication is enabled in IIS
2. Check that users are in the correct AD groups
3. Verify domain connectivity
4. Check browser supports Windows Authentication (IE, Edge, Chrome with --auth-server-whitelist)

### Email Alerts Not Sending

1. Verify SMTP settings in appsettings.json
2. Check firewall allows outbound SMTP traffic
3. Test SMTP credentials manually
4. Check application logs for errors

### Database Errors

1. Ensure SQLite file has correct permissions
2. Run migrations: `dotnet ef database update`
3. Check connection string in appsettings.json

### CORS Errors

1. Verify frontend URL in appsettings.json matches actual URL
2. Check CORS policy in Program.cs
3. Ensure credentials are included in API requests

## Security Considerations

- **Windows Authentication:** Integrates with existing AD infrastructure
- **Role-Based Access:** Enforced at API level with AD group checks
- **Audit Trail:** All changes logged with username and timestamp
- **HTTPS Required:** Use HTTPS in production
- **SMTP Credentials:** Store securely (use environment variables or Key Vault)
- **SQL Injection:** Protected by EF Core parameterized queries
- **XSS Protection:** React escapes output by default

## Future Enhancements (Stretch Features)

- [ ] ServiceNow API integration for automated ticket creation
- [ ] Barcode scanning support
- [ ] Export inventory to Excel
- [ ] Multi-location inventory tracking
- [ ] Reservation/checkout system
- [ ] Mobile responsive improvements
- [ ] Advanced reporting and analytics
- [ ] Scheduled inventory reports via email

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Contact the development team

## License

Internal use only - [Your Company Name]

## Contributors

- Development Team: ITS Department
