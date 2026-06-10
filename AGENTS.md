## Project

**Name:** PaxKonnect  
**Description:** Belgian digital cultural platform for independent artists  
**Organization:** MonsPax ASBL (non-profit)  
**Goal:** Help artists find visibility, collaborations, radios, podcasts, events, contests, and cultural opportunities in Belgium.

\---

## Tech Stack

|Layer|Technology|
|-|-|
|Framework|Next.js 16.2 (App Router)|
|Database|Supabase (PostgreSQL + Auth + Storage)|
|UI|Tailwind CSS + shadcn/ui|
|Forms|React Hook Form + Zod|
|Emails|Resend|
|Language|TypeScript (strict)|
|Hosting|Vercel|

\---

## Coding Rules

* **Always use TypeScript strict mode** — no `any`, no implicit types
* **App Router only** — never use the Pages Router
* **Server Components by default** — add `"use client"` only when strictly necessary (event handlers, hooks, browser APIs)
* **Never hardcode fake data** — all data must come from Supabase
* **Always handle loading and error states** — use Suspense and error boundaries
* **Small reusable components** — one responsibility per component
* **Zod for all form validation** — never trust raw user input
* **Environment variables** — never expose `SUPABASE\_SERVICE\_ROLE\_KEY` to the client

\---

## Folder Structure

```
paxkonnect/
├── app/                        # All routes (App Router)
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── auth/page.tsx           # Sign in / Sign up
│   ├── dashboard/page.tsx      # Artist dashboard (protected)
│   ├── profile/edit/page.tsx   # Edit profile (protected)
│   ├── artists/page.tsx        # Artist directory
│   ├── artists/\[id]/page.tsx   # Public artist profile
│   ├── opportunities/page.tsx  # Opportunities feed
│   ├── opportunities/\[id]/page.tsx
│   └── admin/page.tsx          # Admin panel (protected)
├── components/                 # Shared UI components
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   └── server.ts           # Server Supabase client
│   ├── types.ts                # TypeScript types for all DB tables
│   └── utils.ts                # Utility functions
└── supabase/
    └── schema.sql              # Full database schema
```

\---

## Database Tables

|Table|Description|
|-|-|
|`profiles`|Artist profiles (extends auth.users)|
|`portfolio\_items`|Portfolio items linked to a profile|
|`opportunities`|Cultural opportunities (radio, events, contests…)|
|`matchings`|Artist applications to opportunities|
|`partners`|Cultural partners (radio stations, venues, festivals…)|

\---

## Supabase Clients

### Browser (client components)

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT\_PUBLIC\_SUPABASE\_URL!,
    process.env.NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY!
  )
```

### Server (server components, route handlers, server actions)

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export const createClient = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT\_PUBLIC\_SUPABASE\_URL!,
    process.env.NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

\---

## Route Protection

* `/dashboard` and `/profile/edit` → redirect to `/auth` if not signed in
* `/admin` → server-side check using `SUPABASE\_SERVICE\_ROLE\_KEY`
* All other routes → public

\---

## Design System

* **Colors:** purple `#7C3AED` (primary) · white · gold `#F59E0B` (accent)
* **Font:** Inter via Google Fonts
* **Style:** clean, modern, cultural — not corporate
* **Layout:** mobile first, fully responsive
* **Components:** always use shadcn/ui as the base, customize with Tailwind

\---

## Environment Variables

```env
NEXT\_PUBLIC\_SUPABASE\_URL=           # Supabase project URL (public)
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=      # Supabase anon key (public)
SUPABASE\_SERVICE\_ROLE\_KEY=          # Supabase service role key (server only, never expose)
RESEND\_API\_KEY=                     # Resend API key for transactional emails
```

\---

## Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

\---

## Key Conventions

* **Naming:** components in PascalCase, files in kebab-case for routes
* **Imports:** absolute imports using `@/` alias
* **Commits:** use conventional commits — `feat:`, `fix:`, `chore:`
* **One page at a time:** build and validate each page before moving to the next
* **Ask before major decisions:** if unsure about architecture or data model, ask before generating code

