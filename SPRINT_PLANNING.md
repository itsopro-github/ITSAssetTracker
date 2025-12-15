# ITS Asset Tracker - Sprint Planning Guide

[[_TOC_]]

---

## Planning Assumptions

### Team Capacity
- **Team Size**: 2 developers
- **Sprint Duration**: 1 week (5 working days)
- **Capacity per Developer**: 6 hours/day dedicated to development
- **Total Sprint Capacity**: 60 hours (2 devs × 6 hrs × 5 days)
- **Story Point Velocity**: 15-20 points per sprint (target)

### Story Point Reference
- **3 points**: Simple feature (~6-8 hours)
- **5 points**: Small feature (~10-15 hours)
- **8 points**: Medium feature (~16-24 hours)
- **13 points**: Large feature (~26-40 hours)
- **21 points**: Complex feature (~42+ hours)

### Project Summary
- **Total Story Points**: ~470 points
- **Total User Stories**: 62
- **Recommended Duration**: 12 weeks (12 sprints)
- **Buffer**: 2-3 weeks for bug fixes and polish

---

## Sprint Overview

| Sprint | Theme | Story Points | User Stories | Focus Area |
|--------|-------|--------------|--------------|------------|
| Sprint 1 | Foundation Setup | 16 pts | 3 stories | Backend & Frontend Infrastructure |
| Sprint 2 | Database & Core Services | 18 pts | 3 stories | Database, Dependency Injection |
| Sprint 3 | Authentication | 18 pts | 3 stories | Windows Auth, User Management |
| Sprint 4 | Basic Inventory Display | 21 pts | 3 stories | Dashboard, Inventory List, Tiles |
| Sprint 5 | Search, Filter, Sort | 18 pts | 3 stories | Inventory Navigation Features |
| Sprint 6 | Inventory Updates | 18 pts | 2 stories | Quantity Management, Assignment |
| Sprint 7 | Audit System | 18 pts | 3 stories | Audit Logging, History Display |
| Sprint 8 | Email Notifications | 18 pts | 2 stories | SMTP Config, Low Stock Alerts |
| Sprint 9 | CSV Upload | 21 pts | 2 stories | CSV Upload, Processing |
| Sprint 10 | CSV Validation | 16 pts | 2 stories | CSV Template, Validation |
| Sprint 11 | Admin Panel | 21 pts | 3 stories | Create, Edit, Delete Items |
| Sprint 12 | Polish & Testing | 15 pts | 2 stories | Error Handling, Loading States |

**Total**: 218 points across 31 primary stories
**Note**: Remaining stories are lower priority or nice-to-have features

---

## Detailed Sprint Breakdown

### Sprint 1: Foundation Setup (Week 1)
**Goal**: Establish development infrastructure and tooling

**Story Points**: 16
**Duration**: 5 days

#### User Stories:
1. **Set Up ASP.NET Core API** (5 pts) - Epic: Backend Infrastructure
   - Create Web API project
   - Configure Program.cs
   - Set up folder structure
   - Configure CORS policy
   - Enable Swagger
   - **Dependencies**: None
   - **Assignee**: Backend Developer

2. **Set Up React Application** (5 pts) - Epic: Frontend Infrastructure
   - Initialize Vite + React + TypeScript project
   - Configure TypeScript settings
   - Set up ESLint and Prettier
   - Create folder structure
   - Configure Vite proxy
   - **Dependencies**: None
   - **Assignee**: Frontend Developer

3. **Install Core Dependencies** (3 pts) - Epic: Frontend Infrastructure
   - Install React Router v6
   - Install TanStack Query
   - Install Axios and Recharts
   - Verify all dependencies work
   - **Dependencies**: Story #2
   - **Assignee**: Frontend Developer

4. **Configure Logging** (3 pts) - Epic: Backend Infrastructure
   - Configure logging in Program.cs
   - Add logging to controllers
   - Add logging to services
   - **Dependencies**: Story #1
   - **Assignee**: Backend Developer

#### Sprint 1 Deliverables:
- ✅ Backend API running on port 5000
- ✅ Frontend dev server running on port 3000
- ✅ Projects compile and run without errors
- ✅ Basic folder structure in place

