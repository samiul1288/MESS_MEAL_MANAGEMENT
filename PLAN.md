# MessMate — Final Lab Project Plan

## 1. Project Overview

| Field | Value |
|---|---|
| **Project Name** | MessMate |
| **Project Type** | Multi-page web application (front-end + back-end) |
| **Domain** | Hostel / Mess meal & expense management |
| **Target Users** | Mess Managers, Administrators, and Resident Members |
| **Primary Goal** | Digital platform to manage mess meals, member expenses, billing, and entitlements in one system |
| **Lab Context** | Final year lab project demonstrating full-stack web development skills |

---

## 2. Problem Statement

Hostel messes and hostels currently rely on manual, paper-based processes for:
- **Meal management** — Recording daily meals served, quantity, and costs is error-prone and time-consuming.
- **Expense tracking** — Food purchases, vendor payments, and miscellaneous expenses lack a central, auditable record.
- **Member dues / expense sharing** — Collecting and distributing monthly meals dues among residents is done through spreadsheets or verbal agreements, leading to disputes.
- **Reporting** — Generating monthly reports (meals served, total expenses, per-member contributions) is laborious and not easily reproducible.
- **Transparency** — Members have no real-time visibility into what was served, how much was spent, or what their individual contribution is.

These inefficiencies lead to inaccurate billing, disputes among residents, lack of accountability, and poor financial oversight. MessMate solves these problems by providing a centralised, role-aware web application with real-time data, automated reporting, and transparent expense tracking.

---

## 3. Objectives

### Primary Objectives
1. **Digital meal management** — Record, view, and search daily meals served (menu, date, quantity, costs) via an easy-to-use interface.
2. **Expense tracking** — Log all mess expenses (food items, medicines, repairs, utilities) with category, amount, and vendor details.
3. **Member dues management** — Maintain member profiles, track monthly dues contributions, and calculate outstanding balances.
4. **Role-based access control** — Restrict data visibility and operations based on user roles (Admin/Manager vs. Member).
5. **Automated reporting** — Generate monthly reports (meal statistics, expense summaries, member contribution reports) with date-range filtering.
6. **Responsive design** — Provide a fully usable interface across desktop, tablet, and mobile devices.

### Secondary Objectives
- Maintain an audit trail of all critical transactions (additions, edits, deletions).
- Ensure data integrity through relational database constraints and validation.
- Provide a clean, professional UI/UX suitable for a campus-lab demonstration.

---

## 4. Key Features

### Authentication & Security
- User registration (with approval workflow for Manager role).
- Login/Logout with session-based authentication.
- Password hashing (bcrypt) and secure session management.
- Role-based middleware to protect routes and actions.
- Forgot/reset password (basic implementation).

### Meal Management (CRUD + Search/Filter)
- Add / edit / delete meals with: date, menu items (multiple), type (breakfast/lunch/dinner), quantity, cost per head, total cost.
- Search meals by date range, meal type, and keyword.
- View meal history and statistics (total meals, total cost, average cost per head).

### Expense Management (CRUD + Search/Filter)
- Add / edit / delete expenses with: date, description, category, amount, vendor, payment method, notes.
- Category-wise expense grouping (Food, Utilities, Maintenance, Medicine, Miscellaneous).
- Search expenses by date range, category, and keyword.
- Monthly expense summary.

### Member Management (CRUD)
- Add / edit / delete member profiles: name, roll number, hall, room, batch, contact, email.
- Track membership status (active/inactive).
- Search members by name, roll number, hall, or batch.

### Dues / Contribution Management
- Record monthly dues contribution per member.
- Calculate outstanding balance per member.
- View contribution history.

### Reports
- Monthly meal report: number of meals, total meals served, total cost, average cost per head.
- Monthly expense report: total expenses, breakdown by category, top expenses.
- Member contribution report: dues collected vs. dues outstanding.
- Combined financial summary (income from dues vs. expenses).

### Role-Based Views
- **Admin/Manager**: full access to all CRUD operations, member management, expense control, report generation.
- **Member**: view meal history, view own details and contribution, view monthly summary for self.

