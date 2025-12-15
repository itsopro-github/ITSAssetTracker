# ITS Asset Tracker - Architecture & Flow Diagrams

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser[Web Browser]
    end

    subgraph Frontend["Frontend - React + TypeScript"]
        App[App.tsx]
        Router[React Router]
        Pages[Pages]
        Components[Components]
        TanStack[TanStack Query]
        API_Client[Axios API Client]
    end

    subgraph Backend["Backend - ASP.NET Core API"]
        Controllers[Controllers]
        Services[Services]
        Middleware[AD Authorization]
        EF[Entity Framework Core]
    end

    subgraph External["External Services"]
        AD[Active Directory]
        SMTP[SMTP Server]
        ServiceNow[ServiceNow Optional]
    end

    subgraph Data["Data Layer"]
        SQLite[(SQLite Database)]
    end

    Browser --> App
    App --> Router
    Router --> Pages
    Pages --> Components
    Components --> TanStack
    TanStack --> API_Client

    API_Client -->|HTTP Requests| Controllers
    Controllers --> Middleware
    Middleware -->|Check Roles| AD
    Controllers --> Services
    Services --> EF
    EF --> SQLite

    Services -->|Low Stock Alerts| SMTP
    Services -.->|Optional Link| ServiceNow

    style Frontend fill:#e1f5ff
    style Backend fill:#fff4e1
    style External fill:#ffe1e1
    style Data fill:#e1ffe1
```

## 2. User Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Frontend
    participant API
    participant AD as Active Directory

    User->>Browser: Access Application
    Browser->>Frontend: Load React App
    Frontend->>API: GET /api/user/me

    alt Windows Auth Enabled
        API->>AD: Validate Windows Credentials
        AD-->>API: User Identity & Groups
        API->>API: Check IT_ServiceDesk Group
        API->>API: Check IT_ReadOnly Group
    else Demo Mode (macOS Dev)
        API->>API: Return demo.user@company.com
    end

    API-->>Frontend: User Info + Roles
    Frontend->>Frontend: Set User Context
    Frontend->>Browser: Show Navigation (Role-Based)
    Browser->>User: Display Dashboard

    Note over Frontend,API: Roles: isAdmin, isServiceDesk, isReadOnly
```

## 3. Inventory Management Flow

```mermaid
flowchart TD
    Start([User Opens Inventory Page]) --> LoadInventory[GET /api/inventory]
    LoadInventory --> DisplayTiles[Display Category Tiles]

    DisplayTiles --> UserAction{User Action?}

    UserAction -->|Search| ApplyFilters[Apply Search Filters]
    UserAction -->|Filter by Type| ApplyFilters
    UserAction -->|Sort| ApplySort[Apply Sorting]
    UserAction -->|View Details| ExpandCategory[Expand Category View]
    UserAction -->|Assign Item| CheckQuantity{Quantity > 0?}

    CheckQuantity -->|No| DisableButton[Button Disabled - Out of Stock]
    CheckQuantity -->|Yes| CheckPermission{Has Edit Permission?}

    CheckPermission -->|No| ReadOnly[View Only]
    CheckPermission -->|Yes| OpenModal[Open Assignment Modal]

    OpenModal --> EnterDetails[Enter Quantity & ServiceNow URL]
    EnterDetails --> Submit[POST /api/inventory/update-quantity]

    Submit --> UpdateDB[(Update Database)]
    UpdateDB --> CreateAudit[(Create Audit Entry)]
    CreateAudit --> CheckThreshold{Below Threshold?}

    CheckThreshold -->|Yes| SendAlert[Send Email Alert]
    CheckThreshold -->|No| RefreshUI[Refresh UI]
    SendAlert --> RefreshUI

    RefreshUI --> DisplayTiles

    ApplyFilters --> LoadInventory
    ApplySort --> LoadInventory
    ExpandCategory --> DisplayTable[Show Detailed Table]
    DisplayTable --> UserAction

    style CheckQuantity fill:#fff4e1
    style CheckPermission fill:#fff4e1
    style SendAlert fill:#ffe1e1
    style UpdateDB fill:#e1ffe1
    style CreateAudit fill:#e1ffe1
```

