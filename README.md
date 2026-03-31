# BugFlow

BugFlow is a production-ready bug tracking SaaS starter built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL, and JWT authentication with refresh-token rotation.

## Features

- JWT auth with register, login, refresh, and logout flows
- Secure refresh-token storage in an HttpOnly cookie plus the database
- Role-aware issue management with optimistic locking
- Kanban dashboard with filtering, pagination, and drag-and-drop status changes
- Issue comments and audit logs
- Consistent API envelopes with shared validation and error handling
- Basic rate limiting and security headers through the root proxy

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Prisma ORM
- PostgreSQL
- `bcrypt`
- `jose`

## Project Structure

```text
app/
  api/v1/
  dashboard/
  issues/[id]/
  login/
api/
components/
lib/
middleware/
prisma/
services/
proxy.ts
```

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required variables:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bugflow?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/bugflow?schema=public"
JWT_SECRET="replace-with-a-long-random-access-secret"
REFRESH_SECRET="replace-with-a-long-random-refresh-secret"
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Make sure PostgreSQL is running and both `DATABASE_URL` and `DIRECT_URL` point to it.

3. Apply the Prisma migration:

```bash
npm run db:migrate
```

4. Seed the default users:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Generated Migration

An initial SQL migration is included at:

```text
prisma/migrations/202603311945_init/migration.sql
```

## Default Seed Accounts

- Admin: `admin@bugtracker.dev` / `Admin123!`
- QA: `qa@bugtracker.dev` / `Qa123456!`
- Developer: `dev@bugtracker.dev` / `Dev123456!`

## Verification

The current codebase passes:

```bash
npm run lint
npm run build
```

## Deploy To Vercel

1. Push the repository to GitHub.

2. In Vercel, import the repository and keep the detected framework as Next.js.

3. In Project Settings -> Environment Variables, add:

```env
DATABASE_URL="your-neon-pooled-connection-string"
DIRECT_URL="your-neon-direct-connection-string"
JWT_SECRET="your-production-access-secret"
REFRESH_SECRET="your-production-refresh-secret"
```

Use the Neon pooled connection for `DATABASE_URL` and the direct connection for `DIRECT_URL`. This lets the app use pooled connections at runtime while Prisma migrations run through a direct connection during the build.

4. In Project Settings -> Build & Development Settings, set the Build Command to:

```bash
npm run vercel-build
```

5. Deploy the project.

6. After the first production deploy succeeds, run the seed once against the production database so you can log in with the default accounts:

```bash
npm run db:seed
```

Do not add the seed command to the Vercel build step.

## Notes

- `DELETE /api/v1/issues/:id` performs a soft delete through `deletedAt`.
- Access tokens are short-lived and retried through the refresh flow on the client.
- To fully run the app locally, a real PostgreSQL instance is still required.