### Other
- Pagination and sorting for list views.
- Flash messages for user feedback (success/error).
- Data validation on all forms.


---

## 5. User Roles

| Role | Description | Permissions |
|---|---|---|
| **Admin** | Root/administrative user with full control over the system. | Manage users (including Manager role), manage all data, view all reports, system-wide settings. |
| **Manager** | Mess manager responsible for day-to-day operations. | Record meals & expenses, manage members, view and generate reports, cannot manage system users or global settings. |
| **Member** | Resident student/staff using the mess. | View meal history, view own profile and dues contribution, view monthly summary. Cannot edit any data. |

> **Note:** The project focuses on two primary roles as per the requirements: **Admin/Manager** and **Member**. A simplified admin role is included to allow user provisioning.

---

## 6. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Backend** | Node.js + Express.js | Lightweight, widely used, excellent ecosystem for server-rendered apps and middleware. |
| **Template Engine** | EJS (Embedded JavaScript) | Server-side rendering, easy integration with Express, good for multi-page apps. |
| **Database** | PostgreSQL | Robust, ACID-compliant relational DB; uses native `pg` driver with `pg-pool`. |
| **Database Driver** | `pg` / `pg-pool` | Official PostgreSQL driver for Node.js. |
| **Frontend** | HTML5, CSS3, Bootstrap 5, Vanilla JS, Chart.js | Responsive UI, interactive dashboard and report charts. |
| **Authentication** | express-session + bcrypt | Session-based auth with secure password hashing. |
| **Validation** | express-validator | Server-side form validation. |
| **Environment** | dotenv | Configuration management (database URL, session secrets). |
- Responsive layout (Bootstrap-based).



---

## 7. Page List

All pages are Express route-rendered with EJS templates:

| Page | Route | Role | Description |
|---|---|---|---|
| **Login** | `GET /login` | All | Login form. |
| **Dashboard** | `GET /reports` (admin), `GET /dashboard` (member) | Admin / Member | Admin totals and current meal rate; member meals, balance, due and advance. |
| **Meal List** | `GET /meals` | All (Manager+ / Member view-only) | Paginated list of meals with search & filter. |
| **Meal Form** | `GET/POST /meals/new` | Manager+ | Add new meal. |
| **Meal Edit** | `GET/POST /meals/edit/:id` | Manager+ | Edit existing meal. |
| **Meal View** | `GET /meals/view/:id` | All | View single meal details. |
| **Expense List** | `GET /expenses` | All (Manager+ / Member view-only) | Paginated list with search & filter. |
| **Expense Form** | `GET/POST /expenses/new` | Manager+ | Add new expense. |
| **Expense Edit** | `GET/POST /expenses/edit/:id` | Manager+ | Edit existing expense. |
| **Expense View** | `GET /expenses/view/:id` | All | View single expense details. |
| **Member List** | `GET /members` | Manager+ | Paginated member list with search. |
| **Member Form** | `GET/POST /members/new` | Manager+ | Add new member. |
| **Member Edit** | `GET/POST /members/edit/:id` | Manager+ | Edit member. |
| **Member View** | `GET /members/view/:id` | All | View member details & dues summary. |
| **Member Dues** | `GET /members/:id/dues` | Member+ | View/edit member's monthly dues contribution. |
| **Reports** | `GET /reports` | Manager+ | Report generators: date range, category filters. |
| **Monthly Report** | `GET /reports/monthly` | Admin | Date-range and member filters, meal-rate calculation and charts. |
| **Report Daily** | `GET /reports/daily/:date` | Manager+ | Daily meal & expense summary. |
| **Report Monthly** | `GET /reports/monthly/:month/:year` | Manager+ | Monthly expense & contribution summary. |
| **Settings / Users** | `GET/POST /settings/users` | Admin only | Manage system users (Admin & Manager). |


---

## 8. Folder Structure

