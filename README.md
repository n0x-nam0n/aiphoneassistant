# Restaurant AI Receptionist

Static demo site for `restaurantaireceptionist.com`.

## GitHub Pages

The `main` branch deploys through `.github/workflows/deploy-pages.yml`. In GitHub, enable Pages with **GitHub Actions** as the source. Add the repository secret `SUPABASE_PUBLISHABLE_KEY` to enable live contact submissions; without it, the form safely runs in local demo mode.

## Supabase

Run [`supabase-schema.sql`](./supabase-schema.sql) in the Supabase SQL editor. The browser uses the project URL and a publishable key only. RLS permits contact inserts but blocks public reads.
