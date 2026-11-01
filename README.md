# Drape — authenticated curtain quotation studio

Next.js + TypeScript, Gemini extraction/transcription, Supabase Auth and PostgreSQL, server-generated PDFs.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and configure Supabase + Gemini.
3. Apply `supabase/migrations/001_production.sql` to your Supabase project.
4. Configure email confirmation/recovery and SMTP.
5. `npm run dev`

The app locks access if account configuration is missing. There is no demo bypass. Production setup, deployment, backups and release verification: **[docs/PRODUCTION.md](docs/PRODUCTION.md)**.

## Verification

```sh
npm test
npm run typecheck
npm run build
```

Tests include actual PostgreSQL migration/RLS checks using PGlite, provider contract mocks, server-side pricing, request-size validation, and PDF pagination. Hosted Auth/email and real voice testing require service setup.

## Features

- Email/password sign-in, verified accounts, password recovery, sign-out
- Account-isolated cloud jobs and business profile
- Explicit import of old browser drafts
- Gemini text and recorded audio → editable requirements → manual confirmation
- Atomic save/approval, fixed server pricing, revision history and conflict detection
- Saved approved PDF with branding snapshot; current account JSON export
- Persistent AI quotas, upload limits, security headers and CI

Pricing: exact window width in meters × SAR 250 American / 350 Wavy / 550 Double. Height never changes price. Double includes sheer/chiffon + blackout. Currency rounds to two decimals per window. Final rates include all charges.

This release provides one private workspace per verified account. Team roles, payments, automatic sending, self-service account deletion, Arabic PDF fonts and automatic draft saving are not included. Jobs no longer save to shared localStorage. Never commit `.env.local`.
