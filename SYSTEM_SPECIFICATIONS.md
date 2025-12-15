# ITS Asset Tracker - System Specifications

[[_TOC_]]

---

## 1. System Overview

### 1.1 Purpose
The ITS Asset Tracker is a web-based application for managing IT hardware and software inventory. It provides real-time tracking, automated low-stock alerts, complete audit trails, and role-based access control.

### 1.2 Scope
- Real-time inventory tracking and management
- Active Directory authentication and authorization
- Role-based access control (Admin, Service Desk, Read-Only)
- Bulk data import via CSV upload
- Automated email alerts for low stock items
- Complete audit history of all inventory changes
- Optional ServiceNow ticket integration

### 1.3 Target Users
- **IT Service Desk**: Full access to manage inventory, upload data, configure settings
- **IT Staff (Read-Only)**: View-only access to inventory and audit logs
- **IT Administrators**: Full system access including admin panel

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type-safe JavaScript |
| Vite | 5.x | Build tool and dev server |
| TanStack Query | 5.x | Server state management |
| React Router | 6.x | Client-side routing |
| Axios | 1.x | HTTP client |
| Recharts | 2.x | Data visualization |

### 2.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express.js | 4.x | Web API framework |
| TypeScript | 5.x | Type-safe JavaScript |
| Prisma | 5.x | ORM and database toolkit |
| SQLite | 3.x | Database engine |
| Nodemailer | 6.x | Email notifications |
| Multer | 1.x | File upload handling |

### 2.3 External Dependencies

| Service | Purpose | Required |
|---------|---------|----------|
| Active Directory | User authentication and authorization | Yes |
| SMTP Server | Email notifications | Yes |
| ServiceNow | Ticket URL linking | No (Optional) |

---

## 3. System Architecture

### 3.1 Architecture Pattern
**Three-Tier Architecture:**
- **Presentation Layer**: React SPA (Single Page Application)
- **Business Logic Layer**: Express.js REST API
- **Data Layer**: Prisma ORM + SQLite

### 3.2 Communication
- Frontend to Backend: RESTful API over HTTP/HTTPS
- Backend to AD: LDAP (mock in development)
- Backend to SMTP: SMTP/TLS

### 3.3 Deployment
- **Development**: Localhost (frontend: 3000, backend: 5002)
- **Production**: Node.js server with reverse proxy (nginx/IIS)

---

## 4. Core Features

### 4.1 Authentication & Authorization

**Windows Authentication**
- Users authenticate using Active Directory credentials
- Mock authentication in development (X-Username header)
- Role-based permissions via AD groups

**Access Control**
- Admin: Full system access
- Service Desk: Inventory management, CSV upload, configuration
- Read-Only: View inventory and audit logs

### 4.2 Inventory Management

**Dashboard**
- Total items count
- Low stock items count
- Total inventory value
- Inventory breakdown by category
- Recent changes (last 10)

**Inventory Views**
- Category tile view with expandable details
- Full table view with all fields
- Search by item number/description
- Filter by asset type, category, stock status
- Sort by any column

**Inventory Operations**
- Update quantities with ServiceNow ticket tracking
- Edit item details (Admin only)
- Create new items (Admin only)
- Delete items (Admin only)
- Automatic low stock detection

### 4.3 Audit & Reporting

**Automatic Audit Logging**
- Every quantity change logged automatically
- Captures previous/new quantity, user, timestamp
- Optional ServiceNow ticket URL
- Audit records are immutable

**Audit History**
- View complete change history
- Search by item/user/description
- Click-through to inventory details
- Item-specific history views

### 4.4 Email Notifications

**Low Stock Alerts**
- Automatic emails when stock drops below threshold
- Alert sent only when crossing threshold
- HTML formatted with item details
- Recipients from AD group + additional emails
- Configurable via admin panel

### 4.5 Bulk Data Management

**CSV Upload**
- Upload .csv files for bulk updates
- Create new items or update existing
- Data validation with error reporting
- Download template file
- Audit trail for all changes
- Automatic low stock alerts triggered

---

## 5. API Endpoints

### 5.1 Base Configuration

```
Base URL: http://localhost:5002/api (Development)
Base URL: https://assettracker.company.com/api (Production)
Authentication: X-Username header (Development) / AD Integration (Production)
Content-Type: application/json
```

### 5.2 Inventory Endpoints

::: moniker range="rest-api"

**GET** `/api/inventory`
- Get all inventory items with filtering and sorting
- Query params: search, assetType, category, needsReorder, sortBy, sortDesc

**GET** `/api/inventory/{id}`
- Get specific inventory item by ID