```
messmate/
│
├── package.json
├── .env
├── .gitignore
│
├── public/
│   ├── css/
│   │   └── style.css               # Custom styles
│   ├── js/
│   │   └── app.js                  # Frontend helpers (optional)
│   ├── img/
│   │   └── logo.png                # Project logo
│   └── uploads/                    # Profile pictures / attachments
│
├── views/
│   ├── partials/
│   │   ├── head.ejs                # HTML head + Bootstrap CSS
│   │   ├── header.ejs              # Navigation bar
│   │   ├── footer.ejs              # Footer
│   │   └── flash.ejs               # Flash message partial
│   ├── login.ejs                   # Login page
│   ├── dashboard.ejs               # Role-based dashboard
│   ├── meals/
│   │   ├── meal-list.ejs           # Meal list with filters & pagination
│   │   ├── meal-form.ejs           # Add / edit meal
│   │   └── meal-view.ejs           # Single meal view
│   ├── expenses/
│   │   ├── expense-list.ejs        # Expense list with filters & pagination
│   │   ├── expense-form.ejs        # Add / edit expense
│   │   └── expense-view.ejs        # Single expense view
│   ├── members/
│   │   ├── member-list.ejs         # Member list with search & pagination
│   │   ├── member-form.ejs         # Add / edit member
│   │   ├── member-view.ejs         # Member detail + dues
│   │   └── member-dues.ejs         # Dues contribution form
│   ├── reports/
│   │   ├── report.ejs              # Report list & generators
│   │   ├── report-daily.ejs        # Daily report detail
│   │   └── report-monthly.ejs      # Monthly report detail
│   ├── settings/
│   │   └── users.ejs               # User management
│   └── layout.ejs                  # Base layout (if using include)
│
├── routes/
│   ├── index.js                    # Home & auth routes
│   ├── meals.js                    # Meal CRUD + search routes
│   ├── expenses.js                 # Expense CRUD + search routes
│   ├── members.js                  # Member CRUD + dues routes
│   ├── reports.js                  # Report generation routes
│   └── settings.js                 # User management routes
│
├── controllers/
│   ├── authController.js           # Login / logout / session
│   ├── mealController.js           # Meal logic
│   ├── expenseController.js        # Expense logic
│   ├── memberController.js         # Member logic
│   ├── reportController.js         # Report logic
│   └── settingController.js        # User management logic
│
├── middleware/
│   ├── authMiddleware.js           # Role-based route protection
│   └── validationMiddleware.js     # Express-validator wiring
│
├── db/
│   ├── connection.js               # PostgreSQL pool setup
│   ├── schema.sql                  # Database schema & seed data
│   └── seed.js                     # Seed script
│
├── tests/
│   └── *.test.js                   # Unit / integration tests (planned)
│
└── README.md                       # Project documentation
```

---

## 9. Database Design (Summary)

### User Table
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| username | VARCHAR(50) UNIQUE | NOT NULL |
| email | VARCHAR(100) UNIQUE | |
| password_hash | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(100) | |
| role | VARCHAR(20) | CHECK (role IN ('admin','manager','member')) |
| is_active | BOOLEAN | DEFAULT TRUE |

### Member Table
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| roll_number | VARCHAR(20) UNIQUE | |
| name | VARCHAR(100) | |
| hall | VARCHAR(50) | |
| room | VARCHAR(20) | |
| batch | VARCHAR(20) | |
| phone | VARCHAR(15) | |
| email | VARCHAR(100) | |
| status | VARCHAR(20) | DEFAULT 'active' |
| created_at | TIMESTAMP | DEFAULT NOW() |

### Meal Table
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| date | DATE | NOT NULL |
| type | VARCHAR(20) | CHECK (type IN ('breakfast','lunch','dinner','snack')) |
| menu_items | TEXT | (JSONB or comma-separated) |
| quantity | INTEGER | |
| cost_per_head | NUMERIC(10,2) | |
| total_cost | NUMERIC(10,2) | |
| created_by | INT REFERENCES user(id) | |

