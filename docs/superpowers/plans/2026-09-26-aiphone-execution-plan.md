# Hostess Overflow Pilot Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a safe, measurable overflow phone pilot that captures private dining, catering, and large-party opportunities for 3–5 independent restaurants without replacing their event CRM.

**Architecture:** Keep the static website as marketing/demo and add a private, single-location owner desk backed by Supabase Auth and owner-membership RLS. The external voice agent and Stepper workflow submit to trusted server-side Supabase RPCs that atomically save leads and an email outbox row. Conditional overflow routing remains disabled until location release checks pass; human review remains authoritative for every booking and transfer.

**Tech Stack:** Existing static HTML/CSS/JavaScript and GitHub Pages; existing Supabase project; Stepper workflow draft; Retell or Vapi and carrier forwarding selected for the pilot after validation. No new framework or dependency is assumed.

**Spec:** `docs/restaurant-revenue-desk-build-plan.md`, with constraints from `docs/v2.md`, `docs/foundation-system-spec.md`, `docs/webhook-response-contract.md`, and `docs/GAPS.md`.

## Review Summary

- `index.html` and `demo.html` now present Hostess as overflow-first private-events lead capture. `demo.html` is a static illustrative handoff, not a live voice or lead-management flow.
- The public marketing form writes only to `contact_submissions`. The new private owner desk reads the pilot tables through authenticated RLS and has no public sign-up.
- `supabase-schema.sql` defines the public contact-submission flow. The earlier migration creates `reservation_requests`; the new pilot migration creates tenant-scoped organizations, locations, calls, leads, memberships, and notification outbox records.
- `session-log-2026-09-23.md` records an unpublished Stepper reservation workflow. It is not the newer event-lead pilot and should not be treated as production-ready. It notes remaining limits around duplicate handling, tenant-safe idempotency, and end-to-end verification.
- The repository now includes a private owner desk, pilot data contract, tenant-scoped schema/RPC, reusable carrier runbook, onboarding checklist, and acceptance matrix. External voice-provider configuration, Stepper workflow, notification delivery, and live forwarding evidence remain outstanding.
- The worktree has existing uncommitted document moves/changes (`GAPS.md`, `foundation-system-spec.md`, `nextstep.md`, `pricing.md`, and `voice.md` moved under `docs/`, plus edits to the session log and new docs/Supabase files). Preserve and review those changes; do not reset or overwrite them.
- There are two Supabase config files (`supabase/config.toml` and `supabase/supabase/config.toml`); determine whether the nested copy is intentional before removing or relying on it.
- The owner desk is implemented in `desk.html`, `desk.css`, and `desk.js`; the migration defines owner membership and RLS. It remains unusable until the migration is applied to the correct project and an owner account/membership is provisioned.

## Global Constraints

- “Overflow is the default paid deployment. Dedicated events numbers are used for demos and optional customer routing.”
- “Recording is off by default.”
- “Phone is required to create a lead. Email is optional enrichment. Budget is optional enrichment and may be ‘unknown.’”
- “Manual onboarding and manual invoicing are acceptable for the first 3–5 pilots; no Stripe or generalized admin system is required.”
- “Keep the schema forward-compatible and tenant-safe for organizations, locations, and future roles, but deliberately build single-location UX with one owner role in v1.”
- “Each location must store `forwarded_main_number` and `human_transfer_number` as distinct fields.”
- “Activation is blocked until the transfer destination is configured and tested.”
- “No event availability or booking is promised by the assistant.”
- “Do not freeze the product architecture until the restaurant-call validation gate passes.”

## Review Focus

- Demand may be too low or arrive through other channels: interview 10–20 restaurants and record observed call volume/channel mix; proceed only if the documented gate in the build plan passes.
- Forwarding or human transfer may route back to the AI: test the actual carrier configuration and reject equal or known-loop destinations before activation.
- Caller, lead, or configuration data may cross restaurant boundaries: test tenant scoping for every read, write, notification, and export before pilot data is accepted.
- Voice agent may overstate a result when storage, notification, or transfer fails: exercise every response branch and failure mode; caller wording must describe only verified actions.
- Recording/transcription may be enabled without an approved policy: verify recording is disabled by default and cannot be enabled without a location policy and reviewed disclosure.

---

## Execution Sequence

### Phase 0 — Validate the wedge and freeze the decision

**Gate result:** Passed on 2026-09-26 by explicit product-owner direction. `docs/validation-results.md` records this authorization; underlying interview notes/metrics are maintained outside this repository and have not been inferred here.

#### Task 1: Conduct and record restaurant interviews

**Files:**
- Create: `docs/validation-results.md`
- Reference: `docs/restaurant-revenue-desk-build-plan.md` Phase 0
- Update after interviews: `session-log-2026-09-23.md` only if it remains the chosen session-log location

