# Own the Perk

A mobile-first, pseudonymous discovery marketplace for verified merchant-specific
card offers. The platform helps people discover offers, evaluate reputation, and
connect privately; it does not sell, transfer, broker, settle, or guarantee offers.

This repository contains the Phase 1 application foundation plus the Phase 2
Supabase Auth, pseudonymous profile, and Row Level Security foundation. Offers,
verification evidence, checkout, messaging, ratings, and moderation are intentionally
not implemented yet.

## Stack

- Next.js App Router, React, and strict TypeScript
- Tailwind CSS and shadcn/ui
- Supabase browser, SSR session, and privileged server client boundaries
- Stripe server client foundation
- Railway deployment using an auto-detected multi-stage Docker build and Next.js
  standalone output

## Local development

Use the Node.js version pinned in .nvmrc:

    nvm use
    npm install
    cp .env.example .env.local
    npm run dev

Open http://localhost:3000.

## Environment

Copy .env.example to .env.local and provide:

    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
    SUPABASE_SECRET_KEY=

    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
    STRIPE_SECRET_KEY=
    STRIPE_WEBHOOK_SECRET=

    NEXT_PUBLIC_APP_URL=http://localhost:3000

Only the three NEXT_PUBLIC_ values may enter browser bundles. Supabase and Stripe
secret keys are validated in src/lib/env/server.ts, which imports server-only.
The privileged Supabase client must only be used after explicit server-side
authorization; ordinary user-scoped server access uses the cookie-aware SSR client
and the publishable key so Row Level Security remains effective.

## Quality checks

    npm run lint
    npm run typecheck
    npm test
    npm run test:db
    npm run build

The database test requires Docker and a running local Supabase stack (`npx supabase
start`). It verifies profile grants, RLS isolation, protected trust fields, the safe
public view, and database-enforced username rules.

## Supabase setup

Database changes are reproducible migrations in `supabase/migrations`. For local
development:

    npx supabase start
    npx supabase db reset

For a linked hosted project, review the target and then apply migrations with:

    npx supabase link --project-ref YOUR_PROJECT_REF
    npx supabase db push

In the hosted Supabase dashboard, configure the following Auth settings:

1. Set the Site URL to the production `NEXT_PUBLIC_APP_URL`.
2. Add exact redirect URLs for `/auth/callback` on production and each approved local
   or preview origin. Do not use a broad wildcard in production.
3. Keep email/password signup and email confirmation enabled.
4. Configure production SMTP and use the confirmation and recovery templates from
   `supabase/templates`. The CLI configuration already wires them for local Supabase.
5. Keep leaked-password protection and suitable Auth rate limits enabled where the
   Supabase plan supports them.

Phone verification is deliberately not simulated. The schema reserves the trusted
`phone_verified` field, which normal users cannot update. To add the real flow, choose
and configure a supported SMS provider in Supabase Auth, enable phone confirmations,
add the production SMS credentials as Supabase secrets, and implement OTP enrollment
and verification before trusted server logic synchronizes verification state. Do not
enable a UI badge based only on a client claim or form submission.

## Phase 2 security boundary

- Auth identity and email remain in `auth.users`; they are not copied into public
  application tables.
- `profiles` stores pseudonymous identity and protected reputation/trust state.
- Authenticated clients receive column-level access only to safe profile fields.
- `public_profiles` is the marketplace DTO view and omits risk/account metadata.
- Users can update only their own username, avatar URL, bio, and one-way onboarding
  flag. Database grants, RLS, and a trigger protect verification/reputation fields.
- Route protection is enforced by the session-refresh proxy and rechecked in the
  authenticated server layout.

## Railway

Railway auto-detects the root Dockerfile. The multi-stage image installs locked
dependencies, builds Next.js standalone output, and runs the minimal artifact as a
non-root user. A post-build script copies public and static assets into the standalone
bundle. Server secrets are never declared as Docker build arguments.

To deploy:

1. Create a Railway service from this repository.
2. Add every variable from .env.example in Railway Variables.
3. Set NEXT_PUBLIC_APP_URL to the generated Railway or custom HTTPS domain.
4. Set the service health-check path to /api/health.
5. Generate a public domain and deploy.

Supabase remains the database, authentication, realtime, and private-storage
provider; no Railway Postgres service is required.
