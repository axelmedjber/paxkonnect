# PaxKonnect

PaxKonnect is a Belgian digital cultural platform for independent artists,
created by MonsPax ASBL.

## Stack

- Next.js 16.2 App Router
- TypeScript strict mode
- Supabase PostgreSQL, Auth, and Storage
- Tailwind CSS and shadcn/ui-style components
- React Hook Form and Zod
- Resend

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill in real project keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@paxkonnect.be
UNSUBSCRIBE_SECRET=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=contact@paxkonnect.be
```

3. Apply `supabase/schema.sql` in the Supabase SQL editor.

4. Start the app:

```bash
npm run dev
```

## Implementation Status

The project structure, config files, Supabase schema, shared layout, reusable
components, and landing page are implemented first. The remaining pages are
scaffolded so the route tree exists, and each will be completed after approval
in the requested build order.