- [x] Accept the product owner's confirmation that Phase 0 is complete and the project is a go.
- [x] Record the decision and its evidence boundary in `docs/validation-results.md`; do not invent or infer interview metrics.

**Exit criterion:** The owner-approved go decision is recorded. Any external interview evidence remains in the business record system; no unsupported metrics are attributed to it here.

### Phase 1 — Resolve product and operational decisions

#### Task 2: Reconcile the active product contract

**Files:**
- Modify: `docs/restaurant-revenue-desk-build-plan.md`
- Modify or mark superseded: `docs/nextstep.md`, `docs/foundation-system-spec.md`, `docs/webhook-response-contract.md`, `docs/GAPS.md`, `docs/v2.md`
- Reference: `session-log-2026-09-23.md`

- [x] Mark the relevant docs active or historical without deleting their contents.
- [x] Adopt the event-lead contract and identify the reservation-specific Stepper draft/schema as historical for this pilot.
- [x] Define the request/lead envelope and six supported outcome states.
- [x] Define required phone, optional caller/event data, tenant identifiers, idempotency key, lifecycle state, and timestamps.
- [x] Keep single-location owner UX and tenant-isolated backend; defer generalized multi-business routing and multi-location UI.
- [x] Record disclosure, recording/transcript, retention, human fallback, export, and cancellation boundaries.

**Exit criterion:** One clearly marked active contract governs voice intake, storage, notifications, exports, and acceptance testing; historical reservation instructions cannot be mistaken for the current build.

#### Task 3: Complete onboarding and rollback runbooks

**Files:**
- Create: `docs/pilot-onboarding-checklist.md`
- Create: `docs/phone-routing-runbook.md`
- Create: `docs/pilot-acceptance-tests.md`

- [x] Create the reusable onboarding packet for approved knowledge, escalation, privacy, retention, and CRM handoff.
- [x] Create the carrier runbook with route inventory, activation evidence, rollback steps, and outage behavior; fill in carrier-specific instructions per restaurant before activation.
- [x] Keep AI, forwarded-main, and human-transfer destinations distinct and document loop checks.
- [x] Define manager rollback and restore behavior without developer-only access.
- [x] Create a versioned acceptance matrix covering caller response, storage, transfer, privacy, and safety behavior.

**Exit criterion:** Reusable artifacts are ready. A restaurant-specific packet and live rollback verification remain required before that location activates.

### Phase 2 — Build the narrow overflow intake path (only after Phase 0 go)

#### Task 4: Implement tenant-safe lead storage and webhook outcomes

**Files:**
- Create: `supabase/migrations/20260926120000_create_pilot_leads.sql`
- Modify: `supabase/config.toml` only for required local/test setup
- Create: `docs/stepper-workflow-contract.md` to record the selected pilot workflow's RPC contract and link to its externally hosted draft
- Test: `docs/pilot-acceptance-tests.md` and automated tests colocated with any server-side handler if one is introduced

- [x] Create the calls/leads schema with tenant-scoped foreign keys and RLS; deny anonymous data access.
- [x] Enforce location-scoped idempotency in an atomic accepted-lead RPC; replay the prior request ID for duplicate deliveries.
- [x] Resolve organization/location from trusted server configuration; reject missing/inactive location IDs and never accept caller-controlled status or notification destinations.
- [ ] Implement and connect terminal Stepper responses for every contract outcome.
- [x] Gate lead storage on accepted, complete requests; the RPC atomically stores lead and outbox or rolls the transaction back.
- [x] Store notification delivery as an outbox row so delivery failures do not erase an accepted lead; caller wording does not claim an email was sent.
- [ ] Provision separate test/production destinations and keep live routing disabled until all release gates pass.

**Exit criterion:** Each contract outcome has a verified response; accepted leads are saved once; duplicate/retry and partial failure paths do not create duplicate leads or false claims.

#### Task 5: Configure one voice agent and validate telephony routing

**Files:**
- Create: `docs/voice-agent-config.md` with the provider configuration, version/export reference, and prompt approved for the pilot
- Modify: `docs/phone-routing-runbook.md`
- Modify: `docs/pilot-acceptance-tests.md`

- [ ] Select one provider based on measured interruption-to-response latency, safe webhook integration, transfer behavior, exportability, and pilot cost; start with a licensed stock voice.
- [ ] Configure AI disclosure, approved-knowledge-only answers, event qualification, callback capture, human request handling, interruptions/silence, and stop-after-repeated-misunderstanding behavior.
- [ ] Connect the webhook and map the voice agent to speak only the returned caller message.
- [ ] Configure overflow forwarding while preserving the restaurant's original number and normal ringing behavior.
- [ ] Verify transfer target separation and live loop-prevention behavior with restaurant-approved test numbers.
- [ ] Test vendor/webhook outage behavior, transfer unanswered, caller hangup, and manager-triggered AI disable.

