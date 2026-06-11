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
├── app/                            # All routes (App Router)
│   ├── layout.tsx                  # Root layout
│   ├── [locale]/                   # Localized routes (fr, en, nl, de)
│   │   ├── page.tsx                # Landing page
│   │   ├── auth/page.tsx           # Sign in (magic link, artist/operator role)
│   │   ├── dashboard/page.tsx      # Artist dashboard (protected)
│   │   ├── profile/edit/page.tsx   # Edit profile: profile/portfolio/EPK/availability tabs (protected)
│   │   ├── artists/page.tsx        # Artist directory
│   │   ├── artists/[id]/page.tsx   # Public artist profile
│   │   ├── opportunities/page.tsx  # Opportunities feed (+ [id] detail)
│   │   ├── places/page.tsx         # Cultural places map (Mapbox)
│   │   ├── messages/               # Realtime messaging (protected, + [id] thread)
│   │   ├── availability/page.tsx   # Availability calendar (protected)
│   │   ├── operator/dashboard/     # Operator dashboard (role: operator)
│   │   ├── admin/page.tsx          # Admin panel (role: admin)
│   │   ├── privacy/page.tsx        # Privacy policy (GDPR)
│   │   └── unsubscribe/page.tsx    # Email unsubscribe
│   ├── auth/callback/route.ts      # Supabase auth callback (non-localized)
│   ├── epk/[slug]/page.tsx         # Public EPK page (non-localized)
│   ├── actions/                    # Server actions (admin, operator, messages, …)
│   └── api/                        # Route handlers (admin CSV export, Spotify OAuth)
├── components/                     # Shared UI components (+ components/ui shadcn base)
├── emails/                         # React Email templates (Resend)
├── i18n/                           # next-intl config
├── messages/                       # Translations (fr, en, nl, de)
├── lib/
│   ├── admin-access.ts             # Shared admin role guard (getAdminAccess)
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client
│   │   └── admin.ts                # Service-role client (server only)
│   ├── types.ts                    # TypeScript types for all DB tables
│   └── utils.ts                    # Utility functions
├── proxy.ts                        # Locale detection/redirect middleware
└── supabase/                       # schema.sql + incremental SQL migrations
```

\---

## Database Tables

|Table|Description|
|-|-|
|`profiles`|User profiles (extends auth.users, role: artist/operator/admin)|
|`portfolio\_items`|Portfolio items linked to a profile|
|`opportunities`|Cultural opportunities (radio, events, contests…)|
|`matchings`|Artist applications to opportunities|
|`partners`|Cultural partners (radio stations, venues, festivals…)|
|`places`|Cultural places shown on the map|
|`performances`|Stage experience entries per artist|
|`press\_photos`|EPK press photos|
|`tech\_riders`|EPK technical riders|
|`artist\_availability`|Availability calendar entries|
|`artist\_reviews`|Operator reviews of artists after accepted matchings|
|`conversations` / `messages`|Artist–operator messaging|
|`spotify\_data`|Synced Spotify stats per profile|
|`push\_subscriptions`|Web push subscriptions|
|`public\_profiles` (view)|Public-safe subset of `profiles` where `role = 'artist'`|

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

* `/dashboard`, `/profile/edit`, `/messages`, `/availability` → redirect to `/auth` if not signed in
* `/operator/dashboard` and operator server actions → require `profiles.role = 'operator'`
* `/admin`, admin server actions, and `/api/admin/export` → require `profiles.role = 'admin'` via `getAdminAccess()` in `lib/admin-access.ts`
* `/epk/[slug]` → public, but only resolves profiles with `role = 'artist'` (same rule as the `public\_profiles` view)
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
NEXT\_PUBLIC\_MAPBOX\_TOKEN=           # Mapbox token for the places map
NEXT\_PUBLIC\_SITE\_URL=               # Canonical site URL (e.g. http://localhost:3000)
RESEND\_API\_KEY=                     # Resend API key for transactional emails
RESEND\_FROM\_EMAIL=                  # Sender address for transactional emails
UNSUBSCRIBE\_SECRET=                 # HMAC secret for unsubscribe links
SPOTIFY\_CLIENT\_ID=                  # Spotify OAuth client id
SPOTIFY\_CLIENT\_SECRET=              # Spotify OAuth client secret (server only)
SPOTIFY\_REDIRECT\_URI=               # Spotify OAuth callback URL
NEXT\_PUBLIC\_VAPID\_PUBLIC\_KEY=       # Web push VAPID public key
VAPID\_PRIVATE\_KEY=                  # Web push VAPID private key (server only)
VAPID\_EMAIL=                        # Web push contact email
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

# Check translation key parity across the four locales
npm run check:i18n
```

All four checks also run in CI (`.github/workflows/ci.yml`) on every push and pull request.

\---

## Key Conventions

* **Naming:** components in PascalCase, files in kebab-case for routes
* **Imports:** absolute imports using `@/` alias
* **Commits:** use conventional commits — `feat:`, `fix:`, `chore:`
* **One page at a time:** build and validate each page before moving to the next
* **Ask before major decisions:** if unsure about architecture or data model, ask before generating code

