# Restaurant Revenue Desk — Validation-Gated Build Plan

Status: Phase 0 go decision recorded on 2026-09-26 in [`validation-results.md`](validation-results.md), per product-owner direction. The narrow pilot scope below is active; production call routing remains gated on per-location release checks.

## Outcome

Sell and operate a narrow overflow-first AI phone capture service for event-capable independent restaurants. The paid product intercepts calls that would otherwise go unanswered; the dedicated events line is the personalized sales/demo surface. The first release captures, qualifies, routes, and exports opportunities without attempting to become an event CRM.

## Evidence and decisions

- The current spec explicitly calls for 10–20 restaurant interviews before building the entire dashboard (`aiphone/v2.md:917-938`).
- Overflow is now explicitly the paid default; the dedicated line is retained for demos and optional routing (`aiphone/v2.md:448-462`, `aiphone/v2.md:1005-1028`).
- The current website/demo is reservation-oriented: table requests, pending review, large-party handling, and reservation policy (`aiphone/index.html:110-123`, `aiphone/demo.html:17-21`).
- The repo describes the website as a static demo (`aiphone/README.md:1-11`), so the public demo is not evidence that production telephony, notifications, transcripts, or pipeline persistence exist.
- Existing implementation notes already require overflow routing, safe response branches, idempotency, failure handling, allergen escalation, and recording/transcription policy (`aiphone/GAPS.md:20-44`, `aiphone/GAPS.md:63-96`, `aiphone/GAPS.md:137-160`).

## Phase 0 — Validate the wedge before freezing scope

Interview 10–20 event-capable independent restaurants. Do not pitch a price first. Record observed numbers, not opinions.

Capture for each restaurant:

1. Event/private-dining/catering calls per month.
2. Share of event inquiries arriving by phone, web form, email, and social DM.
3. Missed calls during service and what happens to them.
4. Current event CRM, especially Tripleseat, Perfect Venue, spreadsheets, inboxes, or voicemail.
5. Average event value and response-time expectations.
6. Required qualification fields and fields callers refuse to provide.
7. Whether overflow forwarding is operationally possible.
8. Which carrier/device owns the existing number and how unanswered/busy forwarding is configured.
9. AI disclosure, recording, transcript, and human-escalation objections.
10. Whether the restaurant would accept a manual, human-assisted onboarding process.

Validation gate:

- Proceed only if the median target restaurant reports at least approximately 8 qualifying event calls per month, phone-originated demand is sufficient for a credible ROI story, and at least three restaurants agree to a measured pilot or provide call-volume evidence.
- Kill the phone-first build if the median is below approximately 8 qualifying event calls per month; pivot to web/email/social intake instead of rationalizing around outliers.
- If phone is not a meaningful channel, stop and revise the product toward web/email/social intake before building telephony depth.
- If most targets already use an event CRM, position the product as the phone capture layer that feeds it; keep the local lead table as a fallback, not the moat.

Deliverable: `aiphone/validation-results.md` containing anonymized interview evidence, channel mix, median call volume, current systems, and the go/no-go decision.

## Phase 1 — Day-one constraints

1. Overflow is the default paid deployment. Dedicated events numbers are used for demos and optional customer routing.
2. Recording is off by default. Transcription/storage policy is explicit per pilot, with legal review before enabling recording in relevant jurisdictions.
3. Every call opens with an AI disclosure approved for the pilot. Human/non-recorded fallback behavior must be defined.
4. Phone is required to create a lead. Email is optional enrichment. Budget is optional enrichment and may be “unknown.”
5. Included minutes and overage are set only after bottom-up provider-cost modeling. Initial planning range: 100–150 included minutes, hard overage rate, no unlimited usage.
6. The product must export or hand off to the customer’s existing event CRM where applicable. No attempt to replace Tripleseat or Perfect Venue in v1.
7. Manual onboarding and manual invoicing are acceptable for the first 3–5 pilots; no Stripe or generalized admin system is required.
8. Conditional carrier forwarding is the default overflow mechanism. Maintain per-carrier setup/rollback sheets, verify with live test calls, monitor forwarding health, prevent transfer loops, and use porting only as a fallback when forwarding is unreliable and explicitly accepted by the customer.
9. Keep the schema forward-compatible and tenant-safe for organizations, locations, and future roles, but deliberately build single-location UX with one owner role in v1. No organization management, multi-location screens, team invitations, user management, or role-gating UI belongs in the first release. Backend/database tenant isolation remains mandatory.
10. Each location must store `forwarded_main_number` and `human_transfer_number` as distinct fields. Require `human_transfer_number != forwarded_main_number`, require the transfer number to differ from the AI inbound number, and reject known indirect routes back into the AI. Activation is blocked until the transfer destination is configured and tested.

