# Azure DevOps Work Items Import Guide

## Overview

This guide explains how to import the ITS Asset Tracker work items into Azure DevOps Server 2022 RC1.

## File Information

**File:** `AzureDevOps_WorkItems.csv`

**Work Item Summary:**
- **6 Epics** - High-level business initiatives
- **25 Features** - Major feature areas under epics
- **62 User Stories** - User-facing functionality with acceptance criteria
- **147 Tasks** - Technical implementation tasks under user stories
- **Total:** 240 work items

## Agile Hierarchy Structure

```
Epic
└── Feature
    └── User Story (with Acceptance Criteria)
        └── Task (with Remaining Work hours)
```

## Import Instructions for Azure DevOps Server 2022 RC1

### Step 1: Prepare Your Azure DevOps Project

1. Create a new project or select an existing project
2. Ensure the project template is set to **Agile**
3. Navigate to **Boards** > **Work Items**

### Step 2: Import the CSV File

#### Option A: Using Azure DevOps Web Interface

1. Go to **Boards** > **Work Items**
2. Click on the **⋮** (more actions) menu
3. Select **Import Work Items**
4. Click **Choose file** and select `AzureDevOps_WorkItems.csv`
5. Review the mapping:
   - Ensure columns map correctly
   - Verify work item types are recognized
6. Click **Import**
7. Wait for the import to complete (may take a few minutes)

#### Option B: Using Azure DevOps CLI (if available)

```bash
# Install Azure DevOps extension
az extension add --name azure-devops

# Login to your organization
az login

# Import work items
az boards work-item import --path AzureDevOps_WorkItems.csv --organization https://your-org.visualstudio.com --project "ITS Asset Tracker"
```

### Step 3: Verify the Import

1. Go to **Boards** > **Backlogs**
2. Switch to **Epics** view
3. Verify all 6 epics are visible:
   - User Authentication & Authorization
   - Inventory Management System
   - Audit & Reporting
   - Email Notification System
   - Bulk Data Management
   - Frontend Infrastructure
   - Backend Infrastructure
4. Expand epics to verify features and user stories
5. Open a few user stories to verify acceptance criteria

### Step 4: Configure Area Path and Iterations

After import, you may want to organize work items:

1. Go to **Project Settings** > **Project configuration** > **Areas**
2. Create area paths if needed (e.g., Frontend, Backend, Database)
3. Go to **Iterations**
4. Create sprints/iterations
5. Assign work items to appropriate areas and iterations

## Work Item Details

### Epics (6)

1. **User Authentication & Authorization** (ID: 1)
   - Windows Authentication integration
   - Role-based access control

2. **Inventory Management System** (ID: 19)
   - Core inventory tracking
   - Display, filtering, sorting
   - Quantity management

3. **Audit & Reporting** (ID: 77)
   - Complete audit trail
   - Reporting capabilities

4. **Email Notification System** (ID: 102)
   - SMTP configuration
   - Low stock alerting

5. **Bulk Data Management** (ID: 124)
   - CSV upload functionality
   - Data validation

6. **Frontend Infrastructure** (ID: 154)
   - React application setup
   - API integration
   - Routing

7. **Backend Infrastructure** (ID: 203)
   - ASP.NET Core API
   - Database setup
   - Dependency injection

### Story Points Distribution

- **3 points:** Simple changes (8 stories)
- **5 points:** Small features (18 stories)
- **8 points:** Medium features (25 stories)
- **13 points:** Large features (10 stories)
- **21 points:** Complex features (1 story)

**Total Story Points:** ~470

### Remaining Work Hours for Tasks

- Most tasks: 2-8 hours
- Total estimated hours: ~880 hours

## Post-Import Configuration

### 1. Set Sprint Capacity

```
Recommended Sprint Capacity:
- 2 developers
- 2 weeks per sprint
- ~40 hours per developer per sprint
- Total capacity: ~80 hours per sprint
```

### 2. Prioritize Backlog

Review and adjust priorities:
- Priority 1: Critical features (Auth, Core Inventory)
- Priority 2: Important features (Audit, Email)