#### Sprint 1 Testing:
- Manual: Verify both servers start successfully
- Manual: Access Swagger UI at /swagger
- Manual: Verify hot reload works on frontend

---

### Sprint 2: Database & Core Services (Week 2)
**Goal**: Implement database layer and service infrastructure

**Story Points**: 18
**Duration**: 5 days

#### User Stories:
1. **Set Up Entity Framework Core** (8 pts) - Epic: Backend Infrastructure
   - Install EF Core packages
   - Create AssetTrackerDbContext
   - Configure connection string
   - Register DbContext in DI
   - Enable EF Core tools
   - **Dependencies**: Sprint 1 complete
   - **Assignee**: Backend Developer

2. **Create Database Schema** (8 pts) - Epic: Backend Infrastructure
   - Create Inventory entity model
   - Create AuditHistory entity model
   - Create NotificationConfig entity model
   - Configure entity relationships
   - Create initial migration
   - Apply migration to database
   - **Dependencies**: Story #1
   - **Assignee**: Backend Developer

3. **Seed Initial Data** (5 pts) - Epic: Backend Infrastructure
   - Create database seeding method
   - Check if database already has data
   - Insert 15-20 sample inventory items
   - Call seed method on startup
   - **Dependencies**: Story #2
   - **Assignee**: Backend Developer

4. **Register Application Services** (5 pts) - Epic: Backend Infrastructure
   - Register IEmailService
   - Register ICsvProcessingService
   - Register IActiveDirectoryService
   - Choose service lifetimes
   - Test service resolution
   - **Dependencies**: Story #1
   - **Assignee**: Backend Developer

#### Sprint 2 Deliverables:
- ✅ Database created with all tables
- ✅ Sample data seeded (15-20 items)
- ✅ Entity models defined
- ✅ Services registered in DI container

#### Sprint 2 Testing:
- Manual: Verify database file created
- Manual: Query database to see sample data
- SQL: Check foreign key constraints work
- Unit: Test service instantiation

---

### Sprint 3: Authentication & Authorization (Week 3)
**Goal**: Implement Windows Authentication and role-based access

**Story Points**: 18
**Duration**: 5 days

#### User Stories:
1. **User Login with Windows Credentials** (5 pts) - Epic: User Authentication & Authorization
   - Configure ASP.NET Core Windows Authentication
   - Implement user identity extraction
   - Configure CORS for Windows Auth
   - Test authentication flow
   - **Dependencies**: Sprint 1-2 complete
   - **Assignee**: Backend Developer

2. **Service Desk Full Access** (8 pts) - Epic: User Authentication & Authorization
   - Create AD Group Authorization Attribute
   - Implement Active Directory Service
   - Apply authorization to controllers
   - Update frontend user context
   - Conditionally show UI elements
   - **Dependencies**: Story #1
   - **Assignee**: Both (Backend 60%, Frontend 40%)

3. **Read-Only User Access** (5 pts) - Epic: User Authentication & Authorization
   - Implement Read-Only permission checks
   - Hide edit controls for read-only users
   - Test role-based UI rendering
   - **Dependencies**: Story #2
   - **Assignee**: Frontend Developer

4. **Create API Service Layer** (8 pts) - Epic: Frontend Infrastructure
   - Create Axios instance
   - Build Inventory API Service
   - Build User API Service
   - Add response interceptors
   - Define TypeScript API types
   - **Dependencies**: Sprint 1 complete
   - **Assignee**: Frontend Developer

#### Sprint 3 Deliverables:
- ✅ Windows Authentication working
- ✅ Role-based authorization enforced
- ✅ AD groups checked on API calls
- ✅ UI shows/hides based on roles
- ✅ API client layer implemented

#### Sprint 3 Testing:
- Manual: Login as Service Desk user
- Manual: Login as Read-Only user
- Integration: Test unauthorized API calls blocked
- Manual: Verify UI elements hide correctly

---

### Sprint 4: Basic Inventory Display (Week 4)
**Goal**: Display inventory data with dashboard and list views

**Story Points**: 21
**Duration**: 5 days

#### User Stories:
1. **View Inventory Dashboard** (8 pts) - Epic: Inventory Management System
   - Create Dashboard Statistics API endpoint
   - Build Dashboard layout
   - Implement statistics cards
   - Add Recharts inventory chart
   - Build recent changes table
   - **Dependencies**: Sprint 2-3 complete
   - **Assignee**: Both (Backend 40%, Frontend 60%)

