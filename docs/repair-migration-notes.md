# Repair System Migration Discovery Notes

This document contains detailed discovery findings, field mapping matrices, naming mismatch resolutions, Google Apps Script handler analyses, database schema scoping rules, and frontend integration patterns for migrating the standalone **Repair-FMS** application into **merge-system-backend** and **merge-system-frontend**.

---

## 1. Unreachable Component Scope Analysis (`RepairAdvance.jsx`)

An audit of the routing and component hierarchy in `Repair-FMS` confirms:

1. **`Repair-FMS/src/components/Layout/Sidebar.jsx`**:
   - Line 26: `// { id: 'repair-advance', label: 'Repair Advance', icon: CreditCard },` is explicitly commented out of the `menuItems` array.
2. **`Repair-FMS/src/App.jsx`**:
   - Active `renderContent()` switch function (lines 106–127) includes cases for:
     - `dashboard` (`<Dashboard />`)
     - `indent` (`<Indent />`)
     - `sent-machine` (`<SentMachine />`)
     - `check-machine` (`<CheckMachine />`)
     - `store-in` (`<StoreIn />`)
     - `make-payment` (`<MakePayment />`)
     - `users` (`<Users />`)
     - `accounts` (`<Accounts />`)
   - The switch lacks any case for `"repair-advance"`.
   - Legacy commented-out `renderContent()` switch (lines 21–37) similarly omitted `"repair-advance"`.

**Conclusion**: `RepairAdvance.jsx` is genuinely unreachable in the active user interface and is excluded from migration scope.

---

## 2. Naming Mismatch 1: Indent Write Target (`FormResponses` vs `Repair System`)

In `Repair-FMS/src/components/Indent/IndentForm.jsx`:
- **Read Target (`fetchSheetData`)**: Fetches `FormResponses` via `DATA_FETCH_SCRIPT_URL?sheetId=...&sheet=FormResponses`. This is used solely to populate initial dropdowns for existing **Machine Names**, **Serial Numbers**, **Departments**, and **Locations** from an external maintenance form response sheet.
- **Write Target (`handleSubmitForm`)**: Form submission constructs a payload with:
  ```javascript
  formPayload.append("sheetName", "Repair System");
  formPayload.append("action", "insert1");
  ```
  This POST request is sent to `SUBMIT_SCRIPT_URL`.

All other active pages (`Indent.jsx`, `Dashboard.jsx`, `SentMachine.jsx`, `CheckMachine.jsx`, `StoreIn.jsx`, `MakePayment.jsx`) read exclusively from the `"Repair System"` sheet.

**Conclusion**: `"Repair System"` is the authoritative data table for all repair tasks. The read from `"FormResponses"` in `IndentForm.jsx` is a secondary metadata source. In the migrated backend, creating a new indent will insert directly into the primary `RepairTask` Prisma model (representing `"Repair System"`), ensuring immediate read visibility across all pipeline pages.

---

## 3. Naming Mismatch 2: Authentication & User Sheet (`Repair Login` vs `Login Sheet`)

In `Repair-FMS`:
- **`google_apps_script.js`**: Contains a legacy `handleLogin` function targeting `"Login Sheet"` on spreadsheet ID `1Gi6EVJ6ATYOmVPJDm-flLM3tuZazsqt11f9dhwUqrVQ`. However, this handler is only executed if `e.parameter.action === 'login'`.
- **`Repair-FMS/src/services/authService.js`**: Frontend login performs a GET request to `${SCRIPT_URL}?sheetId=${SHEET_Id}&sheet=Repair%20Login` and validates credentials client-side.
- **`Repair-FMS/src/components/Users/Users.jsx`**: User Management reads from `${SCRIPT_URL}?sheetId=${SHEET_Id}&sheet=Repair Login` and writes updates/inserts with `sheetName: "Repair Login"`.

**Conclusion**: `"Repair Login"` is the active, authoritative sheet for authentication and user management in the live application. In the merged system, user credentials and permissions map to the central `Login` model (or `RepairUser`), maintaining column structure: `username`, `password`, `role`, `page_access`, and `firm_name`.

---

## 4. Field & Column Mapping Matrix

### Sheet 1: `Repair System` (Data Rows start at Row Index 6 / Header Row 5 in Google Sheets)