## Phase 2 — Smallest sellable product

### Customer-facing workflow

`Existing restaurant number → normal ring → unanswered/after-hours forward → AI disclosure → intent triage → event/catering/large-party qualification → safe acknowledgment → staff notification → CSV/export or CRM handoff`

Forwarding is an operations workstream, not an implementation detail. The pilot must document the original routing, backup number, carrier-specific activation steps, rollback steps, and a live verification call before launch.

### Product surface

- One calls table with caller, timestamp, intent, duration, result, transfer state, and safe summary.
- One leads table with name, phone, optional email, event date/time, party size, event type, notes, status, estimated value when known, and source.
- Status dropdown only: New, Contacted, Qualified, Won, Lost.
- Email notification containing the structured lead and call summary.
- CSV export.
- Configurable overflow and dedicated-line routing using `forwarded_main_number`.
- Human transfer/callback path and emergency AI-disable switch.
- Single-location UI with one owner role; schema remains tenant-safe and forward-compatible for future organizations, locations, and roles without exposing those workflows in v1.
- Verified knowledge intake handled manually by the operator for the first pilots.
- Graceful degradation when tools fail: never promise an SMS, email, transfer, or saved request unless completion is verified; speak a fallback message and create an internal alert/callback task.

### Explicitly deferred

- Kanban board, analytics pages, multi-location org hierarchy, role matrix, billing status, native apps, full CRM, automated proposal workflows, broad integrations, social messaging, and generalized no-code agent configuration.

## Phase 3 — Build sequence after validation

1. Freeze the call/lead schema around phone-first capture and optional enrichment.
2. Complete all webhook outcomes and caller-safe responses, including duplicate and failure paths (`aiphone/nextstep.md:5-41`, `aiphone/GAPS.md:63-74`).
3. Implement conditional carrier forwarding operations, per-carrier setup/rollback documentation, live verification, loop prevention, fail-open rollback to the restaurant’s original phone flow, and transfer-state distinctions (`aiphone/v2.md:480-498`, `aiphone/GAPS.md:20-44`, `aiphone/nextstep.md:171-180`).
4. Add the verified knowledge intake checklist and manual onboarding packet (`aiphone/GAPS.md:186-206`).
5. Implement the calls table, leads table, status dropdown, notification email, and CSV export.
6. Add the dedicated demo number using the same agent with a different routing configuration.
7. Run scripted voice tests for latency, interruption handling, silence, dates, party sizes, transfer failures, duplicate webhooks, allergens, unsupported requests, and prompt injection (`aiphone/GAPS.md:208-232`).
8. Pilot with 3–5 restaurants for 30 days and measure calls received, missed calls, event leads, qualified value, bookings, transfer rate, AI errors, response time, and support hours (`aiphone/v2.md:940-960`).

## Acceptance criteria

- 100% of calls disclose AI status according to the approved pilot policy.
- Recording/transcription never activates unless explicitly enabled for that location and policy.
- Phone-only leads can be created without an email or budget.
- No call can claim a reservation, event booking, or transfer succeeded unless an authorized system/person confirms it.
- Each accepted lead is stored exactly once, including webhook retries.
- Every webhook branch returns a caller-safe response promptly.
- Tool failure never produces an unverified promise of SMS, email, transfer, or persistence; the caller receives a fallback statement and staff receive an internal alert/callback task.
- A caller can request a human and receive a defined transfer or callback path.
- The per-location `human_transfer_number` is not the `forwarded_main_number`, the AI inbound number, or a known indirect route back into the AI.
- Invalid transfer configurations are rejected, and activation is blocked until both overflow forwarding and human transfer pass live loop-prevention tests.
- If safe transfer cannot complete, the agent stops retrying and collects a callback request.
- A restaurant can disable AI routing and return to its original call flow.
- Staff receive a structured email and can export all calls/leads as CSV.
- Pilot economics are positive after telephony, voice, LLM, storage, notification, and support costs.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Too few event calls arrive by phone | Validate channel mix before build; pivot to web/email/social intake if needed. |
| Existing event CRM owns the workflow | Integrate by email/CSV first; sell phone capture above the CRM. |
| Compliance exposure | Recording off by default, AI disclosure, legal checklist, retention/deletion policy, human fallback. |
| Voice costs exceed price | Model p50/p95 call duration and all-in per-minute cost; cap minutes and charge overage. |
| Latency harms caller experience | Select provider using measured interruption-to-response latency, not feature lists alone. |
| Knowledge is stale or multimodal | Human-assisted onboarding and explicit restaurant approval before activation. |

## Freeze point

Do not revise `v2.md` into a final build specification until Phase 0 produces the validation artifact and the go/no-go decision. The first code milestone after approval is the overflow-safe intake path, not the dashboard.
