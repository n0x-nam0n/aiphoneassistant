# AI Phone Intake — Session Log

> This log describes a separate unpublished reservation-request Stepper draft. The current Hostess event-lead pilot uses [`docs/pilot-contract.md`](docs/pilot-contract.md); do not treat the reservation schema or workflow as its implementation.

Date: 2026-09-23

## Objective

Create the first reusable Stepper workflow foundation for an AI phone receptionist. The system should receive requests from a voice agent, validate them, store only legitimate requests, and return caller-safe results. It must support multiple business types later, while starting with one test restaurant.

## Decisions made

- Use Supabase for storage.
- Keep `business_id` on operational records so the system can become multi-business.
- Use a standard request envelope instead of routing directly from `business_type`.
- Start with `reservation_request` only.
- A request is never a confirmed reservation merely because it is stored.
- Human review is required before the restaurant confirms anything.
- Future handlers will include general questions, complaints, estimates, and urgent service requests.
- Do not use one universal `emergency` category; use domain-specific urgent categories.
- Do not publish the workflow or run live SMS/email/database tests during setup.

## Work completed

1. Created `/home/wilkes/aiphone`.
2. Renamed the Stepper workflow to `AI Business Call Intake - Human Callback`.
3. Kept the workflow unpublished.
4. Confirmed the Stepper webhook trigger exists.
5. Replaced the old restaurant-specific validator with a reusable request router.
6. Added validation for:
   - `business_id`
   - `request_type`
   - caller name and phone
   - reservation date and time
   - party size
   - past dates
7. Added structured outcomes:
   - `accepted`
   - `needs_information`
   - `transfer_required`
   - `not_supported`
8. Added large-party escalation for parties over eight.
9. Added a Supabase `Create Row` step using the custom table name `reservation_requests`.
10. Added a conditional gate on the validator-to-storage connection. Only validator output with `status = accepted` may reach storage.
11. Named the storage step `Store pending review request (not confirmed)`.
12. Saved the draft and skipped the live Supabase insert test.

## Current Stepper flow

```text
Webhook
  -> Validate business callback request
  -> [status equals accepted]
  -> Store pending review request (not confirmed)
  -> Return reservation review result
```

The validator-only test used Stepper's incomplete sample payload, so it correctly returned `needs_information`. It did not represent a valid reservation request.

## Not completed yet

- Verify the Supabase table schema and field mappings with a safe, non-production test row.
- Add idempotency/duplicate protection.
- Add business configuration and policy lookup.
- Add email notification.
- Add Twilio SMS notification after the Twilio connection and recipient policy are ready.
- Add the alternate `transfer_required` branch for large parties.
- Add a clean response path for `needs_information` and unsupported requests after branching.
- Add knowledge-base handling for general business questions.
- Add automated endpoint tests with sample envelopes.
- Connect the workflow to Retell, Vapi, or another voice platform.

## What would make future setup easier

### Prepare the data contract first

Before opening Stepper, define one example envelope for each outcome: valid request, missing information, large party, unsupported type, duplicate request, and internal failure. This makes field mapping and branch testing much faster.

### Create the Supabase schema before configuring the action

Stepper could not discover the intended table automatically, so the table was entered as a custom name. Create and verify the table first, then refresh Stepper's table options. Use a staging/test table for configuration work.

### Flatten handler output for no-code mapping

The validator returned nested objects such as `caller.name` and `payload.party_size`. A small mapping step that emits flat fields would make Supabase configuration easier:

```json
{
  "business_id": "...",
  "request_id": "...",
  "caller_name": "...",
  "caller_phone": "...",
  "requested_date": "...",
  "requested_time": "...",
  "party_size": 4,
  "storage_status": "PENDING_REVIEW"
}
```

### Build the branch structure before adding integrations

The safe order is:

```text
Validate
  -> accepted -> Store -> Notify -> Return accepted
  -> needs_information -> Return needs information
  -> transfer_required -> Escalate -> Return transfer required
  -> not_supported -> Return not supported
  -> failed -> Return caller-safe failure
```

This prevents a condition from accidentally blocking the caller's response path.

### Use placeholders for missing business settings

Keep manager email, manager phone, timezone, transfer number, and notification preferences in business configuration. Do not hardcode them in action steps or paste credentials into chat.

### Use an explicit staging mode

Add a `environment` or `is_test` setting. During setup, notifications should be disabled or routed to test destinations, and database writes should use a staging table.

### Test code-only branches before live actions

Test the validator and response code first. Only test Supabase, email, SMS, and voice transfer after the field mappings and destinations have been reviewed.

## Important safety rule

The voice agent may say that a request was received. It must not say that a reservation, estimate, service visit, or other business action is confirmed unless the relevant external system returns an actual confirmation.

## Follow-up — 2026-09-25

- Updated the Stepper validator so `needs_information`, `transfer_required`, `not_supported`, and caught validation failures return a common caller-safe response shape. Accepted output keeps the nested caller/payload fields required by the existing Supabase mapping.
- Updated the post-storage response code to emit the same top-level keys and stable caller messages. It never claims the reservation is confirmed and leaves an unknown transfer target null.
- Added `public.reservation_requests` to the linked `aiphoneassistant` Supabase project with a unique request ID and idempotency key, pending-review defaults, test environment default, RLS enabled, and service-role access. Verified the table and columns through a read-only linked query.
- Mapped the Stepper Create Row action to `reservation_requests`, including validator outputs, pending-review status, `confirmed = false`, and `environment = test`. Restored the node name after an accidental editor title change.
- Saved the Stepper workflow draft; it remains unpublished. Skipped Stepper's Run test action because its warning says it may make a live request. No caller data was inserted.
- Duplicate requests still need a lookup/replay branch before Create Row, because the unique idempotency constraint alone would turn retries into insert errors. A Supabase Create Row failure may also stop the workflow before the caller-safe response step. These paths and the expression mappings remain unverified without safe Stepper code-step tests or a controlled test request. Stepper still reports three issues.
- Follow-up test failure shown by Stepper: Create Row rejected `date` because a typed `@Validate ... Payload.Date` string was passed literally. No insert occurred. Corrected the Stepper Create Row mappings using actual field-picker tokens for request ID, idempotency key, business ID, source call ID, request type, caller name/phone, date, time, party size, and notes; removed the old Additional Fields JSON overrides. The date preview now resolves to the mock request date, and party size previews as `2`.
- Updated the validator to JSON-parse a string webhook body when present. A code-only test with a temporary accepted mock request returned `status: accepted`, `request_id: req_call_test_001`, date `2026-10-01`, and party size `2`. Removed the temporary static mock variable before saving. Skipped the Supabase action test, so no row was inserted. Workflow remains unpublished. Stepper's three remaining warnings are missing example data for the validator, storage, and response steps; field bindings still need an end-to-end test before publish.
- Added `Recheck for committed row after insert failure (idempotency)` to the Stepper draft. If Create Row fails or times out, it looks up `reservation_requests` by the validator's `idempotency_key`; a found row routes to a duplicate response using its stored `request_id`, and no row routes to the existing failed-storage response. Stepper reported the graph valid with no warnings and the draft saved. The workflow remains unpublished; no tests, database writes, or live requests were run. This recheck uses a single-column filter, so it depends on the current globally unique `idempotency_key` constraint; a future multi-business design should use an atomic RPC or a `(business_id, idempotency_key)` constraint and matching lookup.