### Expense Table
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| date | DATE | NOT NULL |
| category | VARCHAR(30) | CHECK (category IN ('food','medicine','repair','utility','miscellaneous')) |
| description | TEXT | |
| amount | NUMERIC(10,2) | |
| vendor | VARCHAR(100) | |
| payment_method | VARCHAR(30) | |
| notes | TEXT | |

### Member Expense / Contribution Table
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| member_id | INT REFERENCES member(id) | |
| month | VARCHAR(7) | e.g. '2026-10' |
| contribution | NUMERIC(10,2) | |
| status | VARCHAR(20) | 'paid'/'pending'/'partial' |


---

## 10. API Design (Summary)

All data is server-rendered via EJS (no separate REST API layer required for the lab). However, a lightweight JSON API can be exposed for future extension:

| Method | Path | Description |
|---|---|---|
| GET | `/api/meals` | List meals (JSON, search/filter params) |
| POST | `/api/meals` | Create meal |
| GET | `/api/meals/:id` | Get single meal |
| PUT | `/api/meals/:id` | Update meal |
| DELETE | `/api/meals/:id` | Delete meal |
| GET | `/api/expenses` | List expenses |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/:id` | Get single expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/reports/monthly/:month/:year` | Monthly report data (JSON) |

---

## 11. Implementation Phases

### Phase 1 — Setup & Database (Week 1)
- Initialise Node.js project, install dependencies.
- Create PostgreSQL database and schema.
- Write `db/connection.js` and test connection.
- Seed initial data (superadmin user, sample meals/expenses/members).

### Phase 2 — Authentication (Week 2)
- Implement login/logout with express-session.
- User registration (admin-only user creation).
- Password hashing with bcrypt.
- Role-based middleware.
- Protect all routes.

### Phase 3 — Core CRUD Features (Week 3-4)
- **Meals**: full CRUD + search/filter.
- **Expenses**: full CRUD + search/filter.
- **Members**: full CRUD + search.
- **Dues**: record and view contributions.

### Phase 4 — Reports & Dashboard (Week 5)
- Role-specific admin and member dashboards with meal-rate and balance summaries.
- Monthly/ daily report generation.
- Date/member filtering and Chart.js dashboard/report visuals.
- Category-wise expense breakdown.
- Member contribution report.

### Phase 5 — UI & Polish (Week 6)
- Responsive layout with Bootstrap.
- Flash messages, pagination, sorting.
- Documentation (README, user guide).
- Final testing & bug fixes.

---

## 12. Validation & Error Handling

- All form inputs validated server-side (express-validator).
- Required fields enforced.
- Numeric fields validated for positive values.
- Foreign key constraints enforced by PostgreSQL.
- User-friendly error messages displayed via flash.
- 404 page for unknown routes.
- 403 page for unauthorised route access.

---

## 13. Acceptance Criteria (Draft)

The project is considered complete when:
1. A user can register/login/logout securely.
2. Admin/Manager can add, edit, delete meals with search & filter.
3. Admin/Manager can add, edit, delete expenses with category grouping.
4. Admin/Manager can manage members and record dues contributions.
5. Member can view meals history and their own dues summary.
6. Reports can be generated for daily, monthly, and category-wise views.
7. All pages are responsive and usable on mobile.
8. Database persists data correctly and survives restarts.
9. Source code is well-organised under the folder structure in §8.
10. README documents setup & usage.

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Date/timezone issues with meal/expense dates | Store all dates in UTC; use consistent `YYYY-MM-DD` format. |
| SQL injection | Use parameterized queries (`$1`, `$2`, …) via `pg`. Never concatenate user input. |
| Password leakage | Always hash passwords with bcrypt (cost factor ≥ 12). |
| XSS attacks | Escape all user-generated content in EJS templates (use `<%= %>`). |
| Session fixation | Regenerate session ID after login. |
| Role escalation | Enforce role checks in both middleware AND controller logic. |

---

*Document prepared for: Final Lab Project — MessMate*  
*Last updated: 10/07/2026*  
*Version: 1.0*
```
