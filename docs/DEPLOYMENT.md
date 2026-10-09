# Vercel deployment

MessMate is an Express application backed by PostgreSQL. Vercel detects the
Express app exported from the project entry point, while PostgreSQL stores
sessions so sign-ins survive function restarts and requests routed to different
instances.

## 1. Provision PostgreSQL

- Create a hosted PostgreSQL database (for example, Neon, Supabase, or another
  managed PostgreSQL provider).
- Copy its production connection string. Use the provider's pooled connection
  string when available and follow its TLS/SSL connection requirements.
- Do not commit the connection string or put it in a public client-side variable.

## 2. Apply schema and migrations

Run this once for the target database before deploying, with the production
`DATABASE_URL` available in the local shell:

```powershell
$env:DATABASE_URL = "your-production-postgresql-connection-string"
npm run db:migrate
```

The command creates the initial schema if needed and applies the meal,
PostgreSQL session-store, and member-account linking migrations. Existing member
profiles are linked to matching member login accounts by email where possible.
Do not run it against a database containing data you are not prepared to change.
The Vercel function only checks database connectivity; it does not run schema
changes during cold starts.

## Create the first admin account

Set `ADMIN_FULL_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, and
`ADMIN_PASSWORD` as environment variables, then run:

```powershell
npm run db:seed-admin
```

Use a unique password of at least 12 characters. The script hashes it with
bcrypt and upserts the admin identified by `ADMIN_USERNAME`; running it again
updates that account's configured name, email, password, and active admin role.
Keep these values private and remove `ADMIN_PASSWORD` from deployment
environment settings after seeding. To seed a hosted production database, set
the production `DATABASE_URL` and admin values only in a trusted local shell,
run the command once, and do not add credentials to source control.

Do not use `db/seed.sql` for production setup: it is an old development fixture
that drops tables and contains obsolete sample data.

## 3. Configure the Vercel project

- Import the repository into Vercel and set the project root to this app's root.
- Let Vercel detect the Express app; do not set a build command or output
  directory.
- Vercel serves files in `public/` as static assets; keep EJS templates under
  `views/` for the Express function.
- Add these Production environment variables in **Project Settings → Environment
  Variables**:
  - `NODE_ENV` = `production`
  - `DATABASE_URL` = the hosted PostgreSQL connection string
  - `SESSION_SECRET` = a unique, randomly generated secret (at least 32 random
    bytes); do not reuse the development value
  - `SESSION_MAX_AGE` = `86400000` (optional; milliseconds)
  - `PG_POOL_MAX` = `1` (optional; recommended for serverless connection limits)
- Seed the production admin from a trusted local shell as described above; do
  not leave `ADMIN_PASSWORD` configured in Vercel after seeding.
- Redeploy after setting environment variables.

Vercel's HTTPS proxy is trusted for secure session cookies. The app uses
PostgreSQL-backed sessions in production and requires the `user_sessions` table
from the migration before requests can authenticate.

## 4. Verify after deployment

- Open `/` and `/auth/login`; confirm static CSS, EJS pages, and routing work.
- Register a member, log in, navigate between pages, and confirm the session
  remains active.
- Log out and verify protected pages redirect to sign-in.
- Exercise one database-backed create/list flow and confirm it persists after a
  fresh request.
- Check Vercel function logs and the database provider logs for errors.
- Keep development, preview, and production database URLs and session secrets
  separate.
- Optionally run `npx vercel dev` locally to verify Vercel's routing and static
  asset behavior before deployment.

## Local long-running server

For local development, copy `.env.example` to `.env`, set `DATABASE_URL` and
`SESSION_SECRET`, then run `npm run dev`. Run `npm run db:migrate` when setting
up a new database or applying a migration.
