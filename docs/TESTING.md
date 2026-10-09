# Manual test checklist

## Setup

- [ ] Copy `.env.example` to `.env` and set the PostgreSQL `DATABASE_URL` and a long, unique `SESSION_SECRET`.
- [ ] Create a PostgreSQL database and run `npm run db:migrate` to initialize its schema and migrations.
- [ ] Create the first admin with `npm run db:seed-admin` using private `ADMIN_*` environment variables; never enable public admin registration or run the destructive legacy `db/seed.sql`.
- [ ] Start the application with `npm run dev` and confirm the configured local URL loads.

## Public pages and account access

- [ ] Open `/` signed out; check the landing hero, responsive navigation, sign-in/register links, and footer.
- [ ] Open `/auth/register`; submit valid details and confirm an account is created as a member, then check the success message.
- [ ] Submit invalid registration data (short name/username/password, malformed email); confirm clear validation feedback and no account is created.
- [ ] Try registering a duplicate username and email; confirm friendly errors and no duplicate rows.
- [ ] Sign in with a valid account; confirm it redirects and the page identifies the signed-in user.
- [ ] Sign in with an incorrect password; confirm a generic error and that protected pages remain unavailable.
- [ ] Sign out using the navigation button (POST); confirm `/profile`, `/meals`, `/payments`, and dashboards require authentication afterward.
- [ ] Open `/profile`; confirm only the signed-in account's profile details are shown.
- [ ] Request an unknown URL; confirm the branded 404 page, navigation, and footer render.
- [ ] Trigger a server-side error in production mode; confirm the response shows a generic message and logs retain diagnostic details server-side.

## Authorization and sessions

- [ ] As a member, request admin-only routes `/expenses`, `/members/create`, and `/reports`; confirm access is denied.
- [ ] As a member, submit edit/delete requests for another user's records; confirm no record changes.
- [ ] As a member with a linked profile, check `/dashboard` and `/payments`; verify only their own meals, balance, and payments appear.
- [ ] As a member without a mess group, check the dashboard; it must not aggregate another group's totals.
- [ ] As an admin, confirm dashboards, reports, member management, expenses, payments, and meal CRUD work.
- [ ] In production configuration, confirm the session cookie has `Secure`, `HttpOnly`, and `SameSite=Lax` protections; test behind the deployed HTTPS proxy.
- [ ] Change the session ID at login (compare pre-login and post-login `connect.sid`) and confirm logout invalidates the prior session.

## Meals

- [ ] As a member, create a meal entry; confirm the submitted group ID cannot override the account's assigned group.
- [ ] Add a second member's meal for the same group/date/type; confirm both members can create their own entries.
- [ ] Submit the same slot twice for one member; confirm the duplicate is rejected with a clear message.
- [ ] As an admin, create, edit, filter, and delete a meal; confirm totals and messages update.
- [ ] As an admin, add a meal for a selected linked member; verify the member's dashboard/report counts the meal and the admin is recorded as the entry actor.
- [ ] As an admin, try assigning a member to a different mess group; confirm validation blocks saving.
- [ ] Submit invalid dates, quantities, meal types, or amounts; confirm server-side validation rejects them.
- [ ] Try a SQL-looking menu string such as `x'); DROP TABLE meals; --`; confirm it is stored/rendered as text and no SQL executes.

## Mess groups and member account assignment

- [ ] As an admin, open **Groups**, create a group with a unique code, and confirm it appears in group selectors.
- [ ] Create a member login account through registration, then add a member profile and select that login account; confirm its dashboard shows the assigned group.
- [ ] Create a member profile without selecting a login account; confirm another same-email account is not linked implicitly.
- [ ] Create a member profile first, then register an account with the same email; confirm registration links that account to the profile's group.
- [ ] Change a member profile's group and confirm the linked account receives the new group after its next login.
- [ ] Confirm a group with members, users, meals, expenses, payments, or notices cannot be deleted.
- [ ] Confirm a member cannot open or modify the admin-only Groups pages.

## Bazar expenses and payments

- [ ] As an admin, add, edit, search/filter, and delete a bazar expense; verify date, member, category, and amount filters.
- [ ] As an admin, create, edit, filter, and delete a payment; verify member, status, month, and date filters.
- [ ] As a member, confirm payment data is read-only and scoped to their own linked profile.
- [ ] Submit negative, malformed, over-limit amounts, invalid dates/statuses, and nonexistent member/group IDs; confirm validation feedback.
- [ ] Try SQL-looking text in search, notes, descriptions, and vendor fields; confirm it is handled as literal input.

## Reports, charts, and responsive/accessibility checks

- [ ] Check admin dashboard totals, current meal rate, group filter, and monthly chart against known sample data.
- [ ] Check `/reports/monthly` with date range, group, and member filters; verify meal rate equals group expenses divided by group meal units.
- [ ] Check the member dashboard meal units, meal cost, paid amount, due, advance, and daily chart.
- [ ] Resize to a narrow phone viewport; verify navigation collapses, forms remain usable, and tables can scroll horizontally.
- [ ] Use keyboard-only navigation; verify the skip link, visible focus indicators, labelled inputs, and operable navigation/buttons.
- [ ] Confirm error/flash messages are readable and the chart/landing/profile layouts work at desktop and mobile widths.

## Automated tests

- [ ] Run `npm test` for Jest/Supertest HTTP tests.
- [ ] Run `npm run test:unit` for the existing Node.js unit tests.
- [ ] Run `npm audit` for development and production dependency advisories; run `npm audit --omit=dev` to check production dependencies only.

## Production deployment

- [ ] Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel environment setup and database migration.
- [ ] Confirm production uses a hosted PostgreSQL-backed session store and secure HTTPS cookies.