**GET** `/api/inventory/audit-history`
- Get all audit history
- Query params: limit, search

**GET** `/api/inventory/{id}/audit-history`
- Get audit history for specific item

**GET** `/api/inventory/types`
- Get all unique hardware/category types

**GET** `/api/inventory/asset-types`
- Get all asset types (Hardware/Software)

**GET** `/api/inventory/low-stock-count`
- Get count of items below threshold

**GET** `/api/inventory/dashboard-stats`
- Get dashboard statistics

**POST** `/api/inventory/update-quantity` 🔒 Service Desk
- Update inventory quantity
- Body: `{ itemNumber, quantityChange, serviceNowTicketUrl }`

**PUT** `/api/inventory/{id}` 🔒 Service Desk
- Update inventory item details

:::

### 5.3 User Endpoints

**GET** `/api/user/me`
- Get current user info with roles

**GET** `/api/user/search`
- Search Active Directory users
- Query param: query (min 2 chars)

### 5.4 CSV Upload Endpoints

**POST** `/api/csvupload` 🔒 Service Desk
- Upload CSV file (multipart/form-data)
- Returns: `{ successCount, failureCount, errors[] }`

**GET** `/api/csvupload/template`
- Download CSV template file

### 5.5 Configuration Endpoints

**GET** `/api/configuration/notification`
- Get notification configuration

**PUT** `/api/configuration/notification` 🔒 Service Desk
- Update notification configuration
- Body: `{ adGroupName, additionalEmailRecipients }`

---

## 6. Database Schema

### 6.1 Entity Relationships

```
Inventory (1) ----< (∞) AuditHistory
NotificationConfig (standalone)
```

### 6.2 Inventory Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Int | PRIMARY KEY | Auto-increment ID |
| itemNumber | String | UNIQUE, NOT NULL | Unique item identifier |
| assetType | String | NOT NULL | Hardware or Software |
| description | String | NOT NULL | Item description |
| category | String | NULL | Item category |
| cost | Float | NOT NULL | Unit cost |
| minimumThreshold | Int | NOT NULL | Reorder threshold |
| reorderAmount | Int | NOT NULL | Recommended reorder qty |
| currentQuantity | Int | NOT NULL | Current stock level |
| lastModifiedBy | String | NOT NULL | Username of last modifier |
| lastModifiedDate | DateTime | NOT NULL | Last modification timestamp |
| hardwareDescription | String | NULL | Legacy field |
| hardwareType | String | NULL | Legacy field |

### 6.3 AuditHistory Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Int | PRIMARY KEY | Auto-increment ID |
| itemId | Int | FOREIGN KEY | References Inventory.id |
| previousQuantity | Int | NOT NULL | Quantity before change |
| newQuantity | Int | NOT NULL | Quantity after change |
| changedBy | String | NOT NULL | Username who made change |
| changeDate | DateTime | NOT NULL | Change timestamp |
| serviceNowTicketUrl | String | NULL | Related ServiceNow ticket |

### 6.4 NotificationConfig Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Int | PRIMARY KEY | Auto-increment ID |
| adGroupName | String | NOT NULL | AD group to notify |
| additionalEmailRecipients | String | NULL | Comma-separated emails |

---

## 7. Security

### 7.1 Authentication Flow

**Development:**
1. X-Username header specifies user
2. Mock AD service checks role membership
3. Session created with user roles

**Production:**
1. User accesses application via browser
2. AD authentication challenge (NTLM/Kerberos)
3. User credentials verified
4. Username extracted and roles determined
5. Session created with user principal

### 7.2 Authorization Matrix

| Feature | Read-Only | Service Desk | Admin |
|---------|-----------|--------------|-------|
| View Dashboard | ✓ | ✓ | ✓ |
| View Inventory | ✓ | ✓ | ✓ |
| View Audit Log | ✓ | ✓ | ✓ |
| Update Quantities | ✗ | ✓ | ✓ |
| Edit Items | ✗ | ✓ | ✓ |
| Upload CSV | ✗ | ✓ | ✓ |
| Configure Settings | ✗ | ✓ | ✓ |

### 7.3 Security Measures

- All API requests authenticated
- Role-based endpoint protection
- Input validation on all endpoints
- Parameterized database queries (SQL injection prevention)
- React auto-escaping (XSS prevention)
- HTTPS in production (TLS 1.2+)
- CORS configured for frontend origin only

---

## 8. Environment Setup

### 8.1 Development Requirements

**System Requirements:**
- Node.js 18+ and npm
- Modern web browser (Chrome, Edge, Firefox)
- Git

