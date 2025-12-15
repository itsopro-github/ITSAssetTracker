# Technical Architecture Document
## ITS Asset Tracker System

---

## Table of Contents
- [1. Executive Summary](#1-executive-summary)
- [2. System Overview](#2-system-overview)
- [3. Technology Stack](#3-technology-stack)
- [4. Architecture Patterns](#4-architecture-patterns)
- [5. Backend Architecture](#5-backend-architecture)
- [6. Frontend Architecture](#6-frontend-architecture)
- [7. Database Architecture](#7-database-architecture)
- [8. Security Architecture](#8-security-architecture)
- [9. API Specifications](#9-api-specifications)
- [10. Infrastructure & Deployment](#10-infrastructure--deployment)
- [11. Integration Points](#11-integration-points)
- [12. Development Workflow](#12-development-workflow)

---

## 1. Executive Summary

### 1.1 Purpose
The ITS Asset Tracker is a comprehensive web-based inventory management system designed for IT departments to track hardware and software assets, monitor stock levels, manage audit trails, and automate reorder notifications.

### 1.2 Key Features
- Real-time inventory tracking with low stock alerts
- Comprehensive audit logging with ServiceNow integration
- Role-based access control (Admin, Service Desk, Read-Only)
- CSV bulk import/export functionality
- Email notifications for low stock items
- Active Directory integration for authentication
- Dashboard with analytics and visualizations

### 1.3 Architecture Type
**Monorepo with Separate Frontend/Backend**
- Modern three-tier architecture
- RESTful API design
- Stateless backend services
- React-based SPA frontend

---

## 2. System Overview

### 2.1 High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │   React SPA (Vite)                                     │  │
│  │   - TypeScript                                         │  │
│  │   - React Router                                       │  │
│  │   - TanStack Query                                     │  │
│  │   - Recharts                                           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              │ (CORS, CSRF Protection)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     Application Layer                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │   Express.js Server (Node.js)                          │  │
│  │   ┌──────────────────────────────────────────────┐    │  │
│  │   │ Middleware Stack                             │    │  │
│  │   │ - Helmet (Security Headers)                  │    │  │
│  │   │ - CORS                                       │    │  │
│  │   │ - Rate Limiting                              │    │  │
│  │   │ - Authentication (AD/Demo)                   │    │  │
│  │   │ - Request Validation                         │    │  │
│  │   └──────────────────────────────────────────────┘    │  │
│  │   ┌──────────────────────────────────────────────┐    │  │
│  │   │ Controllers                                  │    │  │
│  │   │ - Inventory | User | CSV | Configuration    │    │  │
│  │   └──────────────────────────────────────────────┘    │  │
│  │   ┌──────────────────────────────────────────────┐    │  │
│  │   │ Services                                     │    │  │
│  │   │ - Email | CSV Processing | Active Directory │    │  │
│  │   └──────────────────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                       Data Layer                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │   SQLite Database (Development)                        │  │
│  │   SQL Server (Production)                              │  │
│  │   ┌──────────────────────────────────────────────┐    │  │
│  │   │ Tables                                       │    │  │
│  │   │ - Inventories                                │    │  │
│  │   │ - AuditHistories                             │    │  │
│  │   │ - NotificationConfigs                        │    │  │
│  │   └──────────────────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   External Integrations                       │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   SMTP   │  │    Active    │  │    ServiceNow        │   │
│  │  Server  │  │   Directory  │  │   (via URL links)    │   │
│  └──────────┘  └──────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Component Interaction Flow

```
User Action → React Component → API Service (Axios)
     ↓
API Endpoint → Auth Middleware → Rate Limiter → Validation
     ↓
Controller → Service Layer → Prisma ORM
     ↓
Database ← → External Services (Email, AD)
     ↓
Response ← ← ← ← ← ← ← ← ← ← ← ← ←
```

---

## 3. Technology Stack

### 3.1 Frontend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 18.2.0 | UI component library |
| **Language** | TypeScript | 5.3.0 | Type-safe JavaScript |
| **Build Tool** | Vite | 5.0.0 | Fast development server & bundler |
| **Routing** | React Router | 6.20.0 | Client-side routing |
| **State Management** | TanStack Query | 5.0.0 | Server state management & caching |
| **HTTP Client** | Axios | 1.6.0 | API communication |
| **Charts** | Recharts | 2.10.0 | Data visualization |
| **Styling** | CSS Modules | Built-in | Component-scoped styles |

### 3.2 Backend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | Latest LTS | JavaScript runtime |
| **Framework** | Express.js | 4.19.2 | Web application framework |
| **Language** | TypeScript | 5.6.2 | Type-safe JavaScript |
| **ORM** | Prisma | 5.20.0 | Database access layer |
| **Database** | SQLite/SQL Server | - | Data persistence |
| **Dev Runtime** | tsx | 4.19.1 | TypeScript execution with hot reload |
| **Email** | Nodemailer | 6.9.15 | Email delivery |
| **File Upload** | Multer | 1.4.5 | Multipart form data handling |
| **CSV Parsing** | csv-parse | 5.5.6 | CSV file processing |
| **Validation** | express-validator | 7.2.0 | Request validation |

### 3.3 Security Technologies

| Technology | Purpose |
|-----------|---------|
| **Helmet** | Security headers (CSP, HSTS, X-Frame-Options) |
| **CORS** | Cross-Origin Resource Sharing control |
| **express-rate-limit** | DDoS protection & rate limiting |
| **express-validator** | Input sanitization & validation |

### 3.4 Development Tools

| Tool | Purpose |
|------|---------|
| **Git** | Version control |
| **npm** | Package management |
| **Prisma Studio** | Database GUI |
| **VS Code** | Recommended IDE |

---

## 4. Architecture Patterns

### 4.1 Design Patterns

#### 4.1.1 Backend Patterns
- **MVC (Model-View-Controller)**: Separation of concerns
- **Service Layer Pattern**: Business logic encapsulation
- **Repository Pattern**: Data access abstraction (via Prisma)
- **Dependency Injection**: Loose coupling between components
- **Middleware Chain**: Request processing pipeline
- **Singleton**: Service instances (Email, AD services)

#### 4.1.2 Frontend Patterns
- **Component-Based Architecture**: Reusable UI components
- **Container/Presenter Pattern**: Smart vs. presentational components
- **Custom Hooks**: Reusable stateful logic
- **Error Boundary Pattern**: Graceful error handling
- **Server State Management**: TanStack Query for API data

### 4.2 Architectural Principles

1. **Separation of Concerns**: Clear boundaries between layers
2. **Single Responsibility**: Each module has one job
3. **DRY (Don't Repeat Yourself)**: Shared utilities and services
4. **SOLID Principles**: Object-oriented design
5. **Fail-Safe Defaults**: Secure by default configuration
6. **Defense in Depth**: Multiple security layers

---

## 5. Backend Architecture

### 5.1 Directory Structure

```
backend-express/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── seed.ts                # Database seeding script
├── src/
│   ├── config/
│   │   ├── index.ts           # Configuration aggregator
│   │   └── prisma.ts          # Prisma client singleton
│   ├── controllers/
│   │   ├── inventory.controller.ts
│   │   ├── user.controller.ts
│   │   ├── configuration.controller.ts
│   │   └── csvUpload.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts        # Authentication logic
│   │   └── auth.middleware.secure.ts # Production auth
│   ├── routes/
│   │   ├── inventory.routes.ts
│   │   ├── user.routes.ts
│   │   ├── configuration.routes.ts
│   │   └── csvUpload.routes.ts
│   ├── services/
│   │   ├── activeDirectory.service.ts
│   │   ├── email.service.ts
│   │   └── csvProcessing.service.ts
│   ├── utils/
│   │   ├── security-checks.ts        # Production security validation
│   │   ├── csv-sanitizer.ts          # CSV input sanitization
│   │   └── url-validator.ts          # ServiceNow URL validation
│   ├── validation/
│   │   └── inventory.schema.ts       # Request validation schemas
│   ├── server.ts                      # Application entry point
│   └── server.secure.ts               # Production server configuration
├── .env                               # Environment variables
├── package.json
└── tsconfig.json
```

### 5.2 Middleware Stack

The Express middleware pipeline processes requests in the following order:

```javascript
1. Helmet                    // Security headers
2. CORS                      // Cross-origin requests
3. Rate Limiting             // DDoS protection
4. Body Parsers              // JSON/URL-encoded parsing
5. Authentication            // User identity verification
6. Route Handlers            // Business logic
7. Error Handler             // Centralized error handling
```

### 5.3 Controller Layer

#### Responsibilities:
- HTTP request/response handling
- Input validation
- Calling service layer methods
- Error handling and response formatting

#### Key Controllers:

**InventoryController** (`inventory.controller.ts`):
- `getAll()`: Retrieve all inventory items with filtering
- `getById()`: Get single item by ID
- `getAllAuditHistory()`: Retrieve audit logs
- `getAuditHistoryByItemId()`: Get item-specific audit trail
- `getTypes()`: Get unique hardware types
- `getAssetTypes()`: Get asset type enumeration
- `getLowStockCount()`: Count items below threshold
- `getDashboardStats()`: Aggregate statistics
- `updateQuantity()`: Update item quantity (Service Desk)
- `updateItem()`: Update item details (Service Desk)
- `deleteItem()`: Delete inventory item (Admin only)

**UserController** (`user.controller.ts`):
- `getCurrentUser()`: Get authenticated user info
- `searchUsers()`: Search AD users

**ConfigurationController** (`configuration.controller.ts`):
- `getNotificationConfig()`: Retrieve email notification settings
- `updateNotificationConfig()`: Update notification recipients

**CsvUploadController** (`csvUpload.controller.ts`):
- `uploadCsv()`: Bulk import inventory data
- `downloadTemplate()`: Export CSV template

### 5.4 Service Layer

#### ActiveDirectoryService (`activeDirectory.service.ts`)
```typescript
interface IActiveDirectoryService {
  isUserInGroup(username: string, groupName: string): boolean;
  getEmailAddressesForGroup(groupName: string): Promise<string[]>;
}
```

**Features:**
- Group membership verification
- Email address retrieval for notification groups
- LDAP integration (when enabled)

#### EmailService (`email.service.ts`)
```typescript
interface IEmailService {
  sendLowStockAlert(item: Inventory, appBaseUrl: string): Promise<void>;
  sendLowStockAlerts(items: Inventory[], appBaseUrl: string): Promise<void>;
}
```

**Features:**
- SMTP integration via Nodemailer
- HTML email templates
- Configurable recipients (AD groups + manual addresses)
- Batch and single-item alerts

#### CsvProcessingService (`csvProcessing.service.ts`)
```typescript
interface ICsvProcessingService {
  processInventoryCsv(fileBuffer: Buffer, username: string): Promise<CsvUploadResult>;
}
```

**Features:**
- CSV parsing and validation
- Input sanitization
- Bulk insert/update operations
- Error reporting

### 5.5 Authentication & Authorization

#### Authentication Flow

```
Request → authenticateUser middleware
    │
    ├─ DEMO_MODE=true → Grant admin access
    │
    ├─ Development → Check X-Username header
    │                 └─ Validate format → Set req.user
    │
    └─ Production → Check Windows Auth headers
                    └─ Verify AD groups → Set req.user
```

#### Authorization Levels

| Role | Permissions | Middleware |
|------|-------------|-----------|
| **Read-Only** | View inventory, audit logs | `authenticateUser` |
| **Service Desk** | All read-only + update quantities, modify items | `requireServiceDesk` |
| **Admin** | All Service Desk + delete items, configure system | `requireAdmin` |

#### Security Features:
- Fail-safe defaults (production requires AD)
- Input validation (username format checking)
- Audit logging for all authentication attempts
- DEMO_MODE for development/testing only

### 5.6 Configuration Management

Environment variables are loaded from `.env`:

```bash
# Server
PORT=5002
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DEMO_MODE=true

# Database
DATABASE_URL="file:./assettracker.db"

# Email
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_ADDRESS=noreply@company.com

# Active Directory
AD_ENABLED=false
AD_DOMAIN=company.local
AD_LDAP_SERVER=ldap://dc.company.local:389
AD_ADMIN_GROUP=ITS-AssetTracker-Admins
AD_SERVICE_DESK_GROUP=ITS-ServiceDesk
AD_READ_ONLY_GROUP=ITS-AssetTracker-ReadOnly
```

---

## 6. Frontend Architecture

### 6.1 Directory Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ErrorBoundary.tsx      # Global error handler
│   ├── pages/
│   │   ├── Dashboard.tsx          # Analytics & metrics
│   │   ├── InventoryList.tsx      # Main inventory view
│   │   ├── AuditLog.tsx           # Change history
│   │   ├── AdminPanel.tsx         # Bulk operations
│   │   └── Configuration.tsx      # System settings
│   ├── services/
│   │   ├── api.ts                 # API client & endpoints
│   │   └── mockData.ts            # Development fixtures
│   ├── types/
│   │   └── index.ts               # TypeScript type definitions
│   ├── App.tsx                    # Root component
│   ├── main.tsx                   # Application entry point
│   └── index.css                  # Global styles
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json
```

### 6.2 Routing Structure

```typescript
/ (Dashboard)
├── /inventory (InventoryList)
├── /audit-log (AuditLog)
├── /admin (AdminPanel) [Admin Only]
└── /configuration (Configuration) [Admin Only]
```

### 6.3 State Management Strategy

#### 6.3.1 Server State (TanStack Query)
```typescript
// Query Keys
['currentUser']              // User profile
['inventory', filters]       // Inventory items with filters
['auditHistory', params]     // Audit log entries
['dashboardStats']           // Dashboard metrics
['notificationConfig']       // Email notification settings
```

**Features:**
- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication
- Infinite queries support

#### 6.3.2 Local State (React Hooks)
- Form inputs: `useState`
- UI state: Modal visibility, selected items
- Filter state: Search, sorting, pagination
- Derived state: Computed values from server data

### 6.4 API Service Layer

#### Axios Instance Configuration
```typescript
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Username': 'admin', // Development only
  },
});
```

#### API Modules

**inventoryApi**:
- `getAll(filters)`: Filtered inventory retrieval
- `getById(id)`: Single item lookup
- `getAllAuditHistory(params)`: Audit log query
- `getAuditHistory(id)`: Item-specific audit trail
- `getHardwareTypes()`: Type enumeration
- `getLowStockCount()`: Low stock count
- `updateQuantity(dto)`: Quantity adjustment
- `updateItem(id, item)`: Full item update
- `getDashboardStats()`: Dashboard data
- `deleteItem(id)`: Item deletion

**csvApi**:
- `upload(file)`: Bulk CSV import
- `downloadTemplate()`: Template download

**configApi**:
- `getNotificationConfig()`: Retrieve settings
- `updateNotificationConfig(config)`: Update settings

**userApi**:
- `getCurrentUser()`: User profile
- `searchUsers(query)`: AD user search

### 6.5 Component Architecture

#### 6.5.1 Page Components

**Dashboard.tsx**
- Displays key metrics (total items, low stock, total value)
- Category-based tile views with trends
- Recent changes feed
- Inventory quantity trends chart
- Software license summary

**InventoryList.tsx**
- Searchable, sortable, filterable table
- Inline editing capabilities
- Quantity adjustment form
- ServiceNow ticket URL integration
- Export functionality
- Responsive design

**AuditLog.tsx**
- Comprehensive change history
- Search and filtering
- ServiceNow ticket links
- Deleted item records

**AdminPanel.tsx**
- CSV upload interface
- Bulk operations
- Data validation
- Error reporting

**Configuration.tsx**
- Email notification settings
- AD group configuration
- Additional recipients management

### 6.6 Key UI Features

#### 6.6.1 Filtering & Search
- Full-text search across item numbers, descriptions
- Asset type filtering (Hardware/Software)
- Category filtering
- Hardware type filtering
- Low stock filtering
- Combined filter logic (AND conditions)

#### 6.6.2 Data Visualization
- Recharts line charts for inventory trends
- Category tiles with color-coded status
- Trend indicators (up/down arrows)
- Visual low-stock warnings

#### 6.6.3 Form Validation
- Required field validation
- Numeric range validation
- URL format validation (ServiceNow)
- Real-time error messages

---

## 7. Database Architecture

### 7.1 Database Schema

#### 7.1.1 Inventory Table

```prisma
model Inventory {
  id                  Int            @id @default(autoincrement())
  itemNumber          String         @unique
  assetType           String         // "Hardware" | "Software"
  description         String
  category            String?
  cost                Float
  minimumThreshold    Int
  reorderAmount       Int
  currentQuantity     Int
  lastModifiedBy      String
  lastModifiedDate    DateTime       @default(now())
  hardwareDescription String?
  hardwareType        String?
  auditHistories      AuditHistory[]
}
```

**Purpose**: Core inventory tracking
**Key Indexes**: `itemNumber` (unique)
**Relationships**: One-to-many with AuditHistory

#### 7.1.2 AuditHistory Table

```prisma
model AuditHistory {
  id                 Int        @id @default(autoincrement())
  itemId             Int?       // Nullable for deleted items
  itemNumber         String?
  itemDescription    String?
  previousQuantity   Int
  newQuantity        Int
  changedBy          String
  changeDate         DateTime   @default(now())
  serviceNowTicketUrl String?
  item               Inventory? @relation(fields: [itemId], references: [id], onDelete: SetNull)
}
```

**Purpose**: Complete change audit trail
**Key Features**:
- Preserves item details even after deletion
- ServiceNow integration
- Automatic timestamps

#### 7.1.3 NotificationConfig Table

```prisma
model NotificationConfig {
  id                        Int     @id @default(autoincrement())
  adGroupName               String
  additionalEmailRecipients String?
}
```

**Purpose**: Email notification configuration
**Features**: AD group + manual email lists

### 7.2 Data Relationships

```
Inventory (1) ─────── (Many) AuditHistory
    ↓
  itemId references Inventory.id
  onDelete: SetNull (preserve audit trail)
```

### 7.3 Database Migrations

#### Migration Strategy
- Prisma Migrate for schema versioning
- Development: SQLite for simplicity
- Production: SQL Server for enterprise scalability

#### Migration Commands
```bash
npx prisma migrate dev      # Create & apply migration
npx prisma migrate deploy   # Production deployment
npx prisma generate         # Regenerate client
```

### 7.4 Data Integrity

**Constraints**:
- Unique item numbers
- Non-null required fields
- Foreign key constraints
- Cascade delete prevention (audit trail preservation)

**Validation**:
- Application-level validation before database writes
- Prisma schema validation
- Database-level constraints

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌─────────────────────────────────────────────┐
│  Layer 1: Network Security                  │
│  - HTTPS enforcement                        │
│  - CORS policy                              │
│  - Rate limiting                            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 2: Application Security              │
│  - Helmet security headers                  │
│  - CSP, HSTS, X-Frame-Options              │
│  - XSS protection                           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 3: Authentication                    │
│  - Windows Authentication (production)      │
│  - Active Directory integration             │
│  - Header-based auth (development)          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 4: Authorization                     │
│  - Role-based access control                │
│  - AD group membership                      │
│  - Route-level protection                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 5: Data Security                     │
│  - Input validation & sanitization          │
│  - SQL injection prevention (Prisma)        │
│  - Audit logging                            │
└─────────────────────────────────────────────┘
```

### 8.2 Security Headers (Helmet)

```javascript
Content-Security-Policy:
  - default-src 'self'
  - script-src 'self'
  - style-src 'self' 'unsafe-inline'
  - img-src 'self' data: https:
  - connect-src 'self'
  - frame-ancestors 'none'

Strict-Transport-Security:
  - max-age=31536000
  - includeSubDomains
  - preload

X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### 8.3 Rate Limiting

| Endpoint Pattern | Window | Max Requests |
|-----------------|--------|--------------|
| `/api/*` | 15 minutes | 100 (prod) / 1000 (dev) |
| `/api/csvupload` | 1 hour | 10 (prod) / 100 (dev) |

### 8.4 Input Validation

#### CSV Upload Security
```typescript
// CSV Sanitizer removes:
- Special characters (< > " ' ; &)
- SQL injection patterns
- XSS payloads
- Command injection attempts
```

#### ServiceNow URL Validation
```typescript
// Only allow whitelisted domains:
- servicenow.company.com
- company.service-now.com
- Must use HTTPS protocol
```

#### Inventory Update Validation
```typescript
// Whitelisted fields only:
- itemNumber, assetType, description
- category, cost, minimumThreshold
- reorderAmount, currentQuantity
- hardwareDescription, hardwareType
```

### 8.5 Production Security Checks

**Startup Validation** (`security-checks.ts`):
```typescript
validateProductionSecurity() {
  ✓ AD_ENABLED must be true
  ✓ DEMO_MODE must be false
  ✓ NODE_ENV must be 'production'
  ✓ ALLOWED_ORIGINS must be configured
  ✓ SMTP credentials must be set
  ✗ Fail to start if any check fails
}
```

### 8.6 Audit Trail

**All changes logged**:
- Who: User who made the change
- What: Item details (preserved even after deletion)
- When: Timestamp
- Previous/New values
- Associated ServiceNow ticket

---

## 9. API Specifications

### 9.1 API Endpoints

#### Inventory Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/inventory` | All | Get all inventory items (with filters) |
| GET | `/api/inventory/:id` | All | Get single item by ID |
| GET | `/api/inventory/types` | All | Get unique hardware types |
| GET | `/api/inventory/asset-types` | All | Get asset types (Hardware/Software) |
| GET | `/api/inventory/low-stock-count` | All | Count items below threshold |
| GET | `/api/inventory/dashboard-stats` | All | Get dashboard statistics |
| GET | `/api/inventory/audit-history` | All | Get all audit history |
| GET | `/api/inventory/:id/audit-history` | All | Get item audit history |
| POST | `/api/inventory/update-quantity` | ServiceDesk+ | Update item quantity |
| PUT | `/api/inventory/:id` | ServiceDesk+ | Update item details |
| DELETE | `/api/inventory/:id` | Admin | Delete inventory item |

#### CSV Upload Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/csvupload` | ServiceDesk+ | Upload CSV file |
| GET | `/api/csvupload/template` | All | Download CSV template |

#### Configuration Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/configuration/notification` | Admin | Get notification config |
| PUT | `/api/configuration/notification` | Admin | Update notification config |

#### User Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/me` | All | Get current user info |
| GET | `/api/user/search` | ServiceDesk+ | Search AD users |

### 9.2 Request/Response Examples

#### GET `/api/inventory`

**Query Parameters**:
```
?search=laptop
&assetType=Hardware
&category=Computers
&hardwareType=Laptop
&needsReorder=true
&sortBy=itemNumber
&sortDesc=false
```

**Response**:
```json
[
  {
    "id": 1,
    "itemNumber": "LAPTOP-001",
    "assetType": "Hardware",
    "description": "Dell Latitude 7420",
    "category": "Computers",
    "cost": 1200.00,
    "minimumThreshold": 10,
    "reorderAmount": 20,
    "currentQuantity": 5,
    "lastModifiedBy": "admin",
    "lastModifiedDate": "2025-11-24T10:00:00Z",
    "hardwareDescription": "14-inch business laptop",
    "hardwareType": "Laptop",
    "needsReorder": true
  }
]
```

#### POST `/api/inventory/update-quantity`

**Request**:
```json
{
  "itemNumber": "LAPTOP-001",
  "quantityChange": -2,
  "serviceNowTicketUrl": "https://servicenow.company.com/ticket/123",
  "assignedToUser": "john.doe"
}
```

**Response**:
```json
{
  "id": 1,
  "itemNumber": "LAPTOP-001",
  "currentQuantity": 3,
  "needsReorder": true,
  ...
}
```

#### POST `/api/csvupload`

**Request**:
- Content-Type: multipart/form-data
- Field: `file` (CSV file)

**Response**:
```json
{
  "success": true,
  "processedCount": 100,
  "createdCount": 50,
  "updatedCount": 50,
  "errorCount": 0,
  "errors": []
}
```

### 9.3 Error Responses

**Standard Error Format**:
```json
{
  "error": "Error message",
  "details": ["Validation error 1", "Validation error 2"]
}
```

**HTTP Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## 10. Infrastructure & Deployment

### 10.1 Development Environment

#### Prerequisites
- Node.js 18+ LTS
- npm 9+
- Git

#### Setup Commands
```bash
# Clone repository
git clone <repo-url>

# Backend setup
cd backend-express
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend setup (separate terminal)
cd frontend
npm install
npm run dev
```

#### Development URLs
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5002`
- Prisma Studio: `npx prisma studio`

### 10.2 Production Deployment

#### Environment Configuration

**Production .env**:
```bash
NODE_ENV=production
DEMO_MODE=false
PORT=80
FRONTEND_URL=https://assets.company.com
BASE_URL=https://assets.company.com

DATABASE_URL="sqlserver://server:1433;database=AssetTracker;..."

AD_ENABLED=true
AD_DOMAIN=company.local
AD_LDAP_SERVER=ldaps://dc.company.local:636
AD_USE_SSL=true
AD_BIND_USERNAME=sa-assettracker
AD_BIND_PASSWORD=***

SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USERNAME=sa-assettracker@company.com
SMTP_PASSWORD=***
SMTP_ENABLE_SSL=true

ALLOWED_ORIGINS=https://assets.company.com
```

#### Build Process

**Backend**:
```bash
npm run build         # Compile TypeScript
npm start            # Run production server
```

**Frontend**:
```bash
npm run build        # Build production bundle
npm run preview      # Preview production build
```

#### Deployment Architecture

```
┌─────────────────────────────────────────────┐
│        IIS / Windows Server                  │
│  ┌───────────────────────────────────────┐  │
│  │  Frontend (Static Files)              │  │
│  │  - React production build             │  │
│  │  - Served via IIS                     │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │  Backend (Node.js)                    │  │
│  │  - Express server via IISNode         │  │
│  │  - Windows Authentication enabled     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│        SQL Server Database                   │
│  - Production data                           │
│  - Automated backups                         │
│  - Transaction logs                          │
└─────────────────────────────────────────────┘
```

### 10.3 Database Migration

**SQLite to SQL Server**:
1. Update `DATABASE_URL` in `.env`
2. Run `npx prisma migrate deploy`
3. Verify schema with `npx prisma studio`
4. Test connections

### 10.4 Monitoring & Logging

**Application Logs**:
- Console output captured by PM2/IISNode
- Structured logging format
- Error tracking with stack traces

**Audit Logs**:
- All database changes logged to AuditHistory table
- User actions tracked
- ServiceNow ticket references

**Health Checks**:
- Endpoint: `GET /health`
- Response: `{ status: 'ok', timestamp: '...' }`

---

## 11. Integration Points

### 11.1 Active Directory Integration

**Purpose**: Authentication & group-based authorization

**LDAP Configuration**:
```javascript
Server: ldap://dc.company.local:389
Base DN: DC=company,DC=local
Bind User: sa-assettracker
Groups:
  - ITS-AssetTracker-Admins
  - ITS-ServiceDesk
  - ITS-AssetTracker-ReadOnly
```

**Operations**:
- User authentication
- Group membership queries
- Email address retrieval

### 11.2 SMTP Email Integration

**Purpose**: Low stock notifications

**Configuration**:
```javascript
Host: smtp.company.com
Port: 587 (STARTTLS) / 465 (SSL)
Authentication: Username/Password
From: noreply@company.com
```

**Email Types**:
- Single item low stock alerts
- Batch low stock reports
- HTML formatted templates

### 11.3 ServiceNow Integration

**Purpose**: Asset management ticket tracking

**Integration Method**: URL references in audit logs

**Validated Domains**:
- `servicenow.company.com`
- `company.service-now.com`

**Features**:
- Hyperlinked ticket URLs in audit history
- URL validation for security
- Optional ticket association with quantity changes

---

## 12. Development Workflow

### 12.1 Version Control

**Branching Strategy**:
```
main                    # Production-ready code
├── develop             # Integration branch
├── feature/*           # New features
├── bugfix/*            # Bug fixes
└── hotfix/*            # Critical production fixes
```

### 12.2 Code Standards

**TypeScript**:
- Strict mode enabled
- Explicit return types
- Interface-based contracts

**Naming Conventions**:
- camelCase: variables, functions
- PascalCase: classes, interfaces, types, components
- UPPER_SNAKE_CASE: constants

**File Organization**:
- One component per file
- Co-locate related files
- Index files for public exports

### 12.3 Testing Strategy

**Recommended Testing**:
- Unit tests: Controllers, services, utilities
- Integration tests: API endpoints
- E2E tests: Critical user flows
- Manual QA: UI/UX validation

**Test Frameworks** (to be implemented):
- Backend: Jest, Supertest
- Frontend: Vitest, React Testing Library

### 12.4 Database Seeding

**Development Data**:
```bash
npx prisma db seed
```

**Seed Script** (`prisma/seed.ts`):
- Sample inventory items
- Audit history records
- Default notification config

### 12.5 Hot Reload Development

**Backend**:
```bash
npm run dev        # tsx watch mode
```

**Frontend**:
```bash
npm run dev        # Vite HMR
```

**Database**:
```bash
npx prisma studio  # GUI database browser
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Asset Type** | Classification as Hardware or Software |
| **Audit History** | Record of all inventory changes |
| **CSP** | Content Security Policy |
| **CORS** | Cross-Origin Resource Sharing |
| **HSTS** | HTTP Strict Transport Security |
| **IISNode** | Node.js hosting on IIS |
| **Minimum Threshold** | Stock level that triggers low stock alert |
| **ORM** | Object-Relational Mapping |
| **Prisma** | TypeScript ORM for database access |
| **Reorder Amount** | Suggested quantity to order when stock is low |
| **ServiceNow** | IT service management platform |
| **SPA** | Single Page Application |
| **TanStack Query** | React library for server state management |

---

## Appendix B: Configuration Reference

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `FRONTEND_URL` | No | http://localhost:3000 | CORS origin |
| `DEMO_MODE` | No | false | Bypass authentication |
| `DATABASE_URL` | Yes | - | Database connection string |
| `SMTP_HOST` | No | - | Email server |
| `SMTP_PORT` | No | 587 | Email port |
| `SMTP_USERNAME` | No | - | Email auth username |
| `SMTP_PASSWORD` | No | - | Email auth password |
| `AD_ENABLED` | No | false | Enable Active Directory |
| `AD_DOMAIN` | No | - | AD domain |
| `AD_LDAP_SERVER` | No | - | LDAP server URL |
| `AD_ADMIN_GROUP` | No | - | Admin group name |
| `AD_SERVICE_DESK_GROUP` | No | - | Service desk group name |
| `AD_READ_ONLY_GROUP` | No | - | Read-only group name |

### Frontend Configuration

**vite.config.ts**:
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5002',
      changeOrigin: true,
    }
  }
}
```

---

## Appendix C: Troubleshooting

### Common Issues

**Issue**: Backend won't start
- **Solution**: Check `DATABASE_URL`, run `npx prisma generate`

**Issue**: CORS errors
- **Solution**: Verify `FRONTEND_URL` matches frontend dev server

**Issue**: Authentication fails
- **Solution**: Ensure `DEMO_MODE=true` for development or set `X-Username` header

**Issue**: Email not sending
- **Solution**: Verify SMTP credentials, check firewall rules

**Issue**: CSV upload fails
- **Solution**: Check file format matches template, review validation errors

---

## Document Information

**Version**: 1.0
**Last Updated**: November 24, 2025
**Author**: ITS Development Team
**Classification**: Internal Technical Documentation

---

## Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-24 | Initial architecture document | Claude Code |

---

*End of Document*
