# AI Phone Intake — Session Log

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

