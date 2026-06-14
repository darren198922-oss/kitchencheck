# KitchenCheck

Local kitchen checklist app (Vite + React + Supabase).

## Setup

```bash
npm install
```

Create `.env.local` in the project root.

### Supabase mode (recommended)

```
VITE_LOCAL_DEV_AUTH=false
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Local mock mode

No Supabase required — in-memory data only:

```
VITE_LOCAL_DEV_AUTH=true
```

## Run

```bash
npm run dev -- --port=5199
```

## Build

```bash
npm run build
```