2. **View Inventory as Category Tiles** (8 pts) - Epic: Inventory Management System
   - Create GET /api/inventory endpoint with basic features
   - Group inventory items by category (frontend)
   - Create category tile component
   - Implement tile expand/collapse
   - Style tiles with CSS
   - **Dependencies**: Sprint 2-3 complete
   - **Assignee**: Both (Backend 40%, Frontend 60%)

3. **Implement Application Routing** (8 pts) - Epic: Frontend Infrastructure
   - Set up BrowserRouter
   - Create Routes configuration
   - Create Navigation component
   - Implement conditional Admin link
   - Add active link styling
   - **Dependencies**: Sprint 1 complete
   - **Assignee**: Frontend Developer

4. **Create Page Components** (5 pts) - Epic: Frontend Infrastructure
   - Create Dashboard page
   - Create InventoryList page
   - Create AuditLog page
   - Create AdminPanel page
   - **Dependencies**: Story #3
   - **Assignee**: Frontend Developer

5. **Set Up TanStack Query** (5 pts) - Epic: Frontend Infrastructure
   - Create QueryClient instance
   - Wrap app with QueryClientProvider
   - Configure default query options
   - Add React Query DevTools
   - **Dependencies**: Sprint 1 complete
   - **Assignee**: Frontend Developer

#### Sprint 4 Deliverables:
- ✅ Dashboard showing statistics and chart
- ✅ Inventory list with category tiles
- ✅ Navigation between pages working
- ✅ TanStack Query managing server state

#### Sprint 4 Testing:
- Manual: Navigate between all pages
- Manual: Verify dashboard statistics accurate
- Manual: Verify chart renders correctly
- Manual: Click tiles to expand/collapse
- Integration: Test API endpoints with frontend

---

### Sprint 5: Search, Filter, Sort (Week 5)
**Goal**: Add search, filtering, and sorting to inventory

**Story Points**: 18
**Duration**: 5 days

#### User Stories:
1. **Filter and Search Inventory** (8 pts) - Epic: Inventory Management System
   - Add query parameters to API (search, assetType, category, needsReorder)
   - Build search input component with debouncing
   - Create filter dropdowns
   - Add low stock checkbox filter
   - Combine filters in API request
   - **Dependencies**: Sprint 4 complete
   - **Assignee**: Both (Backend 40%, Frontend 60%)

2. **Sort Inventory Data** (5 pts) - Epic: Inventory Management System
   - Add sorting parameters to API (sortBy, sortDesc)
   - Create sortable column headers
   - Implement sort state management
   - Apply sorting to all tables
   - **Dependencies**: Sprint 4 complete
   - **Assignee**: Both (Backend 30%, Frontend 70%)

3. **Implement Error Boundary** (5 pts) - Epic: Frontend Infrastructure
   - Create ErrorBoundary component
   - Design error fallback UI
   - Wrap app with ErrorBoundary
   - Add error logging
   - **Dependencies**: Sprint 1 complete
   - **Assignee**: Frontend Developer

#### Sprint 5 Deliverables:
- ✅ Search bar filters inventory
- ✅ Filter dropdowns work
- ✅ Sort by any column
- ✅ Multiple filters combine correctly
- ✅ Error boundary catches errors

#### Sprint 5 Testing:
- Manual: Search for items
- Manual: Apply multiple filters
- Manual: Sort by each column
- Manual: Trigger error to test boundary
- Integration: Test API with various query params

---

### Sprint 6: Inventory Updates (Week 6)
**Goal**: Enable inventory quantity updates with audit trail

**Story Points**: 18
**Duration**: 5 days

#### User Stories:
1. **Assign Inventory Items** (13 pts) - Epic: Inventory Management System
   - Create update quantity API endpoint with authorization
   - Validate quantity changes (no negative)
   - Create assignment modal component
   - Implement quantity change logic
   - Add TanStack mutation for update
   - Show success/error messages
   - Refresh inventory after update
   - **Dependencies**: Sprint 3-4 complete
   - **Assignee**: Both (Backend 50%, Frontend 50%)