**Backend Setup:**
```bash
cd backend-express
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

### 8.2 Production Requirements

**Server:**
- Node.js 18+ LTS
- PM2 or similar process manager
- Nginx or IIS as reverse proxy
- Active Directory connectivity
- 4 GB RAM minimum
- 10 GB disk space
- SMTP server access

**Network:**
- HTTPS certificate (valid SSL)
- Ports 80/443 open
- LDAP/AD connectivity
- SMTP port 587 or 25 access

**Active Directory:**
- Security groups:
  - ITS-AssetTracker-Admins
  - ITS-ServiceDesk
  - ITS-AssetTracker-ReadOnly

### 8.3 Environment Variables

```bash
# Server
PORT=5002
NODE_ENV=production
FRONTEND_URL=https://assettracker.company.com

# Database
DATABASE_URL=file:./assettracker.db

# Email
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USERNAME=service-account@company.com
SMTP_PASSWORD=********
SMTP_FROM_ADDRESS=noreply@company.com
SMTP_FROM_NAME=ITS Asset Tracker
SMTP_ENABLE_SSL=true

# Active Directory
AD_ENABLED=true
AD_DOMAIN=company.local
AD_ADMIN_GROUP=ITS-AssetTracker-Admins
AD_SERVICE_DESK_GROUP=ITS-ServiceDesk
AD_READ_ONLY_GROUP=ITS-AssetTracker-ReadOnly
```

---

## 9. Performance & Scalability

### 9.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | < 3 seconds | Time to interactive |
| API Response | < 500ms | 95th percentile |
| Concurrent Users | 50+ | Load testing |
| Database Queries | < 200ms | Query execution time |

### 9.2 Scalability

**Current Limits:**
- Inventory items: 10,000+
- Audit records: 100,000+
- Concurrent users: ~50
- CSV upload: 10MB max

**Future Scaling:**
- Migrate to PostgreSQL/MySQL for higher concurrency
- Implement Redis caching
- Horizontal scaling with load balancer

---

## 10. Monitoring & Logging

### 10.1 Application Logging

**Log Levels:**
- **Error**: Exceptions, failures
- **Warning**: Low stock alerts, validation errors
- **Info**: User actions, API requests
- **Debug**: Detailed diagnostics (dev only)

**Prisma Query Logging:**
- Enabled in development
- Disabled in production (or Error only)

### 10.2 Key Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Response Time | > 1000ms | Investigate performance |
| Error Rate | > 5% | Check logs, alert team |
| Low Stock Items | > 10 | Review procurement |
| Failed CSV Uploads | > 20% | Validate file format |

---

## 11. Backup & Recovery

### 11.1 Backup Strategy

**Database Backup:**
- Frequency: Daily
- Method: File copy of assettracker.db
- Retention: 30 days
- Location: Separate storage/network location

### 11.2 Recovery Procedure

1. Stop Node.js application
2. Replace database file with backup
3. Restart application
4. Verify data integrity
5. Test key functionality

---

## 12. Known Limitations

1. **SQLite Concurrency**: Limited to ~100 concurrent writes
2. **Active Directory**: Requires domain connectivity
3. **Browser Support**: Modern browsers only (no IE11)
4. **File Upload**: CSV files limited to 10MB
5. **Email Delivery**: Depends on SMTP server availability

---

## 13. Future Enhancements

### 13.1 Planned Features
- ServiceNow API integration for automated ticket creation
- Barcode scanning support
- Export inventory to Excel/PDF
- Multi-location inventory tracking
- Reservation/checkout system
- Advanced reporting and analytics

### 13.2 Technical Improvements
- Migrate to PostgreSQL for better scalability
- Implement Redis caching
- Real-time notifications with WebSockets
- Mobile-responsive improvements
- Automated testing suite

---

## 14. Glossary

| Term | Definition |
|------|------------|
| AD | Active Directory - Microsoft directory service |
| API | Application Programming Interface |
| CORS | Cross-Origin Resource Sharing |
| CSV | Comma-Separated Values file format |
| JWT | JSON Web Token (future authentication method) |
| LDAP | Lightweight Directory Access Protocol |
| ORM | Object-Relational Mapping |
| REST | Representational State Transfer |
| SMTP | Simple Mail Transfer Protocol |
| SPA | Single Page Application |
| TLS | Transport Layer Security |

---

## Document Information

**Version**: 2.0
**Last Updated**: 2025-11-18
**Document Owner**: ITS Development Team
**Review Cycle**: Quarterly

**Revision History**:

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | ITS Dev Team | Initial release (ASP.NET Core) |
| 2.0 | 2025-11-18 | ITS Dev Team | Migrated to Express.js/Node.js stack |

---

**End of Document**