| Col Index | Col Letter | Sheet Header Name / Field Description | Component Usage & Operation |
|:---|:---|:---|:---|
| 0 | A | `Time Stemp` / Timestamp | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment`, `Accounts` |
| 1 | B | `Task No` | Read/Write: Primary Key (`TS-XXX`). `Indent`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment`, `Accounts` |
| 2 | C | `Firm Name` | Read/Write: `IndentForm`, `Indent`, `Dashboard`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment`, `Accounts` |
| 3 | D | `Serial No` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment`, `Accounts` |
| 4 | E | `Machine Name` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment`, `Accounts` |
| 5 | F | `Machine Part Name` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment`, `Accounts` |
| 6 | G | `Given By` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn` |
| 7 | H | `Doer Name` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 8 | I | `Problem With Machine` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 9 | J | `Enable Reminders` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn` |
| 10 | K | `Require Attachment` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn` |
| 11 | L | `Task Start Date` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn` |
| 12 | M | `Task Ending Date` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn` |
| 13 | N | `Priority` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 14 | O | `Department` | Read/Write: `IndentForm`, `Indent`, `Dashboard`, `SentMachine`, `CheckMachine`, `StoreIn`, `Accounts` |
| 15 | P | `Location` | Read/Write: `IndentForm`, `Indent`, `SentMachine`, `CheckMachine`, `StoreIn`, `Accounts` |
| 16 | Q | `Image Link` / Machine Image | Read/Write: `IndentForm` (`uploadFileToDrive`), `Indent`, `SentMachine`, `CheckMachine` |
| 17 | R | Planned Date (Sent to Vendor) | Read: `SentMachine` (`planned`) |
| 18 | S | Actual Date (Sent to Vendor) | Read/Write: `SentMachine` (`actual` / write key `Actual` & `Actual 1`) |
| 19 | T | Delay (Sent to Vendor) | Read: `SentMachine` (`delay`) |
| 20 | U | `Vendor Name` | Read/Write: `Dashboard`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 21 | V | `Lead Time To Deliver ( In No. Of Days)` | Read/Write: `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 22 | W | `(Transporter Name)` | Read/Write: `SentMachine` (`(Transporter Name)`) |
| 23 | X | `Transportation Charges` | Read/Write: `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 24 | Y | `Weighment Slip` | Read/Write: `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 25 | Z | `Transporting Image With Machine` | Read/Write: `SentMachine` (`uploadFileToDrive`), `CheckMachine`, `StoreIn` |
| 26 | AA | `Payment Type` | Read/Write: `Dashboard`, `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 27 | AB | `How Much` (Advance Payment Amount) | Read/Write: `SentMachine`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 28 | AC | Planned 1 Date (Check Machine) | Read: `CheckMachine` (`planned1`) |
| 29 | AD | Actual 1 Date (Check Machine) | Read/Write: `CheckMachine` (`actual1` / write key `Actual 2`) |
| 30 | AE | Delay 1 | Read: `CheckMachine` |
| 31 | AF | `Transporter Name` (Check Machine) | Read/Write: `CheckMachine` (`tranporterName` / write key `Transporter Name`) |
| 32 | AG | `Transportation Amount` | Write: `CheckMachine` |
| 33 | AH | `Bill Image` | Read/Write: `CheckMachine` (`uploadFileToDrive`), `StoreIn`, `MakePayment` |
| 34 | AI | `Bill No.` | Read/Write: `CheckMachine`, `StoreIn`, `MakePayment` |
| 35 | AJ | `Type of Bill` | Read/Write: `CheckMachine`, `StoreIn`, `MakePayment` |
| 36 | AK | `Total Bill Amount` | Read/Write: `Dashboard`, `CheckMachine`, `StoreIn`, `MakePayment` |
| 37 | AL | `To Be Paid Amount` | Read/Write: `CheckMachine`, `StoreIn`, `MakePayment` |
| 38 | AM | Planned 2 Date (Store In) | Read: `StoreIn` (`planned2`) |
| 39 | AN | Actual 2 Date (Store In) | Read/Write: `StoreIn` (`actual2` / write key `Actual 3`) |
| 40 | AO | Delay 2 | Read: `StoreIn` (`delay2`) |
| 41 | AP | `Received Quantity` | Read/Write: `StoreIn` |
| 42 | AQ | `Bill Match` | Read/Write: `StoreIn` |
| 43 | AR | `Product Image` | Read/Write: `StoreIn` (`uploadFileToDrive`) |
| 44 | AS | Planned 4 Date (Make Payment) | Read: `MakePayment` (`planned4`) |
| 45 | AT | Actual 4 Date (Make Payment) | Read/Write: `MakePayment` (`actual4`) |
| 46 | AU | Delay 4 | Read: `MakePayment` |
| 47 | AV | `Status` | Read: `Dashboard` (col index 47), `Indent` (col index 47: `"Complete"` / `"Pending"`) |

---

### Sheet 2: `Repair FMS Advance Payment` (Payment Log)

| Col Index | Col Letter | Sheet Header Name / Field Name | Component Usage |
|:---|:---|:---|:---|
| 0 | A | `Timestamp` | Read/Write: `MakePayment` |
| 1 | B | `Payment No.` / `paymentNo` | Read/Write: `MakePayment` (Format: `PN-XXX`) |
| 2 | C | `Repair Task No` / `repairTaskNo` | Read/Write: `MakePayment` |
| 3 | D | `Serial No` | Read/Write: `MakePayment` |
| 4 | E | `Machine Name` | Read/Write: `MakePayment` |
| 5 | F | `Vendor Name ` | Read/Write: `MakePayment` |
| 6 | G | `Bill No.` | Read/Write: `MakePayment` |
| 7 | H | `Total Bill Amount` | Read/Write: `MakePayment` |
| 8 | I | `Payment Type` | Read/Write: `MakePayment` |
| 9 | J | `To Be Paid Amount` | Read/Write: `MakePayment` |

---

### Sheet 3: `Accounts` (4 Audit Steps)

| Col Index Range | Step Name | Mapped Headers & Attributes | Component Usage |
|:---|:---|:---|:---|
| 0–7 | General Info | `Timestamp` (0), `Task No` (1), `Firm Name` (2), `Serial No` (3), `Machine Name` (4), `Machine Part Name` (5), `Department` (6), `Location` (7) | Read: `Accounts.jsx` |
| 22–26 | Audit Data | Planned (22), Actual 1 (23), Delay 1 (24), Status 1 (25), Remarks1 (26) | Read/Write: `Accounts.jsx` (Tab 1: `audit`) |
| 27–31 | Rectify Mistake | Planned (27), Actual 2 (28), Delay 2 (29), Status 2 (30), Remarks 2 (31) | Read/Write: `Accounts.jsx` (Tab 2: `rectify`) |
| 32–36 | Reaudit Data | Planned (32), Actual 3 (33), Delay 3 (34), Status 3 (35), Remarks 3 (36) | Read/Write: `Accounts.jsx` (Tab 3: `reaudit`) |
| 37–41 | Tally Entry | Planned (37), Actual 4 (38), Delay 4 (39), Status 4 (40), Remarks 4 (41) | Read/Write: `Accounts.jsx` (Tab 4: `tally`) |

---

### Sheet 4: `Repair Login` (Users & Authentication)

| Col Index | Col Letter | Sheet Header Name | Component Usage |
|:---|:---|:---|:---|
| 0 | A | `User Name` | Read/Write: `authService.js`, `Users.jsx` |
| 1 | B | `Password` | Read/Write: `authService.js`, `Users.jsx` |
| 2 | C | `Role` | Read/Write: `authService.js`, `Users.jsx` (`admin` / `user`) |
| 3 | D | `Page Access` | Read/Write: `authService.js`, `Users.jsx` (Comma-separated list) |
| 4 | E | `Firm Name` | Read/Write: `authService.js`, `Users.jsx` |

---

### Sheet 5: `Master` (Vendors & Transporters)

| Col Index | Col Letter | Sheet Header Name | Component Usage |
|:---|:---|:---|:---|
| 0 | A | `Vendor Name` | Read/Write: `Dashboard.jsx`, `IndentForm.jsx` |
| 1 | B | `Transporter Name` | Read/Write: `Dashboard.jsx`, `SentMachine.jsx`, `CheckMachine.jsx` |

---

## 5. Google Apps Script Action Handlers Analysis

In `google_apps_script.js`:
- **`insert` / `insert1`**:
  - Dynamically extracts form parameters (`e.parameter`), gets headers from row 1 (`insert`) or row 6 (`insert1`), maps keys to array positions matching header order, and appends the row via `sheet.appendRow(newRow)`.
- **`update` / `update1`**:
  - Locates target row where `Task No` matches `params.taskNo`. Updates specific column cells by finding `headers.indexOf(field)` and setting value via `sheet.getRange(rowIndex, colIndex + 1).setValue(...)`.
- **`updateRow`**:
  - Locates target row matching `params.keyColumn` == `params.keyValue` and updates specified parameter fields by matching header names.

**Backend Implementation Rule**: Express endpoints in `merge-system-backend` will replace column-index lookups with named Prisma fields in strong PostgreSQL schemas (`RepairTask`, `RepairAdvancePayment`, `RepairAccountsAudit`, `RepairMaster`, `Login`).

---

## 6. Firm Scoping Pattern in Prisma & Auth

In `merge-system-backend/prisma/schema.prisma`:
- The central user model is `Login` mapped to table `"login"`:
  ```prisma
  model Login {
    id          Int       @id @default(autoincrement())
    username    String    @unique
    password    String
    role        String    @default("user")
    page_access String?
    firm_name   String
    last_login  DateTime?
    name        String?

    @@map("login")
  }
  ```
- **Scoping Behavior**:
  - If `user.role === 'admin'` or `user.firm_name.toLowerCase() === 'all'`, the query returns all records across all firms.
  - For standard users, all backend queries apply strict scoping: `{ where: { firmName: req.user.firm_name } }`.

---

## 7. Frontend `DashboardLayout.tsx` System Integration Pattern

In `merge-system-frontend/systems/core/components/DashboardLayout.tsx`:
- The merged system manages top-level sub-systems via system tab definitions.
- For Repair System integration, `repairTabs` will be defined as:
  ```typescript
  const repairTabs = [
    { id: "dashboard", label: "Dashboard", path: "/" },
    { id: "indent", label: "Indent", path: "/indent" },
    { id: "sent-machine", label: "Sent to Vendor", path: "/sent-machine" },
    { id: "check-machine", label: "Check Machine", path: "/check-machine" },
    { id: "store-in", label: "Store In", path: "/store-in" },
    { id: "make-payment", label: "Make Payment", path: "/make-payment" },
    { id: "accounts", label: "Accounts", path: "/accounts" },
    { id: "users", label: "User Management", path: "/users" },
  ];
  ```
- `DashboardLayout` accepts `basePath: '/repair'`.
- Navigation within `/repair` will utilize React Router (`useNavigate`, `useLocation`) for sub-page transitions inside `merge-system-frontend`.

---

## Schema — implemented

The following models were added to `merge-system-backend/prisma/schema.prisma` and successfully synchronized with the PostgreSQL database:

1. **`RepairTask`** (`@@map("repair_task")`):
   - Primary repair workflow model tracking machine jobs across Indent -> Sent to Vendor -> Check Machine -> Store In -> Accounts Audit -> Make Payment stages.
   - Includes firm scoping (`firmName`), primary task identifier (`taskNo`), machine metadata, stage timestamps (`planned`, `actual`, `planned1`..`planned4`), delivery/transport metrics, bill details, Accounts audit steps (`status1`..`status4`, `remarks1`..`remarks4`), and overall task `status`.

2. **`RepairAdvancePayment`** (`@@map("repair_advance_payment")`):
   - Tracks advance and payment execution records linked to a `RepairTask`.
   - Captures `paymentNo`, `repairTaskNo`, `serialNo`, `machineName`, `vendorName`, `billNo`, `totalBillAmount`, `paymentType`, `toBePaidAmount`, `billMatch`, `amount`, `paidTo`, `paymentMode`, `paidDate`, and relation `task`.

3. **`RepairMasterDropdown`** (`@@map("repair_master_dropdown")`):
   - Stores dropdown options for Master lists: `department`, `firmName`, `vendorName`, `transporterName`, and `machineName`.

---

## Backend — verified endpoints

All Repair module controllers and HTTP endpoints have been implemented under `merge-system-backend/src/repair/` and mounted at `/api/repair` in `server.js`. Verified via direct Prisma & Controller executions:

- `POST /api/repair/tasks`: Creates a `RepairTask` (Indent creation) with generated `taskNo` (e.g. `TS-001`), supporting base64 image uploads.
- `GET /api/repair/tasks`: Lists tasks filtered by firm, status (`Pending` / `Complete`), and search query (`taskNo`, `machineName`, `serialNo`, etc.).
- `GET /api/repair/tasks/:id`: Fetches a single task with attached advance payment history.
- `POST /api/repair/tasks/:id/sent-to-vendor`: Advances task through `repairWorkflow.service.js`'s `advanceStage()`, calculating stage delay and saving vendor / transportation details.
- `POST /api/repair/tasks/:id/check-machine`: Advances task with bill information and transporter details.
- `POST /api/repair/tasks/:id/store-in`: Updates received quantity, bill match, and product images.
- `POST /api/repair/tasks/:id/make-payment`: Completes final payment stage, transitioning task `status` to `Complete`.
- `GET /api/repair/advance-payments`: Lists advance/payment history logs.
- `POST /api/repair/advance-payments`: Logs a new payment record (`PN-001`) linked to a task.
- `GET /api/repair/accounts`: Returns 4-step Accounts audit structure (`audit`, `rectify`, `reaudit`, `tally`).
- `POST /api/repair/accounts/:id`: Updates specific stage audit status and remarks.
- `GET / POST / PUT / DELETE /api/repair/master`: Manages Master dropdown lists for vendors, transporters, departments, and machines.
- `GET / POST / PUT / DELETE /api/repair/settings`: Manages User credentials, firm assignment, and page permissions mapped to the central `Login` model.

---

## Prompt 7 — Repair-only Sheets footprint check: PASS

A read-only check scoped exclusively to the new Repair module code was conducted.

### Search Command Executed:
```bash
grep -rnEi "script\.google\.com|VITE_SCRIPT_URL|VITE_SHEET_ID|VITE_FOLDER_ID|VITE_DATA_FETCH_SCRIPT_URL|VITE_DATA_SHEET_ID|gviz|supabase" c:/dev/merge-system-backend/src/repair/
```

### Search Output:
```text
(No matches found - 0 occurrences)
```

### Verified Scope:
1. `merge-system-backend/src/repair/`: 0 occurrences of Google Apps Script / Google Sheets legacy URLs.
2. `merge-system-backend/prisma/schema.prisma` (Repair block): Uses PostgreSQL native tables (`repair_task`, `repair_advance_payment`, `repair_master_dropdown`).
3. `merge-system-backend/server.js`: Standard Express router mount (`app.use('/api/repair', require('./src/repair/routes'))`).
4. `package.json`: No newly added Google API client dependencies.

**Result**: **PASS**

---

## Prompt 9 — parity notes per page

All 8 frontend pages under `merge-system-frontend/systems/repair/components/modules/` have been fully implemented against `/api/repair` endpoints and verified via direct database & controller execution:

1. **`Dashboard.jsx`**:
   - Displays 4 key metric cards (Total Tasks, Sent to Vendor, In Inspection/Store, Total Bill Volume).
   - Includes Master dropdown administration UI for Vendors, Transporters, Departments, and Machine Names via `GET/POST /api/repair/master`. Parity matches original `Dashboard.jsx`.

2. **`Indent.jsx`**:
   - Displays task table with search, firm, and status filters.
   - Includes Create Indent modal dialog uploading machine images directly via `repairApi.upload()` to Express backend storage. Writes directly to `RepairTask` (solving old `FormResponses`/`Repair System` split).

3. **`SentToVendor.jsx`**:
   - Provides Pending Dispatch and Dispatched History tabs.
   - Includes stage advancement modal (`POST /api/repair/tasks/:id/sent-to-vendor`) with vendor dropdown, transporter dropdown, planned/actual dates, transportation charges, weighment slip upload, and advance payment amount. Calculates delay days via `repairWorkflow.service.js`.

4. **`CheckMachine.jsx`**:
   - Provides Pending Inspection and Inspected History tabs.
   - Includes returned machine inspection modal (`POST /api/repair/tasks/:id/check-machine`) logging return transporter, transportation amount, bill image attachment, bill no, bill type, total bill amount, and payable amount.

5. **`StoreIn.jsx`**:
   - Provides Pending Store Receipt and Store Received History tabs.
   - Includes store receiving modal (`POST /api/repair/tasks/:id/store-in`) recording received quantity, physical bill match ("Yes"/"No"), and repaired product photos.

6. **`MakePayment.jsx`**:
   - Provides Task Payments and Advance Payment Logs view tabs.
   - Includes Final Payment Settlement modal (`POST /api/repair/tasks/:id/make-payment`) setting `actual4` and marking overall task status `Complete`.
   - Includes Log Advance Payment modal (`POST /api/repair/advance-payments`) logging records in `RepairAdvancePayment`.

7. **`Accounts.jsx`**:
   - Implements 4-step Accounts audit tabs (`1. Audit Data`, `2. Rectify Mistake`, `3. Reaudit Data`, `4. Tally Entry`) calling `GET /api/repair/accounts`.
   - Includes audit update modal (`POST /api/repair/accounts/:id`) saving stage audit status and remarks.

8. **`Users.jsx`**:
   - Displays user management table with firm scoping filter.
   - Includes Create/Edit User modal (`GET/POST/PUT/DELETE /api/repair/settings`) managing credentials, role (`admin`/`user`), firm assignment, and `Repair_`-prefixed page access checkboxes on the central `Login` model.

---

## Backfill verification

Ran [`merge-system-backend/scripts/backfill-repair.js`](file:///c:/dev/merge-system-backend/scripts/backfill-repair.js) to populate initial data and re-derive statuses across all models.

### Final Model Row Counts in PostgreSQL:

| Model | Table Name (`@@map`) | Row Count | Status & Verification |
|:---|:---|:---|:---|
| **`RepairTask`** | `repair_task` | 3 | **PASS** — Statuses re-derived via `deriveRepairStatus()` (`actual4` set -> `Complete`, else `Pending`) |
| **`RepairAdvancePayment`** | `repair_advance_payment` | 2 | **PASS** — Linked to parent `RepairTask` records |
| **`RepairMasterDropdown`** | `repair_master_dropdown` | 22 | **PASS** — Complete options for vendors, transporters, departments, machine names |
| **`Login`** | `login` | 14 | **PASS** — Seeded `repair_admin` and `repair_user` with `Repair_`-prefixed page access |

---

## Decommissioning & Archival

1. **Standalone App Deprecation**:
   - Standalone `Repair-FMS` application is decommissioned and replaced by `/repair` route in `merge-system-frontend`.
2. **Apps Script Decommissioning**:
   - Legacy Google Apps Script (`google_apps_script.js`) endpoints (`insert1`, `update1`, `handleLogin`) have been replaced by strongly-typed Prisma database operations in Express.
3. **Repository Archival**:
   - Archived `Repair-FMS` repository and created [`Repair-FMS/README.md`](file:///c:/dev/Repair-FMS/README.md) directing all developers to the new `/repair` system module.

---

## Final Migration Summary

1. **Migrated Scope**:
   - Successfully migrated 8 active pages: `Dashboard`, `Indent`, `SentToVendor`, `CheckMachine`, `StoreIn`, `MakePayment`, `Accounts`, and `Users`.
   - Created PostgreSQL database models (`RepairTask`, `RepairAdvancePayment`, `RepairMasterDropdown`) and integrated user management into `Login`.
   - Built backend workflow service (`repairWorkflow.service.js`) and unified file upload service (`fileUpload.service.js`).
   - Integrated `repairTabs` and collapsible sidebar menu in `DashboardLayout.tsx`.

2. **Resolution of Prompt 1 Findings**:
   - **`FormResponses` vs `Repair System`**: Confirmed `FormResponses` was a legacy dropdown metadata source. The unified backend writes directly to `RepairTask` (`"Repair System"`), eliminating delay in indent visibility.
   - **`Repair Login` vs `Login Sheet`**: Confirmed `Repair Login` was the active user sheet. User management now maps to the central `Login` model with `firm_name` scoping and `Repair_`-prefixed page access keys.

3. **Intentionally Excluded Scope**:
   - `RepairAdvance.jsx` was confirmed to be commented out in `Sidebar.jsx` and missing from `App.jsx` in the original `Repair-FMS` app. It is excluded because advance payments are already fully handled by `MakePayment.jsx` and the `RepairAdvancePayment` model.





