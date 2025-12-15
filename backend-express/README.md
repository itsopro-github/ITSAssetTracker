# ITS Asset Tracker - Express.js Backend

Express.js/TypeScript backend for the ITS Asset Tracker application.

## Features

- RESTful API with Express.js and TypeScript
- SQLite database with Prisma ORM
- Active Directory integration (mock for development)
- Email notifications for low stock alerts
- CSV upload and processing
- Comprehensive audit trail
- Role-based access control

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** SQLite
- **ORM:** Prisma
- **File Upload:** Multer
- **CSV Processing:** csv-parse
- **Email:** Nodemailer

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env` and configure as needed
   - The default configuration is set for development

3. Initialize the database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

### Development

Start the development server with hot reload:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### Production

Build and run the production server:
```bash
npm run build
npm start
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed the database with initial data
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## API Endpoints

### Inventory
- `GET /api/inventory` - Get all inventory items (with filtering, sorting)
- `GET /api/inventory/:id` - Get single inventory item
- `GET /api/inventory/types` - Get all hardware types/categories
- `GET /api/inventory/asset-types` - Get all asset types
- `GET /api/inventory/low-stock-count` - Get count of low stock items
- `GET /api/inventory/dashboard-stats` - Get dashboard statistics
- `GET /api/inventory/audit-history` - Get all audit history
- `GET /api/inventory/:id/audit-history` - Get audit history for specific item
- `POST /api/inventory/update-quantity` - Update inventory quantity (ServiceDesk/Admin)
- `PUT /api/inventory/:id` - Update inventory item (ServiceDesk/Admin)

### User
- `GET /api/user/me` - Get current user info
- `GET /api/user/search` - Search users in AD

### Configuration
- `GET /api/configuration/notification` - Get notification config
- `PUT /api/configuration/notification` - Update notification config (ServiceDesk/Admin)

### CSV Upload
- `POST /api/csvupload` - Upload and process CSV file (ServiceDesk/Admin)
- `GET /api/csvupload/template` - Download CSV template

## Authentication

For development, the backend uses a mock authentication system. Set the username via the `X-Username` header (defaults to "admin").

Mock user roles:
- **Admin users:** admin, john.doe
- **ServiceDesk users:** admin, john.doe, jane.smith
- **ReadOnly users:** everyone else

In production, this would be replaced with Windows Authentication/Active Directory integration.

## Database Schema

### Inventory
- Item tracking with asset type, description, category
- Cost, quantity, threshold, and reorder information
- Audit trail integration

### AuditHistory
- Complete change history for all inventory updates
- Links to ServiceNow tickets
- User tracking

### NotificationConfig
- Email notification settings
- AD group configuration
- Additional email recipients

## Environment Variables

See `.env` for all available configuration options:
- Server configuration (PORT, NODE_ENV)
- Database URL
- Email/SMTP settings
- Active Directory settings
- Application URLs

## Development Notes

- Active Directory integration is mocked for development
- Email service requires SMTP configuration
- SQLite database file is created in the project root
- All routes require authentication
- ServiceDesk/Admin routes have additional authorization checks

## Migration from ASP.NET Core

This Express.js backend is a complete port of the original ASP.NET Core backend with full feature parity:
- All endpoints match the original API
- Same database schema (compatible with existing data)
- Same authentication and authorization logic
- Same business logic for inventory management, CSV processing, and email notifications
