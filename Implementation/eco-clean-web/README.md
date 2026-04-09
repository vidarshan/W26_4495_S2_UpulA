# Eco Clean Web

Eco Clean Web is a scheduling, staff operations, payroll, and task-management system for a cleaning service business. It includes an admin workflow for desktop use and a staff workflow designed to feel like a mobile web app / PWA.

## Live Preview

Deployed login page:

- https://w26-4495-s2-upul-a-hrnk.vercel.app/login

Use this for the live demo when you want to show the hosted version instead of local development.

## Demo Access Placeholders

Add the real credentials here before final submission or demo:

### Admin Account

- `Email:` `[ADD ADMIN EMAIL]`
- `Password:` `[ADD ADMIN PASSWORD]`

### Staff Account

- `Email:` `[ADD STAFF EMAIL]`
- `Password:` `[ADD STAFF PASSWORD]`

### PWA / Mobile Staff Account

- `Email:` `[ADD PWA STAFF EMAIL]`
- `Password:` `[ADD PWA STAFF PASSWORD]`

## Recommended Demo Setup

### Admin Demo

The admin side is primarily intended for desktop usage.

Recommended setup:

- Open the live site in a desktop browser
- Log in as an admin
- Use a normal desktop-width viewport
- Demonstrate:
  - dashboard calendar
  - appointment details
  - client management
  - user/staff management
  - leave approval
  - payroll periods
  - timesheet review

For the admin flow, there is no special mobile-browser requirement.

### Staff / PWA Demo

The staff side should be demonstrated in a mobile browser layout so it shows the intended full mobile experience.

Recommended setup:

1. Open the live URL on a phone if possible.
2. If using a desktop browser for presentation, switch to mobile device emulation in browser dev tools.
3. Log in using a staff or PWA test account.
4. Keep the viewport in a mobile-sized layout throughout the staff demo.

Why this matters:

- the staff interface is designed around mobile navigation patterns
- the top bar and bottom navigation are intended for mobile usage
- the task flow feels most accurate in a narrow/mobile viewport
- the PWA-like experience is best represented in a mobile browser

## How To Show the PWA-Like Flow

To demonstrate the staff experience properly:

### Option 1: Real Mobile Device

This is the preferred method.

1. Open the deployed URL on a mobile browser.
2. Sign in with the staff/PWA account.
3. Navigate through:
   - tasks
   - task details
   - enter availability
   - enter time
   - profile
4. If your browser supports install prompts, you can optionally show the install/add-to-home-screen flow.

### Option 2: Desktop Browser in Mobile View

If you are presenting from a laptop/projector:

1. Open the deployed URL.
2. Open browser developer tools.
3. Turn on device toolbar / responsive mode.
4. Choose a phone-sized viewport.
5. Keep the page in mobile dimensions while using the staff account.

This is important because simply resizing the browser a little is not enough. The staff area should be shown in a clearly mobile-sized layout so the navigation and spacing behave as intended.

## Main Roles

### Admin

Admins can:

- manage clients
- manage jobs and appointments
- manage staff users
- review leave requests
- generate payroll periods
- review timesheets
- inspect payroll and pay-statement data

### Staff

Staff can:

- view tasks
- open appointment/task details
- start, pause, and complete work
- add visit notes and images
- submit availability
- submit time
- view pay information
- manage profile details

## Key Behaviors

### Soft Delete

Clients and users use soft delete behavior.

That means:

- they are hidden from normal active views
- their historical data stays intact
- deleted users cannot log in

### Appointment Delete

Appointments currently use delete behavior rather than soft delete.

That means:

- the appointment record is removed
- related child records are removed through cascading relations
- appointment images are also cleaned up when file keys exist

## Running Locally

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Use the following template in your local `.env.local` file:

```env
DATABASE_URL=[YOUR_DATABASE_URL]

NEXTAUTH_URL=[YOUR_NEXTAUTH_URL]
NEXTAUTH_SECRET=[YOUR_NEXTAUTH_SECRET]

APP_TZ=[YOUR_APP_TIMEZONE]

OPENAI_API_KEY=[YOUR_OPENAI_API_KEY]
NEXT_PUBLIC_AI_ENABLED=[true_or_false]

SMTP_HOST=[YOUR_SMTP_HOST]
SMTP_PORT=[YOUR_SMTP_PORT]
SMTP_SECURE=[true_or_false]
SMTP_USER=[YOUR_SMTP_USER]
SMTP_PASS=[YOUR_SMTP_PASS]
EMAIL_FROM=[YOUR_EMAIL_FROM_ADDRESS]

CRON_SECRET=[YOUR_CRON_SECRET]

SEED_TEST_EMAIL=[YOUR_OPTIONAL_SEED_TEST_EMAIL]
```

Then replace each placeholder with your local values before running the app.

### Apply database migrations

```bash
npx prisma migrate deploy
```

For local schema development:

```bash
npx prisma migrate dev
```

### Generate Prisma client

```bash
npx prisma generate
```

### Seed development data

```bash
npm run seed
```

Optional seed sizes:

```bash
npm run seed:small
npm run seed:medium
npm run seed:large
```

### Start the app

```bash
npm run dev
```

Open:

- `http://localhost:3000/login`

## Validation Commands

### Tests

```bash
npm test
```

### Build

```bash
npm run build
```

### Lint

```bash
npx eslint .
```

Note: the project may still contain unrelated lint debt depending on the current branch state.

## Suggested Demo Flow

### Admin

1. Open the live site on desktop.
2. Log in as admin.
3. Show dashboard/calendar.
4. Open an appointment.
5. Show client editing.
6. Show user/staff editing and soft delete behavior.
7. Show leave approval.
8. Show payroll periods and timesheet review.

### Staff / PWA

1. Open the live site in a mobile browser or mobile emulation mode.
2. Log in as staff.
3. Show the mobile navigation.
4. Show tasks list.
5. Open task details.
6. Show start/pause/complete flow.
7. Show visit notes.
8. Show availability entry.
9. Show enter-time flow.

## Project Structure

- `app/`
  - routes, pages, layouts, and API handlers
- `app/components/`
  - reusable UI and modal flows
- `hooks/`
  - React Query hooks
- `lib/api/`
  - browser-side API helper functions
- `lib/`
  - auth, Prisma, utilities, notifications, and shared logic
- `lib/ai/`
  - AI-related logic
- `stores/`
  - Zustand UI state
- `prisma/`
  - schema, migrations, and seed scripts

## Final Checklist Before Demo

- add real admin credentials to this README
- add real staff credentials to this README
- add real PWA/mobile credentials to this README
- confirm the deployed URL is reachable
- confirm database migrations are applied
- confirm the latest build passes
- test admin on desktop layout
- test staff in a mobile browser layout
