# KitchenCheck

KitchenCheck is a web app for small kitchens to keep simple operational check records — daily checklists, temperature logs, photo evidence, and PDF exports. It is not a compliance certificate, legal advice tool, or food-safety certification product.

## Stack

- **React** — UI
- **Vite** — build and local development
- **Supabase Auth** — email/password sign-in, signup, and password reset
- **Supabase Postgres** — application data
- **Supabase Storage** — checklist photo uploads
- **React Router** — client-side routing
- **jsPDF** — client-side PDF export (lazy-loaded)
- **Tailwind CSS** — styling

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` with your values. Real secrets and local env files are gitignored; `.env.example` is tracked as a template only.

### Supabase mode (recommended)

```
VITE_LOCAL_DEV_AUTH=false
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use the **anon/public** key only. Never put a Supabase **service-role** key in frontend code or any `VITE_*` env var.

### Local mock mode

No Supabase required — in-memory data only (useful for UI work):

```
VITE_LOCAL_DEV_AUTH=true
```

## Run

```bash
npm run dev -- --port=5199
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Supabase requirements

### Tables

The app expects these Postgres tables:

- `kc_locations`
- `kc_checklist_templates`
- `kc_check_sessions`
- `kc_check_items`
- `kc_temperature_logs`
- `kc_user_settings`

### Storage

Private bucket:

- `kitchencheck-photos`

Checklist photo object path format:

```text
<user-id>/<location-id>/<session-id>/<timestamp>-<filename>
```

Photo cleanup is attempted when relevant records or locations are removed.

### Security model

Client queries and mutations are user-scoped where practical (for example list helpers filter by the current user's `user_id`).

**Production security still depends on correct Supabase RLS and Storage policies.** Those policies must enforce owner-only access on every table and on the photos bucket.

SQL schema and RLS/Storage policy definitions are **not** currently version-controlled in this repository. Configure and verify them in your Supabase project.

## Auth and account deletion

Implemented in the app:

- Sign in (`/login`)
- Sign up (`/signup`)
- Forgot password (`/forgot-password`)
- Reset password (`/reset-password`)
- Logout (Settings)

Deleting a Supabase Auth user requires privileged server-side / admin access. **Do not implement Auth user deletion in the browser client.**

Account and data deletion requests are currently handled through support until a secure backend or Edge Function exists.

## Billing

Billing and automatic plan enforcement are **not** implemented. The pricing page shows planned pricing only.

## PDF export

Session and history PDF export use jsPDF and are **lazy-loaded** when the user exports, so the PDF library is not in the initial app bundle path for every page load.

## Security notes

- Never expose Supabase **service-role** keys in frontend code.
- `npm audit` may report moderate React Router v6 advisories. Fixing them requires a breaking upgrade to React Router v7. **Do not run `npm audit fix --force`.**

## License / ownership

KitchenCheck is owned and operated by NFD Logic Systems.
