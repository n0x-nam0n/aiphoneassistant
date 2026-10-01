# Aiphone change log — September 30, 2026

This log records website and repository work published on September 30, 2026. The first commit below pushed the complete staged working-tree snapshot requested for publication, including existing documentation and Supabase configuration changes alongside the marketing-site updates.

## Restaurant marketing site

- Added the real Hostess demo number, `(916) 541-9136`, above the fold with tap-to-call links. The number is also included in the example browser configuration and GitHub Pages configuration generated during deployment.
- Added the missed event lead calculator. It estimates monthly event leads, bookings, and revenue at risk from missed calls using caller-provided assumptions; the page labels the result as directional.
- Added the Sacramento Restaurant AI Receptionist page and the Restaurant Phone Response Report, linked from the main site and listed in the sitemap.
- Reviewed on-page SEO basics: titles, descriptions, canonicals, Open Graph metadata, homepage Organization/Service structured data, internal links, and sitemap coverage are present. This is an SEO foundation, not evidence of search performance. The homepage still needs clearer target-query alignment; the Sacramento page needs verifiable local proof; the report needs original sourced data. Search Console indexing and rankings were not checked.

## Contact and legal pages

- Added Privacy and Terms of Use pages. The privacy page describes the website contact form, restaurant call intake, owner desk, service providers, recording defaults, retention, and privacy-request contact path based on the current implementation and pilot configuration.
- Added Contact, Privacy, and Terms links to the home, demo, owner desk, Sacramento, and report footers. The homepage contact section and form remain in place.
- Added both legal pages to the sitemap. Privacy page links to the California Attorney General's CCPA information.
- These are plain-language starter drafts, not counsel-reviewed legal advice. Have counsel review them before relying on them as final legal terms or privacy notices.

## Deployment and verification

- `8e2e1f6` — `Add restaurant demo, lead calculator, and local assets`
- `9e2d907` — `Add privacy and terms pages`
- Both commits are on `main` and were pushed to `origin`.
- GitHub Pages workflow run `36785492326` completed successfully for `8e2e1f6`; run `36786293135` completed successfully for `9e2d907`.
- Confirmed the homepage, Sacramento page, Phone Response Report, Privacy page, and Terms page return HTTP 200 after deployment. Confirmed the deployed homepage contains the Privacy and Terms footer links and retains its contact section.
- The sitemap parses as valid XML and `git diff --check` passed before commit. No automated test suite was run for the static footer/legal-page changes.

## Snapshot note

The first commit contained 17 staged files, not only the new website pages. It also captured documentation, pilot-record, and local Supabase configuration changes that were already in the working tree when `push it all` was requested. No embedded credentials were found during the pre-push scan.