**Exit criterion:** A controlled test call traverses the real unanswered-forwarding path, produces the expected lead or safe fallback, and can be rolled back by the restaurant manager.

#### Task 6: Build the single-location owner inbox

**Files:**
- Create: `desk.html`
- Create: `desk.css`
- Create: `desk.js`
- Modify: `config.example.js`
- Modify: `supabase/migrations/20260926120000_create_pilot_leads.sql`

- [x] Add invited-owner sign-in with no public sign-up flow.
- [x] Add account password reset and invite password setup through Supabase Auth redirects.
- [x] Add owner-scoped reads of organizations, locations, calls, and leads through RLS.
- [x] Add lead follow-up status updates, search/filter, recent-call log, and CSV export.
- [x] Restrict authenticated lead updates to status/timestamp columns; keep caller/event details read-only.
- [x] Escape caller-controlled text through DOM `textContent` and neutralize spreadsheet formula prefixes in CSV output.
- [ ] Apply the migration to a controlled Supabase project and provision an owner account/membership before calling the portal operational.

**Exit criterion:** After migration and owner provisioning, an invited owner sees only the assigned organization/location and can update only follow-up status.

#### Task 7: Add staff notification delivery

**Files:**
- Modify: `docs/stepper-workflow-contract.md` and the external workflow
- Modify: intake workflow/configuration from Task 4
- Create: `docs/pilot-data-export.md` with the CSV columns, ownership, and deletion/export procedure
- Test: notification/export cases in `docs/pilot-acceptance-tests.md`

- [ ] Send a minimal structured staff notification only after the lead write is confirmed.
- [ ] Document the owner desk's all-accessible-leads CSV export, tenant isolation, and customer deletion/export procedure; do not build a generalized CRM.
- [ ] Add the restaurant's chosen CRM handoff only if an interview-confirmed pilot requires it; prefer email/CSV first.
- [ ] Test notification provider outage, duplicate event delivery, malformed optional fields, and export isolation.

**Exit criterion:** Staff can reliably follow up from a notification or export, and no notification/export exposes another restaurant's data.

### Phase 3 — Prove pilot readiness and run a measured pilot

#### Task 8: Pass safety, privacy, and operations gates

**Files:**
- Update: `docs/pilot-acceptance-tests.md`
- Update: `docs/pilot-onboarding-checklist.md`
- Create: `docs/pilot-release-record.md`

- [ ] Verify every lead is stored exactly once under retries; every response branch returns promptly; all failures produce caller-safe wording.
- [ ] Verify zero false event/reservation confirmations, 100% safe escalation for allergen and urgent safety cases, human assistance on request, and no cross-tenant data exposure.
- [ ] Confirm recording remains off unless a location-specific policy and approved disclosure are active; confirm transcript retention/deletion behavior.
- [ ] Confirm restaurant staff can disable forwarding, restore original routing, export data, and request deletion without developer-only access.
- [ ] Review customer agreement terms covering scope, number ownership, usage cap/overages, data, outage behavior, support, and termination before enabling production calls.
- [ ] Capture measured end-to-end latency, vendor cost, transfer completion, failure rate, and support burden; require positive pilot economics before expanding scope.

**Exit criterion:** Every release gate is recorded as pass with evidence, or the pilot remains in test mode.

#### Task 9: Run 3–5 pilots for 30 days and decide what to build next

**Files:**
- Create: `docs/pilot-results.md`
- Reference: baseline/decision in `docs/validation-results.md`

- [ ] Start with the agreed restaurants, usage limits, and approved call-routing windows.
- [ ] Track calls received/missed, qualified event leads, lead value where known, response time, completed transfers, failures, knowledge gaps, support hours, and all-in costs.
- [ ] Review incidents and caller/staff feedback weekly; pause the affected route on any safety, privacy, or loop issue.
- [ ] At day 30 compare outcomes with each restaurant's baseline and report realized value without claiming causality beyond the observed data.
- [ ] Decide whether to continue, change channels, adjust scope/pricing, or stop. Build multi-location, broad CRM, billing, and outbound automation only when pilot evidence makes each necessary.

**Exit criterion:** A documented pilot decision is supported by measured outcomes and updated unit economics.

## Handoff

Phase 0 is passed by product-owner direction. Local schema and owner-desk source are drafted; no automated tests were added or run. The migration has not been applied, owner accounts/memberships have not been provisioned, and the external Stepper/voice/carrier/notification integrations remain incomplete. Production activation remains gated on the per-location release record.
