# Own the Perk

A mobile-first, pseudonymous discovery marketplace for verified merchant-specific
card offers. The platform helps people discover offers, evaluate reputation, and
connect privately; it does not sell, transfer, broker, settle, or guarantee offers.

This repository currently contains the Phase 1 application foundation and UI shell
only. Authentication flows, database tables, offer verification, checkout, webhooks,
and messaging are intentionally not implemented.

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
    npm run build

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
