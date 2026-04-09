# Eco Clean - Scheduling Platform

<img width="1472" height="926" alt="Frame 10" src="https://github.com/user-attachments/assets/8d4c6eab-3544-4581-bf1b-8f8a40b3be10" />


## W26_4495_S2_UpulA

### 📁 Folder Structure

<pre> ├── Reports and Documents       # Project documentation and reports <br/> ├── Misc                        # Miscellaneous files and resources <br/> └── Implementation              # Mobile and Web applications </pre>

### 🗺️ Course Overview

- Name: Applied Research Project
- Code: CSIS 4495
- Section: 002

### 🔧 Project Overview

- Project Type: Riipen
- Client Name: Nettoyage Eco Vert
- Project Description: The project will deliver a fully functional web-based scheduling platform alongside a cross-platform mobile application (PWA) compatible with both iOS and Android devices. The platform will feature a user-friendly interface, calendar integration, and automated notifications to streamline appointment management for both staff and clients.
- Link: https://douglascollege.riipen.com/projects/rVnMYjLj

### 🧰 Team

- Upul Atapattu - Team Lead - 300392188
- Vidarshan Rathnayake - Team Member - 300392818
- Padmapriya Arasanipalai Kandhadai - Supervisor/Instructor
- Stephanie Riddell - Client

## Live Preview

Deployed app:

> [!TIP]
> Live Preview link: https://w26-4495-s2-upul-a-hrnk.vercel.app/login


## Project Configurations

- Web
  Run migrations
  npx prisma migrate dev
  npx prisma generate


# Eco Clean

Eco Clean Web is a Next.js application for managing cleaning jobs, staff operations, scheduling, payroll workflows, and mobile-friendly staff task execution. The system supports both an admin workflow and a staff-facing PWA-style workflow.

This README is written as a user guide first, with technical setup details included afterward.

## What This System Does

The application is split into two main experiences:

- `Admin`
  - Manage clients, jobs, appointments, staff, leave approvals, payroll periods, pay statements, and timesheets.
- `Staff`
  - View assigned work, start and pause jobs, add visit notes, submit availability, submit timesheets, review pay history, and use the app as a mobile/PWA experience.

There are also optional AI-assisted features for appointment planning, task assistance, staff recommendation, and payroll comparison.

## Main User Roles

### Admin

Admins can:

- View the dashboard calendar
- Open appointment details
- Edit jobs and appointments
- Create and manage clients
- Create and manage staff users
- Review leave requests
- Generate payroll periods
- Review and approve timesheets
- Review payroll statement data

### Staff

Staff can:

- Log in to PWA
- View assigned tasks
- Open task details
- Start, pause, and complete appointments
- Add visit notes and images
- Enter availability
- Enter and submit work time
- View pay periods, pay history, and pay stubs
- Update profile and contact information

Use this for the live demo when you want to show the hosted version instead of local development.


## Recommended Demo Setup

### Admin Demo

The admin side is primarily intended for desktop usage.
- Open the live site in a desktop browser
- Log in as an admin

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

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in the required values for:

- database connection
- NextAuth secret
- UploadThing keys
- optional AI provider keys
- any mail or external service keys used in your environment

### 3. Apply database migrations

```bash
npx prisma migrate deploy
```

For local development, if you are iterating on the schema:

```bash
npx prisma migrate dev
```

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Seed local data if needed

```bash
npm run seed
```

Available seed variants:

```bash
npm run seed:small
npm run seed:medium
npm run seed:large
```

### 6. Start the app

```bash
npm run dev
```

Open:

- `http://localhost:3000`

## Demo Login Placeholders

Add your real demo/test credentials here before presenting.

### Admin Test Account

- `Email:` `admin1@ecoclean.local`
- `Password:` `Password123!`

### Staff Test Account/ PWA Test Account

- `Email:` `staff1@ecoclean.local`
- `Password:` `Password123!`

### iOS Setup

<img width="960" height="600" alt="Untitled design (1)" src="https://github.com/user-attachments/assets/6189ac90-b057-4978-95e4-c8b1b106c241" />

### Android Setup

<img width="943" height="422" alt="Untitled design (2)" src="https://github.com/user-attachments/assets/975c5019-8ece-473b-bc05-115e31d00b71" />


## User Guide

### Admin Workflow

#### Admin Dashboard

The admin dashboard is the main operational screen.

You can:

- navigate the schedule calendar
- open appointment details
- filter appointments by search, staff, and status
- move between time periods
- refresh the calendar

#### Clients

Admins can create, edit, and soft delete clients.

Client records include:

- contact information
- preferred communication method
- lead source
- service address data
- notes

Soft-deleted clients:

- are hidden from normal list/detail views
- keep historical linked records intact
- are not hard removed from the database

#### Jobs and Appointments

