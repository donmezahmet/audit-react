# Audit Management System - Project Blueprint

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Page Details](#page-details)
   - [Dashboard (Home Page)](#1-dashboard-home-page)
   - [My Actions (Team Actions)](#2-my-actions-team-actions)
   - [Department Actions](#3-department-actions)
   - [C-Level Actions](#4-c-level-actions)
   - [All Findings Actions](#5-all-findings-actions)
   - [Annual Audit Plan](#6-annual-audit-plan)
   - [Audit Maturity](#7-audit-maturity)
   - [Other Pages](#other-pages)
4. [Common Features](#common-features)
5. [User Roles and Permissions](#user-roles-and-permissions)
6. [Interactive Features](#interactive-features)
7. [Technical Details](#technical-details)

---

## Overview

This project is a comprehensive web application for corporate audit management. The system is designed to manage audit findings, action plans, risk management, and audit maturity assessments in a centralized platform.

### System Purpose
- Tracking and management of audit findings
- Creation and monitoring of action plans
- Prioritization by risk levels
- Management of annual audit plans
- Audit maturity assessments
- Secure data management with role-based access control

### Technical Stack
- **Framework**: React 18 + TypeScript
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Chart.js
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Package Manager**: npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## System Architecture

### Project Structure
```
src/
├── components/          # UI components
│   ├── ui/            # Basic UI components (Button, Card, Input, etc.)
│   ├── charts/        # Chart components (PieChart, BarChart, RadarChart, etc.)
│   ├── layout/        # Layout components (Header, Sidebar, MainLayout)
│   └── dashboard/     # Dashboard-specific components
├── pages/              # Page components
├── services/           # API services and mock data
├── store/              # Zustand state management
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── config/             # Configuration files
```

### Data Flow
1. **API Layer**: API calls and mock data in `services/` folder
2. **State Management**: Zustand stores for global state
3. **Server State**: Server state management with React Query
4. **Component State**: Local state management with useState

### Path Aliases
```typescript
@/components/* → src/components/*
@/pages/* → src/pages/*
@/services/* → src/services/*
@/hooks/* → src/hooks/*
@/types/* → src/types/*
@/utils/* → src/utils/*
@/assets/* → src/assets/*
@/styles/* → src/styles/*
```

---

## Page Details

### 1. Dashboard (Home Page)

**Route**: `/`  
**Access**: `admin`, `team`, `team_manager`, `ceo`

#### 📊 Content

##### A. Key Metrics
- **4 Main Metric Cards** (Carousel on mobile):
  1. **Total Findings** - Total number of findings
  2. **Open Actions** - Number of open actions
  3. **Overdue Actions** - Number of overdue actions
  4. **Completion Rate** - Completion rate percentage

- **Interactive Features**:
  - Swipe navigation between cards on mobile
  - Each card is clickable and redirects to the relevant detail page

##### B. Scorecard Filter (Year Filter)
- **Location**: Top of page, top right corner
- **Options**:
  - `2024+` - Data from 2024 and later
  - `all` - All years
- **Effect**: Filters all charts and tables

##### C. View As Dropdown (For Admin)
- **Location**: Next to scorecard filter
- **Feature**: Admin users can switch to another user's view
- **Filtering**: `team`, `team_manager` roles

##### D. Charts

###### 1. **Finding Actions Status (Pie Chart)**
- **Data**: Distribution by action status
- **Statuses**: Open, Completed, Risk Accepted, Overdue
- **Colors**:
  - Open: Blue (`rgba(59, 130, 246, 0.8)`)
  - Completed: Green (`rgba(34, 197, 94, 0.8)`)
  - Risk Accepted: Purple (`rgba(147, 51, 234, 0.8)`)
  - Overdue: Red (`rgba(239, 68, 68, 0.8)`)
- **Interactive**:
  - Clicking on pie slices opens `ActionDetailsModal`
  - Modal lists all actions for that status
  - Scrollable list in modal
  - ESC key closes modal

###### 2. **Finding Actions by Lead and Status (Bar Chart)**
- **Data**: Action statuses by audit lead
- **Axes**:
  - X: Audit Lead names
  - Y: Action counts
- **Groups**: Status-based groups for each lead (Open, Completed, etc.)

###### 3. **Audit Findings by Year and Status (Bar Chart)**
- **Data**: Finding statuses by year
- **Axes**:
  - X: Years (2021-2025)
  - Y: Finding counts
- **Groups**: Status-based groups for each year
- **Features**:
  - Bar width optimized (narrow)
  - Legend at bottom, centered, not bold
  - Legend does not overlap with bars

###### 4. **Finding Actions Age Distribution (Bar Chart)**
- **Data**: Age distribution of actions
- **Groups**: 0-30 days, 31-60 days, 61-90 days, 90+ days
- **Colors**: Different colors by age range

###### 5. **Audit Maturity (Radar Chart)**
- **Data**: Audit maturity scores
- **Dimensions**: 11 different dimensions, grouped under 5 categories
- **Years**: Comparison of 2024 and 2025
- **Score Range**: 0-5
- **Features**:
  - Point labels hidden (numbers not visible)
  - Values shown in tooltip on hover
  - Format: "Dimension Name: Value / 5"
  - 2024 and 2025 values shown in different colors

###### 6. **Action Breakdown by Audit & Risk Level (Table)**
- **Data**: Action/finding distribution by audit and risk level
- **Columns**:
  - Audit Year
  - Audit Name
  - Critical (Actions/Findings)
  - High (Actions/Findings)
  - Medium (Actions/Findings)
  - Low (Actions/Findings)
  - Total (Actions/Findings)
- **Tab Modes**: 
  - `Actions` tab - Action counts
  - `Findings` tab - Finding counts
- **Interactive**:
  - Clicking numbers opens `ActionsListModal`
  - Modal shows filtered list by relevant audit, risk level, and mode
  - Scrollable in modal
  - ESC key closes

###### 7. **Finding Distribution by Risk Type and Risk Level (Table)**
- **Data**: Finding distribution by risk type and level
- **Columns**:
  - Risk Type
  - Critical, High, Medium, Low, Total

##### E. Control Analysis Section
- **Toggle Button**: "Show Control Analysis Charts" / "Hide Control Analysis Charts"
- **Features**:
  - Auto scroll when toggle is opened (200px offset)
  - Sticky toggle (stays fixed on scroll)
- **Charts** (Visible when toggle is opened):
  1. Fraud Impact Scorecards
  2. Loss Prevention Impact Scorecards
  3. Fraud Internal Control Chart
  4. Loss Prevention Summary Chart

##### F. All Charts Section
- **Toggle Button**: "See All Charts" / "Hide Charts"
- **Features**:
  - Auto scroll when toggle is opened (200px offset)
  - Sticky toggle
- **Charts** (Visible when toggle is opened):
  - Additional detail charts

##### G. Audit Plan Section
- **Toggle Button**: "Show Audit Plan" / "Hide Audit Plan"
- **Year Filter**: Year selection via dropdown
- **Features**:
  - Auto scroll when toggle is opened
  - Sticky toggle (on mobile)
  - Plan data filtered by year filter

##### H. Actions Modals
- **Overdue Actions Modal**: List of overdue actions
- **Upcoming Actions Modal**: List of upcoming actions
- **Features**:
  - Auto scroll when modal opens
  - ESC key closes
  - Scrollable list

##### I. Investigations Card
- **Location**: Bottom of page
- **Content**: Investigation counts and statuses

#### 📱 Mobile Features
- Responsive design
- Touch swipe for carousel navigation
- Charts optimized for mobile sizes
- Sticky toggle buttons

---

### 2. My Actions (Team Actions)

**Route**: `/my-actions`  
**Access**: `admin`, `team`, `team_manager`

#### 📊 Content

##### A. Header
- **Title**: "My Team Actions"
- **Description**: Varies by role
  - `team_manager`: "Actions managed by your team"
  - Others: "Actions from your manager's team"
- **View As Dropdown** (For Admin):
  - `team`, `team_manager` roles filtered

##### B. Scorecard Filter
- **Options**: `2024+`, `all`
- **Effect**: Filters table data

##### C. Stats Cards
- **Total Actions**: Total action count
- **Open**: Open action count
- **Overdue**: Overdue action count
- **Completed**: Completed action count
- **Financial Impact**: Total financial impact
- **Completion Rate**: Completion rate percentage

##### D. Actions Table
- **Columns**:
  - Key (Purple, monospace)
  - Summary
  - Description
  - Status (with Badge)
  - Audit
  - Due Date
  - Risk Level (with Badge)
  - Responsible
  - Actions (View/Edit buttons)
- **Features**:
  - **Resizable Columns**: Column widths can be adjusted
  - **Drag & Drop Reordering**: Column order can be changed
  - **Sorting**: Click column headers to sort
  - **Pagination**: 25, 50, 100 items per page options
  - **Search**: General search box
  - **Filters**:
    - Status Filter (Dropdown)
    - Audit Filter (Dropdown)
    - Risk Level Filter (Dropdown)
  - **Reset Filters**: Button to reset all filters
  - **Export**: Excel export button

##### E. Action Detail Modal
- **Trigger**: "View" button in table
- **Content**:
  - Key
  - Summary
  - Description
  - Status
  - Audit Name & Year
  - Due Date
  - Risk Level
  - Responsible
  - Financial Impact
- **Features**:
  - ESC key closes
  - Scrollable content

##### F. Expanded Row View (Mobile)
- **Trigger**: Click on row
- **Content**: All action details in expandable row

---

### 3. Department Actions

**Route**: `/department-actions`  
**Access**: `admin`, `department_director`, `action_operator`

#### 📊 Content

##### A. Header
- **Title**: "Department Actions"
- **Description**: Dynamic based on user's department
- **View As Dropdown** (For Admin):
  - Only `department_director` roles

##### B. Scorecard Filter
- **Options**: `2024+`, `all`
- **Visual**: Calendar icon

##### C. Status Distribution Chart (Donut Chart)
- **Data**: Status distribution of department actions
- **Colors**: Same as Dashboard (Open: Blue, Completed: Green, etc.)
- **Features**:
  - Tooltip on hover
  - Responsive design

##### D. Stats Cards
- **Total**: Total action count
- **Open**: Open action count
- **Overdue**: Overdue action count
- **Completed**: Completed action count
- **Financial Impact**: Financial impact
- **Completion Rate**: Completion rate

##### E. Actions Table
- **Columns**: Similar to My Actions
- **Features**:
  - Resizable columns
  - Drag & drop reordering
  - Sorting
  - Pagination
  - Search
  - Filters (Status, Audit, Risk Level)
  - Export

##### F. Action Detail Modal
- Same features as My Actions

---

### 4. C-Level Actions

**Route**: `/clevel-actions`  
**Access**: `admin`, `top_management`

#### 📊 Content

##### A. Header
- **Title**: "C-Level Actions"
- **Description**: "Executive-level audit finding actions overview"
- **View As Dropdown** (For Admin):
  - Only `top_management` roles

##### B. Scorecard Filter
- **Options**: `2024+`, `all`

##### C. Status Distribution Chart (Donut Chart)
- **Data**: Status distribution of C-Level actions
- **Features**: Similar to Department Actions

##### D. Stats Cards
- **Total**: Total action count
- **Open**: Open action count
- **Overdue**: Overdue action count
- **Completed**: Completed action count
- **Financial Impact**: Financial impact
- **Completion Rate**: Completion rate
- **Overdue Rate**: Overdue rate
- **Money Open**: Financial impact of open actions
- **Money Overdue**: Financial impact of overdue actions

##### E. Actions Table
- **Columns**: 
  - Key, Summary, Description, Status, Audit, Due Date, Risk Level, Responsible, C-Level, Actions
- **Features**: Same as other pages

##### F. Action Detail Modal
- Same features as other pages

---

### 5. All Findings Actions

**Route**: `/all-findings-actions`  
**Access**: `admin`, `team`, `team_manager`

#### 📊 Content

##### A. Header
- **Title**: "All Findings & Actions"
- **Description**: "Comprehensive view of all audit findings and actions"

##### B. Scorecard Filter
- **Options**: `2024+`, `all`

##### C. Report Chatbot
- **Location**: Top of page, right side
- **Features**:
  - Natural language filtering
  - Example: "Show me all overdue actions from Financial Audit"
  - Automatically parses and applies filters
  - Shows active filter badges
  - Remove filter feature

##### D. Dynamic Filters
- **Filter Menu**: "+ Add Filter" button
- **Filter Fields**:
  - Status
  - Audit Name
  - Audit Lead
  - Risk Level
  - Action Responsible
  - C-Level
- **Active Filters**: Selected filters shown as badges
- **Remove Filter**: X button on each badge

##### E. Actions Table
- **Columns**: 
  - Key, Summary, Description, Status, Audit, Due Date, Risk Level, Responsible, C-Level, Actions
- **Features**: 
  - Resizable columns
  - Drag & drop reordering
  - Sorting
  - Pagination
  - Search
  - Export
  - Dynamic filtering (chatbot + manual)

##### F. Action Detail Modal
- Same features as other pages

---

### 6. Annual Audit Plan

**Route**: `/annual-audit-plan`  
**Access**: `admin`

#### 📊 Content

##### A. Header
- **Title**: "Annual Audit Plan"
- **Description**: "Manage and track annual audit plans"

##### B. View Mode Toggle
- **Options**:
  1. **Progress View** (Default)
     - Visualization with progress chart
  2. **Kanban View**
     - Kanban board (To Do, In Progress, Completed, On Hold)
  3. **Calendar View**
     - Calendar view
     - With date filters

##### C. Year Filter
- **Dropdown**: Year selection
- **Effect**: Filters all views

##### D. Actions
- **Create Plan**: Button to create new plan
- **Bulk Upload**: Bulk upload via Excel
- **Export**: Excel export

##### E. Progress View
- **Chart**: Audit plan progress chart
- **Data**: Plan statuses by year
- **Interactive**: Chart elements are clickable

##### F. Kanban View
- **Columns**: 
  - To Do
  - In Progress
  - Completed
  - On Hold
- **Drag & Drop**: Cards can be moved between columns
- **Card Details**: 
  - Audit Name
  - Status
  - Lead
  - Dates
  - Risk Level

##### G. Calendar View
- **Calendar View**: Monthly calendar
- **Filters**:
  - Date Range
  - Audit Leads (Multi-select)
- **Events**: Plans shown on calendar
- **Interactive**: Clicking events opens detail modal

##### H. Audit Plan Form Modal
- **Trigger**: "Create Plan" or "Edit" button
- **Fields**:
  - Audit Name
  - Audit Year
  - Start Date
  - End Date
  - Audit Lead
  - Status
  - Risk Level
  - Description
- **Features**:
  - Validation
  - ESC key closes
  - Save/Cancel buttons

##### I. Audit Plan Detail Modal
- **Trigger**: Click on plan card/event
- **Content**: Plan details
- **Actions**: Edit, Delete, Status Change

##### J. Bulk Upload Modal
- **Trigger**: "Bulk Upload" button
- **Features**:
  - Excel file upload
  - Preview
  - Validation
  - Error handling
  - Upload progress

---

### 7. Audit Maturity

**Route**: `/audit-maturity`  
**Access**: `admin`

#### 📊 Content

##### A. Header
- **Title**: "Audit Maturity Assessment"
- **Description**: "Track audit maturity scores and progress"

##### B. MAT Scores Table
- **Data Source**: Jira MAT project
- **Columns**:
  - Object (Audit object)
  - Score (0-5 score)
  - Status
- **Color Coding**:
  - Score >= 4: Green
  - Score >= 3: Blue
  - Score >= 2: Yellow
  - Score < 2: Red

##### C. Google Sheets Data Table
- **Data Source**: Google Sheets integration
- **Dynamic Columns**: Based on sheet columns
- **Features**: 
  - Hover effects
  - Responsive

##### D. Maturity Overview
- **Chart**: Maturity scores visualization
- **Trend Analysis**: Changes over time

---

## Other Pages

### Access Management
**Route**: `/access-management`  
**Access**: `admin`  
**Content**: User and role management

### Risk Management
**Route**: `/risk-management`  
**Access**: `admin`  
**Content**: Risk assessment and tracking

### Audit Finding
**Route**: `/audit-findings`  
**Access**: `admin`  
**Content**: Audit findings management

### Audit Universe
**Route**: `/audit-universe`  
**Access**: `admin`  
**Content**: Audit universe management

### Task Manager
**Route**: `/tasks`  
**Access**: `admin`, `team`, `team_manager`  
**Content**: Task management system

---

## Common Features

### 1. View As (Impersonation)

#### Overview
The View As feature allows admin users to switch to another user's view. This feature is used for support and control purposes.

#### Who Can Use It
- **Only `admin` role** can use the View As feature
- Other roles cannot see this feature

#### How It Works

**1. User Selection**
- Admin clicks the View As dropdown button
- Dropdown opens and shows filtered user list
- Different roles are filtered on each page:
  - **Dashboard**: `team`, `team_manager` roles
  - **My Actions**: `team`, `team_manager` roles
  - **Department Actions**: `department_director` roles
  - **C-Level Actions**: `top_management` roles
- Search can be performed in dropdown (by email or name)

**2. Starting Impersonation**
- Admin selects a user from the list
- System calls `authService.viewAsUser()` function
- Selected user's information is retrieved via `userService.getAccessManagementUsers()`
- User information is saved to `localStorage` with `impersonated_user` key
- Original user information is preserved with `mock_user` key

**3. Page Reload**
- After successful impersonation, page is automatically reloaded
- `authService.getCurrentUser()` function checks `impersonated_user` key
- If `impersonated_user` exists, that user's information is returned
- `isImpersonating: true` and `originalUser` information are set

**4. Data Filtering**
- After page reload, all data fetching functions use the impersonated user's email
- Example: `getDepartmentFindingActions({ userEmail: impersonatedUser.email })`
- All charts, tables, and lists show data filtered by the selected user

**5. UI Indicators**
- "Viewing as [User Name]" message shown in header
- Selected user is marked in View As dropdown
- "Stop Impersonation" button becomes visible

**6. Stopping Impersonation**
- "Stop Impersonation" button is clicked
- `authService.stopImpersonation()` function is called
- `impersonated_user` key is removed from `localStorage`
- Page is reloaded again
- Original user's data is restored

#### Technical Details

**localStorage Structure:**
```javascript
// Before impersonation
localStorage.setItem('mock_user', JSON.stringify(originalUser))

// During impersonation
localStorage.setItem('impersonated_user', JSON.stringify(impersonatedUser))
localStorage.setItem('mock_user', JSON.stringify(originalUser)) // Preserved

// After impersonation
localStorage.removeItem('impersonated_user')
```

**Auth Store State:**
```typescript
{
  user: impersonatedUser,        // Selected user
  role: impersonatedUser.role,   // Selected user's role
  isImpersonating: true,         // Impersonation status
  originalUser: originalUser    // Original admin user
}
```

**Data Filtering Logic:**
```typescript
// Department Actions example
const { data: actions } = useDepartmentFindingActions({
  auditYear: scorecardFilter,
  userEmail: (role === 'admin' && !isImpersonating) 
    ? undefined  // Admin and not impersonating, show all data
    : user?.email  // Impersonating, use selected user's email
});
```

#### Security Notes
- Only admin role can use this feature
- Impersonation status is checked on every page load
- Original user information is always preserved
- Both `mock_user` and `impersonated_user` are cleared on logout

### 2. Scorecard Filter
- **All Pages**: Year-based filtering
- **Options**: `2024+`, `all`
- **Effect**: Filters chart and table data

### 3. Resizable Columns
- **Feature**: Table column widths can be adjusted
- **Storage**: Saved to localStorage
- **Usage**: Drag from column edge

### 4. Drag & Drop Column Reordering
- **Feature**: Column order can be changed
- **Storage**: Saved to localStorage
- **Usage**: Drag from column header

### 5. Sorting
- **Feature**: Click column headers to sort
- **States**: Ascending, Descending, None
- **Visual**: Shown with arrow icons

### 6. Pagination
- **Options**: 25, 50, 100 items per page
- **Navigation**: Previous, Next, Page numbers
- **Indicator**: "Showing X to Y of Z items"

### 7. Search
- **Feature**: General search box
- **Scope**: Search across all columns
- **Real-time**: Filters as you type

### 8. Filters
- **Types**: Status, Audit, Risk Level, etc.
- **Visual**: Dropdowns
- **Reset**: Button to reset all filters
- **Active Filters**: Shown as badges

### 9. Export
- **Format**: Excel (.xlsx)
- **Content**: Filtered table data
- **Loading**: Loading shown during export

### 10. Modals
- **Closing**: 
  - X button
  - ESC key
  - Outside click (in some modals)
- **Scroll**: Modal content is scrollable
- **Responsive**: Full screen on mobile

### 11. Auto Scroll
- **Usage**: 
  - Scroll to relevant section when toggle is opened
  - Scroll to modal when modal opens
- **Offset**: 200px for header

### 12. Sticky Elements
- **Toggle Buttons**: Stay fixed on scroll
- **Header**: Fixed header
- **Mobile**: Sticky toggles on mobile

---

## User Roles and Permissions

### Admin
- **Access to All Pages**: ✅
- **View As**: ✅ (All roles)
- **CRUD Operations**: ✅
- **Export**: ✅
- **Filter Management**: ✅

### Team Manager
- **Access**:
  - Dashboard ✅
  - My Actions ✅
  - All Findings Actions ✅
  - Task Manager ✅
- **View As**: ❌
- **CRUD**: Limited (own team)
- **Export**: ✅

### Team
- **Access**:
  - Dashboard ✅
  - My Actions ✅
  - All Findings Actions ✅
  - Task Manager ✅
- **View As**: ❌
- **CRUD**: Limited (own actions)
- **Export**: ✅

### Department Director
- **Access**:
  - Department Actions ✅
- **View As**: ❌
- **CRUD**: Limited (own department)
- **Export**: ✅

### Top Management
- **Access**:
  - C-Level Actions ✅
- **View As**: ❌
- **CRUD**: Limited (own actions)
- **Export**: ✅

### CEO
- **Access**:
  - Dashboard ✅
- **View As**: ❌
- **CRUD**: ❌
- **Export**: ✅

---

## Interactive Features

### 1. Chart Interactions

#### Pie Chart (Finding Actions Status)
- **Click**: Clicking pie slice opens modal
- **Hover**: Tooltip shown
- **Modal**: ActionDetailsModal opens, lists actions for that status

#### Bar Chart (Audit Findings by Year)
- **Hover**: Tooltip shown
- **Legend**: At bottom, clickable (show/hide series)

#### Radar Chart (Audit Maturity)
- **Hover**: Tooltip shown (format: "Dimension: Value / 5")
- **Point Labels**: Hidden (only visible on hover)
- **Multiple Datasets**: Comparison of 2024 and 2025

#### Donut Chart (Status Distribution)
- **Hover**: Tooltip shown
- **Click**: (Modal can be opened in future)

### 2. Table Interactions

#### Cell Click (Action Breakdown Table)
- **Click**: Clicking numbers opens modal
- **Modal**: ActionsListModal opens
- **Filtering**: Modal shows filtered list by relevant audit, risk level, and mode

#### Row Click
- **Desktop**: "View" button opens modal
- **Mobile**: Clicking row opens expandable row

#### Column Header Click
- **Sort**: Sort toggles (asc → desc → none)
- **Drag**: Change column order
- **Resize**: Adjust column width

### 3. Filter Interactions

#### Dropdown Filters
- **Click**: Dropdown opens
- **Select**: Selection applies filter
- **Clear**: "All" option removes filter

#### Search Filter
- **Type**: Real-time filtering
- **Clear**: Clear with X button

#### Active Filters
- **Badge Display**: Selected filters shown as badges
- **Remove**: Remove with X button

### 4. Modal Interactions

#### Opening
- **Trigger**: Button, chart element, table cell
- **Animation**: Fade in
- **Focus**: Automatic focus on modal
- **Scroll Lock**: Body scroll locked

#### Closing
- **X Button**: Top right corner
- **ESC Key**: Keyboard shortcut
- **Outside Click**: (In some modals)
- **Animation**: Fade out

#### Content
- **Scroll**: Content is scrollable
- **Responsive**: Full screen on mobile

### 5. Toggle Interactions

#### Show/Hide Charts
- **Click**: Toggle button
- **Animation**: Smooth scroll
- **Sticky**: Stays fixed on scroll
- **State**: Saved to localStorage (in some cases)

### 6. View Mode Toggle (Annual Audit Plan)
- **Click**: View mode changes
- **Modes**: Progress, Kanban, Calendar
- **State**: Selected mode saved to localStorage

### 7. Kanban Interactions
- **Drag & Drop**: Cards can be moved between columns
- **Card Click**: Detail modal opens
- **Status Update**: Status updated via drag

### 8. Calendar Interactions
- **Date Click**: Clicking date shows event details
- **Event Click**: Clicking event opens modal
- **Date Range Filter**: Date range selection
- **Lead Filter**: Multi-select dropdown

### 9. Export Interactions
- **Click**: Export button
- **Loading**: Loading shown during export
- **Download**: Excel file downloaded
- **Error Handling**: Message shown on error

### 10. View As Interactions

#### Dropdown Open/Close
- **Trigger**: Click "View As" button
- **Content**: Filtered user list (by role)
- **Search**: Real-time search in dropdown (by email or name)
- **Close**: Click outside or ESC key

#### User Selection
- **Click**: Click user in list
- **Loading**: Loading shown during selection
- **Success**: Page reloads on success
- **Error**: Message shown on error

#### Impersonation Status
- **Indicator**: "Viewing as [User Name]" message in header
- **Dropdown**: Selected user is marked
- **Stop Button**: "Stop Impersonation" button visible

#### Stopping Impersonation
- **Trigger**: Click "Stop Impersonation" button
- **Action**: `localStorage` cleared, page reloads
- **Result**: Returns to original user's view

---

## Technical Details

### State Management
- **Zustand**: Auth store, UI store
- **React Query**: Server state, caching
- **Local State**: useState hooks

### Data Fetching
- **React Query**: useQuery, useMutation
- **Custom Hooks**: useDepartmentFindingActions, useCLevelFindingActions, etc.
- **Caching**: 2 minutes stale time

### Performance Optimizations
- **useMemo**: Computed values
- **useCallback**: Function memoization
- **React.memo**: Component memoization
- **Lazy Loading**: Route-based code splitting

### Responsive Design
- **Breakpoints**: 
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Mobile Features**:
  - Touch swipe
  - Carousel navigation
  - Expandable rows
  - Full-screen modals

### Accessibility
- **Keyboard Navigation**: Tab, Enter, ESC
- **ARIA Labels**: Screen reader support
- **Focus Management**: Modal focus trap
- **Color Contrast**: WCAG AA compliant

---

## Conclusion

This documentation covers all features, interactive elements, and user flows of the project. System architecture, user roles, page structures, and technical details are explained in detail in this document.