2. **Disable Assign Button When Out of Stock** (5 pts) - Epic: Inventory Management System
   - Add disabled state to tile buttons
   - Add disabled state to expanded view buttons
   - Add disabled state to main table buttons
   - Add "Out of stock" tooltips
   - **Dependencies**: Story #1
   - **Assignee**: Frontend Developer

#### Sprint 6 Deliverables:
- ✅ Users can assign inventory items
- ✅ Quantity updates persist to database
- ✅ Audit trail created for each change
- ✅ Buttons disabled when quantity = 0
- ✅ UI updates immediately after assignment

#### Sprint 6 Testing:
- Manual: Assign items and verify quantity changes
- Manual: Try negative quantities (should fail)
- Manual: Verify audit entry created
- Manual: Test buttons disabled when qty = 0
- Integration: Test update-quantity endpoint

---

### Sprint 7: Audit System (Week 7)
**Goal**: Implement complete audit history tracking and display

**Story Points**: 18
**Duration**: 5 days

#### User Stories:
1. **Automatic Audit Logging** (8 pts) - Epic: Audit & Reporting
   - Create AuditHistory table schema (done in Sprint 2)
   - Add audit entry on quantity update
   - Add audit entry on CSV upload (prepared for Sprint 9)
   - Add audit entry on admin edit (prepared for Sprint 11)
   - Link audit to inventory item
   - **Dependencies**: Sprint 2, 6 complete
   - **Assignee**: Backend Developer

2. **View Complete Audit History** (8 pts) - Epic: Audit & Reporting
   - Create GET /api/inventory/audit-history endpoint
   - Include item details in response
   - Build Audit Log page component
   - Format audit data in table
   - Add color coding for changes (green increase, red decrease)
   - Link to ServiceNow tickets
   - **Dependencies**: Story #1
   - **Assignee**: Both (Backend 40%, Frontend 60%)

3. **Search Audit History** (5 pts) - Epic: Audit & Reporting
   - Add search parameter to audit API
   - Search across multiple fields (item, user, description)
   - Build audit search component with debouncing
   - Display search result count
   - **Dependencies**: Story #2
   - **Assignee**: Both (Backend 30%, Frontend 70%)

#### Sprint 7 Deliverables:
- ✅ All quantity changes logged to audit
- ✅ Audit history page displays all records
- ✅ Search audit history works
- ✅ Color-coded change indicators
- ✅ ServiceNow ticket links clickable

#### Sprint 7 Testing:
- Manual: Update inventory and verify audit entry
- Manual: View audit log page
- Manual: Search audit history
- Manual: Click ServiceNow ticket link
- Integration: Test audit-history endpoint

---

### Sprint 8: Email Notifications (Week 8)
**Goal**: Implement automated email alerts for low stock

**Story Points**: 18
**Duration**: 5 days

#### User Stories:
1. **Configure SMTP Settings** (5 pts) - Epic: Email Notification System
   - Add Email section to appsettings.json
   - Create email configuration model
   - Load configuration in startup
   - Validate SMTP settings
   - **Dependencies**: Sprint 1-2 complete
   - **Assignee**: Backend Developer

2. **Configure Notification Recipients** (8 pts) - Epic: Email Notification System
   - Create NotificationConfig table (done in Sprint 2)
   - Create Configuration Controller (GET/PUT endpoints)
   - Build Configuration UI component
   - Save configuration to database
   - **Dependencies**: Sprint 2-3 complete
   - **Assignee**: Both (Backend 50%, Frontend 50%)

3. **Send Low Stock Email Alerts** (13 pts) - Epic: Email Notification System
   - Create Email Service interface
   - Implement SMTP Email Service
   - Query AD group for email addresses
   - Build HTML email template
   - Check threshold after quantity update
   - Prevent duplicate alert emails
   - Handle email send failures
   - Test email functionality
   - **Dependencies**: Story #1, #2, Sprint 6 complete
   - **Assignee**: Backend Developer

#### Sprint 8 Deliverables:
- ✅ SMTP configuration in place
- ✅ Notification recipients configurable
- ✅ Low stock alerts sent automatically
- ✅ Email includes item details and app link
- ✅ No duplicate alerts