## 4. CSV Upload Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant CsvService
    participant DB as Database
    participant EmailService

    User->>Frontend: Upload CSV File
    Frontend->>Frontend: Validate File Type (.csv)
    Frontend->>API: POST /api/csvupload (FormData)

    API->>API: Check IT_ServiceDesk Permission

    alt Not Authorized
        API-->>Frontend: 401/403 Unauthorized
        Frontend-->>User: Permission Denied
    else Authorized
        API->>CsvService: ProcessCsvUpload(stream, username)

        loop For Each CSV Row
            CsvService->>CsvService: Parse CSV Row
            CsvService->>DB: Check If Item Exists

            alt Item Exists
                CsvService->>DB: Get Current Quantity
                CsvService->>DB: Update Item
                CsvService->>DB: Create Audit Entry
            else New Item
                CsvService->>DB: Insert New Item
                CsvService->>DB: Create Audit Entry
            end

            CsvService->>CsvService: Check Threshold

            alt Below Threshold
                CsvService->>EmailService: Send Low Stock Alert
                EmailService->>EmailService: Get Notification Config
                EmailService->>EmailService: Get AD Group Emails
                EmailService-->>User: Send Email Alert
            end
        end

        CsvService-->>API: Return Result (Success/Failure Counts)
        API-->>Frontend: Upload Summary
        Frontend-->>User: Show Results
    end
```

## 5. Audit History Flow

```mermaid
flowchart LR
    subgraph Triggers["Audit Trail Triggers"]
        CSV[CSV Upload]
        Manual[Manual Assignment]
        AdminUpdate[Admin Panel Update]
    end

    subgraph AuditCreation["Audit Entry Creation"]
        GetPrevQty[Get Previous Quantity]
        GetNewQty[Get New Quantity]
        GetUser[Get Username]
        GetTimestamp[Get Timestamp]
        GetTicket[Get ServiceNow URL Optional]
    end

    subgraph Database["Database Operations"]
        InsertAudit[(Insert AuditHistory Record)]
        LinkItem[(Link to Inventory Item)]
    end

    subgraph Display["Audit Log Display"]
        Query[GET /api/inventory/audit-history]
        Search[Search Filter Optional]
        Limit[Limit Results Optional]
        ShowTable[Display Audit Table]
    end

    CSV --> GetPrevQty
    Manual --> GetPrevQty
    AdminUpdate --> GetPrevQty

    GetPrevQty --> GetNewQty
    GetNewQty --> GetUser
    GetUser --> GetTimestamp
    GetTimestamp --> GetTicket

    GetTicket --> InsertAudit
    InsertAudit --> LinkItem

    LinkItem -.-> Query
    Query --> Search
    Search --> Limit
    Limit --> ShowTable

    style Database fill:#e1ffe1
    style AuditCreation fill:#fff4e1
    style Display fill:#e1f5ff
