# MessMate - Mess/Hostel Meal & Expense Manager

MessMate is a multi-page web application for managing a mess/hostel: daily meals, bazar (grocery) expenses, member deposits, and monthly balance reports. It has two roles: **Admin** and **User**.

> Final Lab Project - Web Application Development

- **Live Demo:** https://mess-meal-management-9gzw.vercel.app
- **GitHub:** https://github.com/your-username/messmate
- **Video Demo:** https://youtu.be/your-video-id

---

## Features

### Admin
- Manage all meals (add, edit, delete, filter by date/member)
- Manage bazar expenses
- Review deposit requests (approve / reject with note)
- View all members' balances and the monthly report with charts
- Dashboard: total members, total meals, total expense, current meal rate, pending deposits

### User
- View own meals (read-only)
- View own total cost, approved deposit, and balance (due/advance)
- Submit a deposit request to the admin (cash / bKash / Nagad)
- Track deposit status: pending, approved, rejected

### General
- Registration, login, logout (bcrypt + sessions)
- Role-based authorization
- Search and filter
- Responsive design
- Flash messages and input validation

## How the Balance Works

```
Meal Rate = Total Bazar Expense / Total Meals (whole mess)
User Cost = User's Total Meals x Meal Rate
Balance   = Approved Deposits - User Cost
```

Only **approved** deposits count. A positive balance means advance, and a negative balance means due.

## Tech Stack

| Layer | Technology |
|---|---|
| Front-end | EJS, HTML, CSS (Bootstrap), Chart.js |
| Back-end | Node.js, Express |
| Database | PostgreSQL (Neon) |
| Auth | bcrypt, express-session |
| Security | helmet, parameterized queries |
| Testing | Jest, Supertest |
| Hosting | Render (app), Neon (database) |

## Project Structure

```
messmate/
├── config/         # db connection
├── controllers/
├── middleware/     # requireLogin, requireRole
├── models/
├── routes/
├── views/          # EJS templates
├── public/         # css, js, images
├── db/             # schema.sql, seed.sql, migrations
├── docs/           # ER diagram, testing checklist
├── tests/
├── .env.example
└── server.js
```

---

## Run Locally

### Prerequisites
- Node.js 18+
- Git
- A PostgreSQL database (local, or a free Neon database)
- `psql` client (optional; you can use the Neon SQL Editor instead)

### 1. Clone and install

```bash
git clone https://github.com/your-username/messmate.git
cd messmate
npm install
```

### 2. Create the environment file

```bash
cp .env.example .env
```

Windows (Command Prompt): `copy .env.example .env`

Edit `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
SESSION_SECRET=your_long_random_string
APP_NAME=MessMate
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Set up the database

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

Without `psql`: open the Neon dashboard, go to **SQL Editor**, paste the contents of `db/schema.sql`, run it, then do the same with `db/seed.sql`.

### 4. Start the app

```bash
npm run dev     # development with nodemon
# or
npm start       # production mode
```

Open http://localhost:3000

### 5. Run tests

```bash
npm test
```

### Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` locally, `production` on Render |
| `PORT` | Server port (Render sets this automatically) |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random secret for signing sessions |
| `APP_NAME` | Display name of the app |

---

## Deploy (Free)

### Step 1: Database on Neon
1. Sign up at https://neon.tech
2. Create a project named `messmate` and choose the nearest region
3. Copy the **connection string** (it must end with `?sslmode=require`)
4. Create the tables:

```bash
psql "YOUR_NEON_URL" -f db/schema.sql
psql "YOUR_NEON_URL" -f db/seed.sql
```

### Step 2: Push code to GitHub

```bash
git add .
git commit -m "docs: add README and deployment config"
gh repo create messmate --public --source=. --push
```

Before pushing, run `git status` and confirm `.env` is **not** listed.

### Step 3: Web service on Render
1. Sign up at https://render.com with GitHub
2. Click **New > Web Service** and select the `messmate` repository
3. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. Under **Environment**, add:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your Neon connection string |
| `SESSION_SECRET` | a new random string |

5. Click **Create Web Service** and wait for the build to finish
6. Open your live URL and test login, deposits, and reports

### Updating the live site

```bash
git add .
git commit -m "feat: your change"
git push
```

Render redeploys automatically on every push.

### Deployment Notes
- Render's free tier sleeps after inactivity. The first request can take about 30-60 seconds, so open the site once before a demo or submission.
- The app must read `process.env.PORT` and trust the proxy (`app.set('trust proxy', 1)`) so secure cookies work on Render.
- Use `/health` to check that the app and database are connected.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@messmate.com | admin123 |
| User | user@messmate.com | user123 |

(Change these to match your `db/seed.sql`.)

## Screenshots

| Page | Screenshot |
|---|---|
| Landing | `docs/screenshots/landing.png` |
| Admin Dashboard | `docs/screenshots/admin-dashboard.png` |
| Manage Meals | `docs/screenshots/meals.png` |
| Pending Deposits | `docs/screenshots/deposits.png` |
| User Dashboard | `docs/screenshots/user-dashboard.png` |

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED` or SSL error | Check `DATABASE_URL` and make sure it has `?sslmode=require` |
| `relation "users" does not exist` | Run `db/schema.sql` on the database |
| Login works locally but not on Render | Check `NODE_ENV=production`, `trust proxy`, and `SESSION_SECRET` |
| `Cannot find module` | Run `npm install` |
| Port already in use | Change `PORT` in `.env` |

## Future Improvements
- Email/SMS notifications for deposit approval
- Monthly PDF report download
- Online payment gateway integration
- Multiple mess groups

## Author

**Your Name** - Student ID: XXXXXXX
Course: Web Application Development Lab
