# Hostess

Static marketing site, illustrative handoff demo, and private owner follow-up desk for `restaurantaireceptionist.com`. The site does not implement the voice agent, staff notification delivery, or production phone routing.

## GitHub Pages

The `main` branch deploys through `.github/workflows/deploy-pages.yml`. In GitHub, enable Pages with **GitHub Actions** as the source. Add the repository secret `SUPABASE_PUBLISHABLE_KEY` to enable live contact submissions; without it, the form safely runs in local demo mode.

## Supabase

[`supabase-schema.sql`](./supabase-schema.sql) defines the website contact form only. The browser may use a Supabase publishable key for that form; RLS permits contact inserts and blocks public reads.

`supabase/migrations/` contains versioned schema changes, including the Hostess pilot call/lead schema. A migration file is source code, not proof it has been applied to any Supabase project. Apply migrations from the project root only after reviewing the target environment. Anonymous users cannot read or write lead data. Authenticated invited owners receive location-scoped reads and may update only lead follow-up status through row-level security. Trusted workflows use the server-only `service_role`; never put that key in browser code.

The site includes a private owner inbox at [`desk.html`](desk.html). Disable public account sign-up and provision owner accounts/membership through trusted Supabase administration; the page has no public sign-up. The voice agent, Stepper workflow, carrier forwarding, staff notification delivery, and any live customer configuration are external to this static site. Production forwarding must remain disabled until the per-location checks in [`docs/phone-routing-runbook.md`](docs/phone-routing-runbook.md) and [`docs/pilot-onboarding-checklist.md`](docs/pilot-onboarding-checklist.md) pass.