Jobs are the parent records for operational work. Appointments are the scheduled service instances under jobs.

Admins can:

- create jobs
- assign service addresses
- add line items
- add job notes and images
- create one-time or recurring appointments
- assign staff to appointments
- edit appointment date, time, status, notes, and assigned staff
- delete appointments

Deleting an appointment:

- removes the appointment from the active schedule
- deletes related appointment images from UploadThing when file keys exist
- removes related appointment child records through cascade behavior

#### Staff Management

Admins can create, edit, and soft delete users.

User management includes:

- identity details
- email
- role
- password reset
- staff profile management for staff users

Soft-deleted users:

- no longer appear in active staff/user lists
- cannot log in anymore
- still preserve historical linked records for operational history

#### Leave Approval

Admins can:

- review pending leave requests
- approve or reject leave
- monitor summary counts for pending, approved, and rejected requests

#### Payroll and Timesheets

Admins can:

- generate payroll periods
- review payroll data
- review submitted timesheets
- approve timesheets
- review pay statement details

This area depends on correct staff, session, and timesheet data being present in the database.

### Staff Workflow

#### Staff Task List

The task list shows appointments assigned to the logged-in staff member.

Staff can:

- filter tasks by date
- open task details
- review appointment status
- inspect team activity

#### Task Details

From the task details screen, staff can:

- start a job timer
- pause a job timer
- complete a job
- view the service address
- open directions
- contact the client
- write visit notes
- attach images

The task page also displays:

- planned time window
- elapsed time
- remaining time
- overtime indication
- team activity state

#### Availability

Staff can enter shift availability and optional comments.

This allows admins and scheduling logic to determine whether a staff member can be assigned to future work.

#### Enter Time

Staff can:

- review work sessions
- inspect day-by-day totals
- edit recorded start and end times for sessions where allowed
- submit timesheets for a pay period

#### Pay History and Pay Stubs

Staff can:

- view pay history
- view pay periods
- open specific pay stubs
- download pay-related documents where supported

#### Staff Profile

Staff can manage:

- phone number
- address
- emergency contact details

## PWA Guide

The staff side is designed to work like a mobile web app/PWA.

### Typical PWA Usage

1. Open the staff app on a mobile browser.
2. Log in using a staff account.
3. Install the app from the browser’s install prompt or menu if available.
4. Use the task list and task detail flows for field operations.

### Expected PWA Features

- mobile-friendly navigation
- bottom navigation
- top bar controls
- service worker support
- offline fallback page
- local-notification-related flows where supported

### PWA Test Placeholder

Use this section to document the exact test device and account used for the demo.

- `Device:` `[ADD DEVICE NAME]`
- `Browser:` `[ADD BROWSER NAME]`
- `Account Email:` `[ADD PWA ACCOUNT EMAIL]`
- `Account Password:` `[ADD PWA ACCOUNT PASSWORD]`

## Optional AI Features

AI features can be disabled with environment configuration.

If AI is disabled:

- AI UI should be hidden
- AI routes should return disabled or fallback responses

To disable AI in local development:

```bash
NEXT_PUBLIC_AI_ENABLED=false
```

## Technical Notes

### Stack

- Next.js App Router
- React
- TypeScript
- Mantine UI
- React Query
- Zustand
- Prisma
- PostgreSQL
- NextAuth
- UploadThing

### Project Structure

- `app/`
  - pages, layouts, and API route handlers
- `app/components/`
  - reusable UI, cards, tables, popups, and page-specific components
- `hooks/`
  - React Query hooks and reusable client-side data hooks
- `lib/api/`
  - browser-side API helper layer
- `lib/`
  - auth, Prisma, utilities, formatting, notifications, and shared helpers
- `lib/ai/`
  - AI prompts, schemas, routes, and transformations
- `stores/`
  - Zustand UI state
- `types/`
  - shared domain and API types
- `prisma/`
  - schema, migrations, and seed logic

### Data Flow Conventions

Preferred pattern:

1. Add request helpers in `lib/api/*`
2. Wrap server state with hooks in `hooks/*` where appropriate
3. Keep fetched server data in React Query
4. Keep UI-only state in Zustand

### Soft Delete Behavior

Users and clients use soft delete.

That means:

- records are marked with `deletedAt`
- list/detail APIs exclude them by default
- linked historical records remain available
- deleted users cannot authenticate

### Appointment Delete Behavior

Appointments currently use hard delete behavior.

That means:

- the appointment record is deleted
- related child records are removed through cascade behavior
- UploadThing images for that appointment are deleted when a `fileKey` exists

## Validation Commands

### Run tests

```bash
npm test
```

### Run lint

```bash
npx eslint .
```

Note: the repository may still contain unrelated lint warnings/errors depending on the current branch state.

### Run production build

```bash
npm run build
```