#### Sprint 8 Testing:
- Manual: Configure SMTP settings
- Manual: Set notification recipients
- Manual: Update item below threshold
- Manual: Verify email received
- Integration: Test email service with SMTP

---

### Sprint 9: CSV Upload (Week 9)
**Goal**: Enable bulk inventory import via CSV

**Story Points**: 21
**Duration**: 5 days

#### User Stories:
1. **Upload CSV File** (13 pts) - Epic: Bulk Data Management
   - Create CSV Upload Controller (POST endpoint)
   - Add file type validation (.csv only)
   - Build CSV upload UI component
   - Add upload progress indicator
   - Display upload results (success/failure counts)
   - **Dependencies**: Sprint 3 complete
   - **Assignee**: Both (Backend 50%, Frontend 50%)

2. **Process CSV File Contents** (21 pts) - Epic: Bulk Data Management
   - Create CSV Processing Service interface
   - Parse CSV file stream
   - Map CSV columns to model
   - Implement upsert logic (update existing, insert new)
   - Validate each CSV row
   - Create audit entries for CSV changes
   - Calculate quantity deltas
   - Handle row-level errors
   - Build result summary object
   - **Dependencies**: Story #1, Sprint 7 complete
   - **Assignee**: Backend Developer

#### Sprint 9 Deliverables:
- ✅ CSV upload feature working
- ✅ Existing items updated
- ✅ New items created
- ✅ Audit trail for each change
- ✅ Error handling and reporting

#### Sprint 9 Testing:
- Manual: Upload valid CSV file
- Manual: Upload CSV with errors
- Manual: Verify items updated/created
- Manual: Check audit entries created
- Integration: Test CSV processing service

---

### Sprint 10: CSV Validation & Templates (Week 10)
**Goal**: Add CSV template and robust validation

**Story Points**: 16
**Duration**: 5 days

#### User Stories:
1. **Download CSV Template** (3 pts) - Epic: Bulk Data Management
   - Create CSV Template endpoint
   - Generate template with headers and samples
   - Return file as download
   - Add download button to UI
   - **Dependencies**: Sprint 9 complete
   - **Assignee**: Both (Backend 60%, Frontend 40%)

2. **Validate CSV Data Quality** (13 pts) - Epic: Bulk Data Management
   - Add required field validation
   - Add data type validation (numbers, decimals)
   - Add business rule validation (qty >= 0, threshold > 0)
   - Generate descriptive error messages
   - Test with invalid CSV data
   - **Dependencies**: Sprint 9 complete
   - **Assignee**: Backend Developer

#### Sprint 10 Deliverables:
- ✅ CSV template downloadable
- ✅ Comprehensive validation rules
- ✅ Clear error messages
- ✅ Invalid data rejected gracefully

#### Sprint 10 Testing:
- Manual: Download template
- Manual: Upload template (should work)
- Manual: Upload invalid CSV (test each validation)
- Integration: Test validation rules

---

### Sprint 11: Admin Panel (Week 11)
**Goal**: Enable full CRUD operations for inventory items

**Story Points**: 21
**Duration**: 5 days

#### User Stories:
1. **Edit Inventory Item Details** (13 pts) - Epic: Inventory Management System
   - Create PUT /api/inventory/{id} endpoint with authorization
   - Build edit item modal component
   - Pre-fill form with current values
   - Implement form validation
   - Create update mutation
   - Handle update success/error
   - **Dependencies**: Sprint 3-4 complete
   - **Assignee**: Both (Backend 40%, Frontend 60%)

2. **Create New Inventory Item** (8 pts) - Epic: Inventory Management System
   - Create POST /api/inventory endpoint
   - Check for duplicate item numbers
   - Add Create Item button and modal
   - Implement create form validation
   - Create insert mutation
   - **Dependencies**: Sprint 3-4 complete
   - **Assignee**: Both (Backend 40%, Frontend 60%)

3. **Delete Inventory Item** (5 pts) - Epic: Inventory Management System
   - Create DELETE /api/inventory/{id} endpoint
   - Handle audit history on delete (preserve)
   - Build delete confirmation dialog
   - Implement delete mutation
   - Remove item from UI on success
   - **Dependencies**: Sprint 3-4 complete
   - **Assignee**: Both (Backend 40%, Frontend 60%)

