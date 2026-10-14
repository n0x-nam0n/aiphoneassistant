# Mobile performance check — 2026-10-13

## Field data

- Search Console Core Web Vitals: no mobile or desktop field data shown.
- PageSpeed Insights API: HTTP 429, daily query quota exceeded.
- Field INP is therefore unavailable; a lab metric is not a substitute for field INP.

## Local lab check

Lighthouse 12.8.2, Chrome headless, served from the edited local site over loopback. These are lab results, not production or CrUX results, and can vary between runs.

| Metric | Before hero image optimization | After hero image optimization |
| --- | ---: | ---: |
| Lighthouse performance score | 0.66 | 0.78 |
| First Contentful Paint | 3.3 s | 3.6 s |
| Largest Contentful Paint | 13.5 s | 3.9 s |
| Cumulative Layout Shift | 0 | 0 |
| Total Blocking Time | 0 ms | 0 ms |
| Speed Index | 4.5 s | 4.7 s |

The hero background image was converted from a 2.1 MB PNG to a 156 KB WebP (same 1584 × 993 dimensions); the local Lighthouse LCP improved by 9.6 seconds in these runs. Other metrics are noisy and did not all improve. The mobile screenshot at 390 × 844 showed the homepage H1 fitting without clipping.

The local test server returned 404 for `config.js` (the workspace contains `config.example.js`, not the deployment config), so this run does not validate the deployed integration behavior. Lighthouse also flagged render-blocking resources (Google Fonts, Supabase JS, and `config.js`) and missing text compression on the local static server. Those conditions are server/deployment dependent; re-test the deployed page after publication. No font or script loading changes were made.