```

## 6. Email Alert System Flow

```mermaid
graph TD
    Start[Inventory Quantity Updated] --> Check{New Qty <= Min Threshold?}

    Check -->|No| End1[No Alert Needed]
    Check -->|Yes| CheckPrevious{Previous Qty > Min Threshold?}

    CheckPrevious -->|No| End2[Already Below - No New Alert]
    CheckPrevious -->|Yes| GetConfig[GET NotificationConfig]

    GetConfig --> GetADGroup{AD Group Configured?}

    GetADGroup -->|Yes| QueryAD[Query AD for Group Members]
    QueryAD --> GetEmails[Get Member Email Addresses]
    GetADGroup -->|No| SkipAD[Skip AD Lookup]

    GetEmails --> CombineRecipients[Combine AD Emails + Additional Emails]
    SkipAD --> CombineRecipients

    CombineRecipients --> BuildEmail[Build Email Message]

    BuildEmail --> EmailContent["Email Contains:
    - Item Number
    - Description
    - Current Quantity
    - Minimum Threshold
    - Link to Web App"]

    EmailContent --> SendSMTP[Send via SMTP]

    SendSMTP --> SMTPSuccess{SMTP Success?}

    SMTPSuccess -->|Yes| LogSuccess[Log Success]
    SMTPSuccess -->|No| LogError[Log Error]

    LogSuccess --> End3[Complete]
    LogError --> End3

    style Check fill:#fff4e1
    style CheckPrevious fill:#fff4e1
    style SendSMTP fill:#ffe1e1
    style LogSuccess fill:#e1ffe1
    style LogError fill:#ffe1e1
```

## 7. API Request Flow (Detailed)

```mermaid
sequenceDiagram
    participant Client as React Frontend
    participant TQ as TanStack Query
    participant Axios as Axios Client
    participant API as ASP.NET API
    participant Auth as AD Middleware
    participant Controller as Controller
    participant Service as Service Layer
    participant EF as Entity Framework
    participant DB as SQLite DB

    Client->>TQ: useQuery/useMutation
    TQ->>Axios: HTTP Request
    Axios->>API: GET/POST/PUT Request

    alt Requires Authorization
        API->>Auth: Check Authorization Attribute
        Auth->>Auth: Validate Windows Auth
        Auth->>Auth: Check AD Group Membership

        alt Unauthorized
            Auth-->>API: 401/403
            API-->>Axios: Error Response
            Axios-->>TQ: Promise Rejected
            TQ-->>Client: Error State
        end
    end

    API->>Controller: Route to Endpoint
    Controller->>Controller: Validate Request DTO

    alt Validation Failed
        Controller-->>API: 400 Bad Request
        API-->>Axios: Error Response
        Axios-->>TQ: Promise Rejected
        TQ-->>Client: Error State
    end

    Controller->>Service: Business Logic
    Service->>EF: LINQ Query/Command
    EF->>DB: SQL Query
    DB-->>EF: Result Set
    EF-->>Service: Mapped Entities
    Service-->>Controller: DTO/Result
    Controller-->>API: ActionResult
    API-->>Axios: JSON Response
    Axios-->>TQ: Promise Resolved
    TQ->>TQ: Update Cache
    TQ-->>Client: Data State
```

## 8. Database Entity Relationships

```mermaid
erDiagram
    INVENTORY ||--o{ AUDIT_HISTORY : tracks
    NOTIFICATION_CONFIG ||--o| INVENTORY : configures

    INVENTORY {
        int Id PK
        string ItemNumber UK
        string AssetType
        string Description
        string Category
        string HardwareDescription
        string HardwareType
        decimal Cost
        int MinimumThreshold
        int ReorderAmount
        int CurrentQuantity
        string LastModifiedBy
        datetime LastModifiedDate
    }

    AUDIT_HISTORY {
        int Id PK
        int ItemId FK
        int PreviousQuantity
        int NewQuantity
        string ChangedBy
        datetime ChangeDate
        string ServiceNowTicketUrl
    }

    NOTIFICATION_CONFIG {
        int Id PK
        string ADGroupName
        string AdditionalEmailRecipients
    }
```

## 9. Component Hierarchy (Frontend)

```mermaid
graph TD
    App[App.tsx] --> ErrorBoundary[ErrorBoundary]
    App --> QueryClientProvider[QueryClientProvider]

    QueryClientProvider --> Router[BrowserRouter]

    Router --> Navigation[Navigation Component]
    Router --> Routes[Routes]

    Routes --> Dashboard[Dashboard Page]
    Routes --> InventoryList[InventoryList Page]
    Routes --> AuditLog[AuditLog Page]
    Routes --> AdminPanel[AdminPanel Page]

    Navigation --> useQuery1[useQuery: currentUser]

    Dashboard --> useQuery2[useQuery: dashboard-stats]
    Dashboard --> StatsCards[Statistics Cards]
    Dashboard --> InventoryChart[Inventory Chart]
    Dashboard --> RecentChanges[Recent Changes Table]

    InventoryList --> useQuery3[useQuery: inventory]
    InventoryList --> CategoryTiles[Category Tiles View]
    InventoryList --> ExpandedView[Expanded Category View]
    InventoryList --> InventoryTable[Full Inventory Table]
    InventoryList --> AssignModal[Assignment Modal]

    AssignModal --> useMutation1[useMutation: update-quantity]

    AuditLog --> useQuery4[useQuery: audit-history]
    AuditLog --> SearchBar[Search Bar]
    AuditLog --> AuditTable[Audit History Table]

    AdminPanel --> useQuery5[useQuery: inventory admin]
    AdminPanel --> EditModal[Edit Item Modal]
    AdminPanel --> DeleteConfirm[Delete Confirmation]
    AdminPanel --> CSVUpload[CSV Upload Section]

    CSVUpload --> useMutation2[useMutation: csv-upload]

    style App fill:#e1f5ff
    style Routes fill:#fff4e1
    style useQuery1 fill:#ffe1e1
    style useQuery2 fill:#ffe1e1
    style useQuery3 fill:#ffe1e1
    style useQuery4 fill:#ffe1e1
    style useQuery5 fill:#ffe1e1
    style useMutation1 fill:#e1ffe1
    style useMutation2 fill:#e1ffe1
```

## 10. Deployment Architecture

```mermaid
graph TB
    subgraph Production["Production Environment"]
        subgraph IIS["IIS Web Server"]
            FrontendFiles[Static Files dist/]
            ASPNET[ASP.NET Core Runtime]
        end

        subgraph AppPool["Application Pool"]
            API[API Process]
        end

        ASPNET --> API
    end

    subgraph Network["Corporate Network"]
        ADServer[Active Directory Server]
        SMTPServer[SMTP Mail Server]
        SNow[ServiceNow Optional]
    end

    subgraph Storage["File System"]
        Database[(assettracker.db)]
        Logs[Application Logs]
    end

    Users[Corporate Users] -->|HTTPS| IIS
    IIS -->|Serve| FrontendFiles
    IIS -->|Proxy API Requests| API

    API -->|Windows Auth| ADServer
    API -->|Read/Write| Database
    API -->|Write| Logs
    API -->|Send Alerts| SMTPServer
    API -.->|Optional Link| SNow

    SMTPServer -->|Email| Users

    style Production fill:#e1f5ff
    style Network fill:#fff4e1
    style Storage fill:#e1ffe1
```

---

## Key Design Patterns

### Frontend
- **State Management**: TanStack Query for server state, React hooks for local state
- **Component Pattern**: Functional components with hooks
- **API Integration**: Centralized Axios instance with interceptors
- **Routing**: Declarative routing with React Router v6
- **Error Handling**: Error boundaries and query error states

### Backend
- **Architecture**: Layered architecture (Controllers → Services → Data)
- **Authorization**: Middleware-based AD group authorization
- **Data Access**: Repository pattern via Entity Framework Core
- **Email**: Service layer abstraction for SMTP
- **Logging**: Built-in ASP.NET Core logging

### Security
- **Authentication**: Windows Authentication (NTLM/Kerberos)
- **Authorization**: Role-based via AD groups
- **Audit Trail**: Complete logging of all data changes
- **SQL Injection**: Protected via EF Core parameterized queries
- **XSS**: React auto-escaping + Content Security Policy

---

## Performance Considerations

1. **Caching**: TanStack Query provides automatic caching
2. **Pagination**: Implemented for large datasets
3. **Indexing**: Database indexes on ItemNumber and foreign keys
4. **Query Optimization**: EF Core LINQ queries optimized
5. **Connection Pooling**: Built into EF Core
6. **Static Files**: Served directly by IIS in production