#### Sprint 11 Deliverables:
- ✅ Admins can create new items
- ✅ Admins can edit existing items
- ✅ Admins can delete items
- ✅ All changes create audit entries
- ✅ Validation prevents invalid data

#### Sprint 11 Testing:
- Manual: Create new inventory item
- Manual: Edit existing item
- Manual: Delete item with confirmation
- Manual: Verify audit history preserved
- Integration: Test CRUD endpoints

---

### Sprint 12: Polish & Testing (Week 12)
**Goal**: Add finishing touches and comprehensive testing

**Story Points**: 15
**Duration**: 5 days

#### User Stories:
1. **Display Loading States** (3 pts) - Epic: Frontend Infrastructure
   - Create loading spinner component
   - Show loading during queries
   - Add loading text labels
   - **Dependencies**: Sprint 4 complete
   - **Assignee**: Frontend Developer

2. **View Item-Specific Audit History** (5 pts) - Epic: Audit & Reporting
   - Create GET /api/inventory/{id}/audit-history endpoint
   - Build item audit modal component
   - Add View History button to items
   - Filter audit records by item
   - **Dependencies**: Sprint 7 complete
   - **Assignee**: Both (Backend 30%, Frontend 70%)

#### Additional Sprint 12 Activities:
- **Bug Fixing**: Address all known bugs from previous sprints
- **Performance Optimization**: Review slow queries, optimize frontend rendering
- **Security Testing**: Test authorization boundaries, SQL injection attempts
- **User Acceptance Testing**: Walk through all features with stakeholders
- **Documentation**: Update README, API docs, deployment guide
- **Code Review**: Final pass through all code for quality
- **Deployment Prep**: Test production build, prepare deployment scripts

#### Sprint 12 Deliverables:
- ✅ Loading indicators throughout app
- ✅ Item-specific audit history
- ✅ All known bugs fixed
- ✅ Performance optimized
- ✅ Security tested
- ✅ Documentation complete
- ✅ Ready for production deployment

#### Sprint 12 Testing:
- **Regression Testing**: Test all features end-to-end
- **Load Testing**: Test with 50 concurrent users
- **Browser Testing**: Test on Chrome, Edge, Firefox
- **UAT**: Stakeholder sign-off

---

## Post-Sprint 12: Optional Enhancements

### Sprint 13-15: Nice-to-Have Features (Optional)
These sprints are optional and can be prioritized based on business needs:

**Remaining User Stories** (~40 story points):
- Export inventory to Excel
- Advanced reporting and analytics
- Multi-location tracking
- Barcode scanning integration
- Mobile responsive improvements
- ServiceNow API integration
- Scheduled email reports

---

## Sprint Ceremonies & Activities

### Sprint Planning (Monday - 1 hour)
- Review sprint goal
- Review and commit to user stories
- Break down tasks if needed
- Assign stories to developers
- Confirm capacity and velocity

### Daily Standup (Every day - 15 minutes)
- What did I complete yesterday?
- What am I working on today?
- Any blockers or impediments?

### Sprint Review/Demo (Friday - 1 hour)
- Demo completed user stories to stakeholders
- Gather feedback
- Update product backlog based on feedback

### Sprint Retrospective (Friday - 30 minutes)
- What went well?
- What could be improved?
- Action items for next sprint

### Backlog Refinement (Mid-sprint - 1 hour)
- Review upcoming sprint stories
- Add acceptance criteria
- Estimate story points
- Identify dependencies

---

## Risk Management

### High-Risk Items
| Risk | Impact | Mitigation | Sprint |
|------|--------|------------|--------|
| Windows Auth not working on macOS dev | High | Use mock auth for dev, test on Windows VM | Sprint 3 |
| Active Directory connectivity issues | High | Have AD admin available during Sprint 3 | Sprint 3 |
| SMTP server access denied | Medium | Get SMTP credentials early, test in Sprint 8 | Sprint 8 |
| CSV parsing performance with large files | Medium | Test with 1000+ row files, implement streaming | Sprint 9 |
| Database performance with large datasets | Medium | Add indexes, test with 10,000+ items | Sprint 10 |

