# SEO Action Plan: restaurantaireceptionist.com

## Update — 2026-10-13

Completed locally: homepage H1 and high-intent FAQs; role-attributed founder biography from the supplied career record; scenario calculator caveats and formula; sourced context and limitations in the phone response report; Sacramento-specific setup guidance; Open Graph/Twitter image metadata; Service-to-Organization provider relation; and current sitemap `lastmod` values for edited pages. No `areaServed` was added because confirmed service coverage is unavailable. The founder's personal name and customer-approved pilot data were unavailable, so no named profile or case study was invented. See [GSC snapshot](GSC-2026-10-13.md) and [backlink baseline status](BACKLINK-BASELINE.md).

Validation performed: source/JSON-LD parse checks, a 390 px mobile screenshot inspection, and a local mobile Lighthouse run. Lighthouse 12.8.2 reported performance 0.78, LCP 3.9 s, CLS 0, and TBT 0 ms after converting the homepage hero to WebP; see [performance record](PERFORMANCE-2026-10-13.md). PageSpeed Insights still returns a daily-quota HTTP 429; Search Console reports no Core Web Vitals field data, so field INP remains unavailable. The six GSC excluded-page reasons and manual-action status were not present in the supplied snapshot. Changes are local and have not been published.

## High priority — next 1–2 weeks

1. **Confirm search visibility in Google Search Console.** Run URL Inspection for all sitemap URLs and check index coverage, queries, impressions, and manual actions. The public search sample did not surface the domain, but it cannot establish whether pages are indexed.
2. **Rewrite the homepage H1 to describe the offer.** Suggested: “Restaurant AI receptionist for overflow and event calls.” Keep “Every call. Answered.” as a tagline.
3. **Publish verifiable expertise and pilot evidence.** Founder profile is now attributed to the documented Hostess founder role and career history. Remaining: add the founder's name and a customer-approved case study documenting call volume, qualified event leads, follow-up, conversion, and period; distinguish measured results from estimates.
4. **Strengthen the Sacramento landing page with distinct local value.** Added a Sacramento-specific pilot and location-level routing/setup description. Remaining: document verified coverage and local customer/partner evidence when available. Do not replicate the page across cities with only place names changed.

## Medium priority — next month

5. **Source the phone-response report.** Added a linked National Restaurant Association technology survey for limited context and explicitly stated what it does not measure. Published the calculator formula, inputs, scenario math, and limitations.
6. **Expand high-intent answers on the homepage.** Added answers for routing/setup, integrations, escalation, supported call types, pricing/setup fees, failure/rollback, and pilot measurement.
7. **Complete entity and social metadata.** Added an OG image and Twitter card to the homepage, Sacramento page, and report. Connected the `Service` schema to the `Organization` via `provider`; omitted `areaServed` pending verified coverage.
8. **Measure mobile performance.** Captured local mobile Lighthouse results and inspected a 390 px rendered screenshot. PSI remained quota-limited; GSC has no field data. A WebP hero asset reduced image weight from 2.1 MB PNG to 156 KB; fresh post-change metrics are in `PERFORMANCE-2026-10-13.md` (once recorded). Field INP requires fresh CrUX/GSC data.
9. **Start a backlink baseline.** Recorded that a baseline is not established because no reliable backlink export/index was available; documented required data and the no-disavow-without-evidence rule in `BACKLINK-BASELINE.md`.

## Ongoing guardrails

- Keep factual claims and calculator outputs sourced or explicitly labeled as estimates.
- Keep one Sacramento page only if it reflects actual service coverage and unique local details; avoid thin, templated doorway pages.
- Avoid purchased followed links, PBNs, automated directory/comment links, hidden text, cloaking, keyword stuffing, and scaled low-value pages. See [Google's spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

## Validation checklist

- GSC confirms preferred URLs are indexed and no manual action/security issue exists.
- Homepage H1 states the service category and is consistent with title and visible offer.
- Sacramento copy contains details a local customer can verify and is not a city-name swap template.
- Case study and report claims cite sources or show methodology and assumptions.
- Schema validator accepts JSON-LD and visible pricing matches the Offer.
- PSI/CrUX and mobile browser checks provide fresh LCP, INP, CLS, and layout evidence.
- Backlink baseline has been reviewed before any disavow or cleanup action.