### 3. Create Sprint Plan

Suggested sprint breakdown (based on story points):

**Sprint 1-2: Foundation (90 points)**
- Backend Infrastructure
- Frontend Infrastructure
- Database Setup

**Sprint 3-4: Authentication (50 points)**
- User Authentication & Authorization
- Role-Based Access Control

**Sprint 5-7: Core Features (120 points)**
- Inventory Display & Navigation
- Inventory Quantity Management
- Basic CRUD operations

**Sprint 8-9: Audit & Notifications (80 points)**
- Audit History Tracking
- Email Notification System

**Sprint 10-11: Advanced Features (90 points)**
- CSV Upload
- Admin Panel
- Search & Filtering

**Sprint 12: Polish & Testing (40 points)**
- Bug fixes
- Performance optimization
- Final testing

### 4. Assign Work Items

1. Assign epics to Product Owner
2. Assign features to Team Leads
3. Assign user stories to team members
4. Let developers assign tasks to themselves

### 5. Configure Board Columns

Recommended Kanban board columns:
- New
- Active
- In Progress
- In Review
- Testing
- Done

## Updating Work Items

### Adding Acceptance Criteria

Some user stories may need expanded acceptance criteria. Format:

```
Given [context]
When [action]
Then [expected result]

Example:
Given I am a Service Desk user
When I click the Assign button
Then an assignment modal should open with quantity input field
```

### Adding Test Cases

Link test cases to user stories:
1. Create test cases for each user story
2. Link test cases using "Tests" link type
3. Track test execution results

### Linking to Code

As development progresses:
1. Link commits to work items in commit messages:
   ```
   git commit -m "Implement Windows auth #3"
   ```
2. Link pull requests to work items
3. Update work items when code is merged

## Reporting and Tracking

### Velocity Tracking

After a few sprints:
1. Go to **Analytics** > **Velocity**
2. Review completed story points per sprint
3. Adjust future sprint planning

### Burndown Charts

1. Go to **Boards** > **Sprints**
2. Select current sprint
3. View burndown chart
4. Monitor daily progress

### CFD (Cumulative Flow Diagram)

1. Go to **Boards** > **Analytics**
2. Select CFD
3. Monitor work item flow through states

## Troubleshooting Import Issues

### Issue: Parent IDs not linking correctly

**Solution:**
- Azure DevOps may not preserve ID numbers on import
- After import, manually re-link parent-child relationships
- Start with Epics → Features, then Features → Stories, then Stories → Tasks

### Issue: Acceptance Criteria not importing

**Solution:**
- Acceptance Criteria might import as Description text
- Manually move acceptance criteria to the correct field
- Or, use a script to update multiple items

### Issue: Story Points or Remaining Work not set

**Solution:**
- Verify column headers match exactly
- Re-import with corrected headers
- Or bulk update after import using Excel integration

### Issue: Work Item Types not recognized

**Solution:**
- Ensure project uses Agile process template
- If using different template, modify CSV work item types accordingly
- Scrum uses "Product Backlog Item" instead of "User Story"

## Excel Integration (Alternative Method)

If CSV import has issues, use Excel:

1. Open Azure DevOps
2. Go to **Boards** > **Backlogs**
3. Click **Open in Excel** (requires Azure DevOps Office Integration)
4. Copy data from CSV into Excel template
5. Publish back to Azure DevOps

## Additional Resources

- [Azure DevOps Work Item Import Documentation](https://docs.microsoft.com/en-us/azure/devops/boards/backlogs/office/bulk-add-modify-work-items-excel)
- [Agile Process Work Item Types](https://docs.microsoft.com/en-us/azure/devops/boards/work-items/guidance/agile-process)

## Support

For issues with import:
1. Check Azure DevOps Server logs
2. Verify CSV format matches expected schema
3. Contact Azure DevOps administrator
4. Open support ticket with Microsoft if needed

---

**Created for:** ITS Asset Tracker Project
**Target Platform:** Azure DevOps Server 2022 RC1
**Process Template:** Agile
**Total Work Items:** 240