### Sprint Dependencies
- **Sprint 3** requires Windows Server for AD testing (can use macOS workarounds for dev)
- **Sprint 8** requires SMTP server access and credentials
- **Sprint 9-10** need sample CSV files with test data
- **Sprint 11** builds on Sprint 4 (must have inventory display working)

---

## Velocity Tracking

### Expected Velocity
| Sprint | Planned Points | Actual Points | Variance | Notes |
|--------|----------------|---------------|----------|-------|
| Sprint 1 | 16 | TBD | TBD | First sprint, establishing baseline |
| Sprint 2 | 18 | TBD | TBD | |
| Sprint 3 | 18 | TBD | TBD | |
| Sprint 4 | 21 | TBD | TBD | |
| Sprint 5 | 18 | TBD | TBD | |
| Sprint 6 | 18 | TBD | TBD | |
| Sprint 7 | 18 | TBD | TBD | |
| Sprint 8 | 18 | TBD | TBD | |
| Sprint 9 | 21 | TBD | TBD | |
| Sprint 10 | 16 | TBD | TBD | |
| Sprint 11 | 21 | TBD | TBD | |
| Sprint 12 | 15 | TBD | TBD | |

### Adjusting Velocity
After Sprint 2, review actual velocity and adjust future sprints:
- If velocity < 15 points: Reduce sprint commitments
- If velocity > 20 points: Increase sprint commitments or add polish work

---

## Definition of Done (DoD)

### Story-Level DoD
- [ ] All acceptance criteria met
- [ ] Code reviewed by peer
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] No critical bugs
- [ ] Documentation updated
- [ ] Merged to main branch

### Sprint-Level DoD
- [ ] All committed stories completed
- [ ] Sprint demo conducted
- [ ] Retrospective completed
- [ ] Production-ready code (compiles, runs)
- [ ] No blocking bugs

### Release-Level DoD
- [ ] All must-have features complete
- [ ] User acceptance testing passed
- [ ] Performance testing passed
- [ ] Security testing passed
- [ ] Deployment guide updated
- [ ] Training materials ready

---

## Communication Plan

### Stakeholder Updates
- **Frequency**: Weekly (after Sprint Review)
- **Format**: Email summary with demo recording
- **Content**: Completed features, upcoming sprint, risks

### Team Communication
- **Daily Standups**: 9:00 AM daily via Teams/Zoom
- **Slack Channel**: #its-asset-tracker for async communication
- **Code Reviews**: Pull requests within 4 hours
- **Blockers**: Escalate immediately to Scrum Master

---

## Tools & Environment

### Development Tools
- **IDE**: Visual Studio 2022, VS Code
- **Source Control**: Git + Azure DevOps Repos
- **CI/CD**: Azure DevOps Pipelines (optional)
- **Task Tracking**: Azure DevOps Boards
- **Communication**: Microsoft Teams, Slack

### Testing Environments
- **Local Development**: Localhost (each developer)
- **Integration Testing**: Shared dev server (optional)
- **UAT**: Windows Server with AD integration
- **Production**: IIS on Windows Server

---

## Success Metrics

### Sprint Success
- ✅ Complete 80%+ of committed story points
- ✅ Zero critical bugs carried forward
- ✅ All demos successful
- ✅ Team morale high (retrospective feedback)

### Project Success
- ✅ Complete all must-have features (Sprints 1-12)
- ✅ Deploy to production by Week 12
- ✅ User satisfaction > 4/5
- ✅ No major production incidents first month
- ✅ Performance meets NFRs (< 3s page load, < 500ms API)

---

## Appendix: Story Prioritization Matrix

### Must-Have (Sprints 1-12)
These features are **essential** for MVP:
- Authentication & Authorization
- View Inventory (Dashboard, List, Tiles)
- Search, Filter, Sort
- Update Quantities
- Audit History
- Email Alerts
- CSV Upload
- Admin Panel (Create, Edit, Delete)

### Should-Have (Sprints 13-15)
Nice-to-have features that add value:
- Item-specific audit history
- Advanced reporting
- Export to Excel
- Multiple locations

### Could-Have (Backlog)
Future enhancements:
- Barcode scanning
- Mobile app
- ServiceNow API integration
- Reservation system
- Scheduled reports

---

**Document Version**: 1.0
**Last Updated**: 2024-01-15
**Next Review**: After Sprint 2
