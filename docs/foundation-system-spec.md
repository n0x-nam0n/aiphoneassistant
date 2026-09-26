# AI Phone Foundation System — Specification Sheet

> **Status: Future-facing foundation reference.** For the current single-location event-lead pilot, [`pilot-contract.md`](pilot-contract.md) is authoritative. Reuse only compatible tenant-isolation and caller-safety constraints; do not expand the pilot into the general multi-business router described here.

## Recommended architecture

```text
Voice agent webhook
        ↓
Authenticate + identify business
        ↓
Validate and normalize request
        ↓
Check duplicate/idempotency key
        ↓
Load business configuration
        ↓
Route by request_type
        ↓
Run specialized handler
        ↓
Log action + notify + return result
```

## Standard request envelope

```json
{
  "request_id": "req_123",
  "idempotency_key": "call_456_reservation_1",
  "business_id": "restaurant_001",
  "request_type": "reservation_request",
  "source": "voice_call",
  "source_call_id": "call_456",
  "caller": { "name": "Zach", "phone": "+19165551212" },
  "payload": { "date": "2026-09-25", "time": "19:00", "party_size": 4 }
}
```

## Routing model

Do not route primarily by `business_type`. Keep it as descriptive metadata, but load actual capabilities and policies from business configuration. Do not hardcode logic such as `if restaurant`, `if plumber`, or `if salon`.

```json
{
  "business_id": "restaurant_001",
  "business_type": "restaurant",
  "timezone": "America/Los_Angeles",
  "enabled_request_types": ["reservation_request", "complaint", "general_question"],
  "reservation_policy": { "maximum_standard_party": 8, "confirmation_mode": "human_review" },
  "notification_policy": {
    "reservation_request": ["email"],
    "large_party_request": ["sms", "email"],
    "complaint": ["sms"]
  }
}
```

## First workflow to build

Build only:

```text
reservation_request → validate → store → notify → return pending
```

Initial scope: one restaurant, one webhook, one `reservation_request` handler, Supabase, email/SMS, structured response, and complete failure testing. Preserve the general schema, but do not build restaurants, plumbers, salons, and auto shops simultaneously.

## Reservation request handler

### Party size 8 or fewer

1. Verify required fields.
2. Normalize the restaurant’s local date and time.
3. Reject dates in the past.
4. Check for duplicate requests.
5. Save to Supabase as `PENDING_REVIEW`.
6. Email the restaurant.
7. Return:

```json
{
  "status": "accepted",
  "action": "reservation_request_received",
  "request_id": "req_123",
  "caller_message": "Your request has been sent to the restaurant. It is not confirmed until the restaurant contacts you.",
  "transfer_target": null,
  "retry_allowed": false
}
```

### Party size greater than 8

1. Save as `LARGE_PARTY_REQUEST`.
2. Send SMS and email immediately.
3. Attempt transfer if a manager is available.
4. Return:

```json
{
  "status": "transfer_required",
  "action": "large_party_escalation",
  "request_id": "req_124",
  "transfer_target": "manager",
  "fallback_message": "The events manager has received your request and will follow up."
}
```

### Missing information

```json
{
  "status": "needs_information",
  "missing_fields": ["phone", "party_size"],
  "caller_message": "I still need your telephone number and party size."
}
```

### Internal failure

```json
{
  "status": "failed",
  "error_code": "STORAGE_UNAVAILABLE",
  "caller_message": "I couldn’t submit that request. Let me transfer you or take a message."
}
```

Never expose technical error details to the caller.

## Handler rollout order

1. `general_question`
2. `complaint`
3. `estimate_request`
4. `urgent_service_request`

Avoid a universal request type called `emergency`; it means different things in different domains. Use classifications such as `food_safety_incident`, `water_leak_urgent`, `vehicle_safety_issue`, and `medical_emergency`. Life-threatening situations must immediately direct the caller to emergency services without delaying for marketing information.

## Standard handler outcomes

Every handler returns one of:

- `answered`
- `accepted`
- `needs_information`
- `transfer_required`
- `escalated`
- `not_supported`
- `failed`

Every response contains:

```json
{
  "status": "accepted",
  "action": "reservation_request_received",
  "request_id": "req_123",
  "caller_message": "Approved words for the voice agent",
  "transfer_target": null,
  "retry_allowed": false
}
```

Retell or Vapi stays simple: Stepper returns the authoritative outcome.

## Supabase foundation tables

- `businesses`
- `business_policies`
- `business_contacts`
- `intake_requests`
- `action_attempts`
- `notifications`
- `knowledge_items`
- `audit_events`

Every operational table includes:

- `business_id`
- `request_id`
- `source_call_id`
- `status`
- `created_at`
- `updated_at`
- `idempotency_key`

## Foundation responsibilities

### Authenticate and identify business

Verify the voice agent/webhook where possible, resolve one known `business_id`, and reject unknown or disabled businesses.

### Validate and normalize request

Validate the envelope and handler payload, normalize date/time with the configured business timezone, and reject past dates or invalid values.

### Check duplicate/idempotency key

Check `(business_id, idempotency_key)` before creating an actionable request. A safe retry returns the existing `request_id` and does not duplicate notifications.

### Load business configuration

Load enabled request types, policies, contacts, notification channels, hours, timezone, and transfer settings. Configuration determines behavior; `business_type` is metadata.

### Route and run specialized handler

Run a handler only when its request type is enabled. Unsupported types return `not_supported` or transfer to a human.

### Log, notify, and return

Create internal action/audit records, attempt configured notifications, and return the standard response to the voice agent.

## Branching rule

The accepted condition must gate the storage edge, not the only response path:

```text
Validate and normalize
  ├─ accepted → Store → Notify → accepted response
  ├─ needs_information → clarification response
  ├─ transfer_required → escalation/transfer → caller response
  ├─ not_supported → human transfer or safe explanation
  └─ failed → internal log → caller-safe failure
```

## Safety requirements

- A database entry is not a confirmed reservation.
- Do not create a reservation until a real reservation-platform API returns confirmation.
- Do not claim an estimate, service appointment, or other action is confirmed without authoritative confirmation.
- Never expose technical error details to callers.
- Keep credentials in Stepper connections or a secrets manager.
- Do not paste secrets into chat, code, logs, or caller messages.
- Keep the workflow unpublished until failure testing is complete.
- Do not send live SMS or email during configuration tests.
- Preserve business isolation in every read, write, notification, and audit record.

## Current implementation status

The Stepper draft currently contains:

```text
Webhook
  → Validate business callback request
  → [validator Output → Status equals accepted]
  → Store pending review request (not confirmed)
  → Return reservation review result
```

The validator and accepted-only storage gate are saved in the unpublished draft. Supabase is connected using a custom `reservation_requests` table name. Live database and notification tests remain intentionally skipped until schema mapping and destinations are verified.
