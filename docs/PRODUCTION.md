# Drape: production setup and release checks

This release adds single-owner accounts. Each verified email has its own private business profile and jobs. It does not implement team memberships, subscriptions, or billing. Production is locked when account configuration is absent; there is no authentication bypass or local-data fallback.

## 1. Create Supabase and apply the migration

Create a Supabase project in an appropriate region for your users and data requirements. Run `supabase/migrations/001_production.sql` once in the project's SQL editor (or apply it through your migration workflow). Review database changes before applying them to an existing database. Do not rerun the initial migration against populated tables.

It creates profiles, quotes, immutable quote revisions, and persistent AI counters. Row-level security restricts reads to the signed-in owner. Clients cannot directly insert/update quotes or revisions. The authenticated `save_quote` function derives ownership from the session, recalculates totals, fixes the approved rates, validates approvals and checks revision numbers atomically. No Supabase service-role key is needed by this application.

Use a new staging project for validation before production.

## 2. Configure environment variables

Configure these locally in `.env.local` and in Vercel's correct environment:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
APP_URL=https://YOUR-PRODUCTION-DOMAIN
GEMINI_API_KEY=YOUR-SERVER-KEY
GEMINI_EXTRACTION_MODEL=gemini-3.8-flash
GEMINI_TRANSCRIPTION_MODEL=gemini-3.8-flash
```

Use the publishable key, never the service-role key. The publishable key is intended to be public; database isolation comes from RLS, grants and authenticated functions. Keep the Gemini key server-only. Public variables are bundled at build time: changing them requires a new build. Set `APP_URL` to the exact HTTPS origin, with no path. For local development use `http://127.0.0.1:3000`.

Do not reuse production credentials for pull-request previews. Configure a staging project/domain separately. Restrict preview access. HTTPS is needed for browser microphones away from localhost.

## 3. Configure email and account security

In Supabase Auth settings:

- Enable email/password and **Confirm email**. Keep anonymous sign-ins disabled for this release.
- Set the minimum password length to **12**. Enable leaked-password protection if available on your plan.
- Set Site URL to your production domain. Allow only your exact production, staging and local `/auth/confirm` URLs; avoid broad wildcard redirects.
- Configure custom SMTP with your own sender domain and test delivery. The default development mailer is not a production delivery service.
- Review Auth rate limits, session lifetimes and abuse protection before opening public registration. Configure provider-supported CAPTCHA with a matching frontend integration if spam becomes a risk; no CAPTCHA widget is included in this release.

For server-side email confirmation, set the confirmation email link to:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

For password recovery, set its email link to:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

The app also accepts the PKCE `code` callback. Callback destinations are restricted to `/` or `/reset-password`. Recovery links expire according to Supabase settings. Verify that expired links reach the error page and that a verified account can sign in, sign out and recover access.

Official references: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [password authentication](https://supabase.com/docs/guides/auth/passwords), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 4. Deploy to Vercel

Use the Next.js preset, `npm run build`, and the default output directory (no override). Production builds into `.next`. `vercel.json` sets AI request duration to 90 seconds. Verify that your hosting plan supports that duration. The app limits recordings to **3 MB** to stay below Vercel's request-body limit, and to 2 minutes in the browser.

Push the updated commit. Require the Verify CI job to pass before promotion (configure your branch/deployment checks; the workflow alone does not gate Vercel). Redeploying an older commit does not include the fixes. Do not commit `.env.local` or build artifacts.

## 5. Verify before inviting clients

Run locally or in CI:

```
npm ci
npm test
npm run typecheck
npm run build
npm audit --omit=dev --audit-level=high
```

Automated tests exercise the SQL migration in embedded PostgreSQL, RLS isolation, canonical rates, stale-version rejection, approval validation, quotas, request-size limits, API authentication failure modes and PDF pagination. Provider services are mocked in automated tests. Embedded SQL tests are not a substitute for hosted Supabase Auth/PostgREST integration checks.

Then test the deployed staging system with **two separate accounts**:

1. Sign up, verify email, sign in, sign out, reset password, and try an expired recovery link.
2. Save a draft and an approved quote. Reload, sign in on another device, and verify both are present.
3. Confirm account B cannot fetch account A's job PDF or history, even with its quote ID.
4. Try an unauthenticated request to `/api/jobs`, `/api/extract`, `/api/transcribe`, `/api/profile`, `/api/account-export` and a job PDF. Expect 401 after configuration.
5. Change an approved quote in two tabs. The older version must return 409 without overwriting the newer save. Reopen the saved quote to continue.
6. Download a PDF, change your business profile, and confirm the previously saved quote PDF retains its snapshot. Restore a prior revision as an unapproved draft.
7. Test Gemini text and voice with real measurements, silence, ambiguous quantities and denied microphone permission. AI must never bypass manual confirmation.
8. Import legacy browser drafts explicitly while signed in to the intended account. Original browser data is retained; import does not delete it. On shared devices, do not import somebody else's data.
9. Download the account JSON export and compare its jobs with the account.
10. Open authenticated `/api/health`. Expect database connected. Confirm security headers and no-store on authenticated responses.

The PDF uses built-in Latin fonts. This release targets English quotations. Arabic/non-Latin customer names and PDFs need embedded fonts and layout verification before offering that capability.

## 6. Operations and limits

- AI: **10 requests per minute and 100 per UTC day per account**, plus **1,000 requests per UTC day for the entire installation**. Both extraction and transcription count. Failed provider calls may consume a slot. Limits are persistent and atomic; when the quota database is unavailable AI fails closed.
- Saving: 30 revisions per minute, 500 per UTC day per account; at most 5,000 jobs per account and 1,000 revisions per job. The UI returns the latest 100 revisions for a job. Database limits protect storage; they are not billing entitlements.
- External budgets: configure Gemini billing alerts/quotas, Vercel spending controls and database monitoring. App request counts do not impose a guaranteed monetary cap.
- Backups: select an appropriate Supabase backup/PITR plan and test a restore into staging. Git stores code, not customer data. The JSON export contains current jobs/profile, not a complete database backup or all revisions.
- Logging: server errors log error type/code only. Do not add raw audio, descriptions, tokens, passwords, cookies or customer payloads to logs. Add an error-monitoring service under your account if needed; none is silently provisioned.
- Retention: account deletion through the Supabase administrative workflow cascades to profiles, quotes, revisions and usage records. Backups and external providers have their own retention. Define a support/contact and retention policy before onboarding clients. Self-service account deletion is not included.
- Pricing: rates remain American SAR 250/m, Wavy SAR 350/m and Double SAR 550/m. Changes require a deliberate code/database migration. Existing saved revisions retain their rates and branding snapshots.
- Unsaved edits: save explicitly. The browser warns before unloading a dirty quotation. There is no automatic backup of unsaved work.
- Rollback: roll back application code only to a version compatible with this schema. Do not roll back to the old unauthenticated app in public production. Migrations and restoration require a separate reviewed plan.

## Ready-to-launch boundary

Code and local tests can be completed without account credentials. A production launch still requires the project credentials, migration, SMTP, backup configuration, operator privacy/contact details and hosted end-to-end verification above. Do not advertise the deployment as fully verified until those checks pass.

Run `npm run check:config` locally to check required variables without printing their values. This checks presence/URL shape, not credentials, database migrations, mail delivery, or backups.
