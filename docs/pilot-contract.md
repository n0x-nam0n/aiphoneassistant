# Hostess Pilot Contract

**Status:** Active contract for the first event-lead pilot. This narrows the broader, future-facing AI phone foundation documents.

## Pilot boundary

The pilot handles unanswered and approved after-hours calls for one restaurant location. It qualifies private dining, catering, and large-party opportunities, captures a callback path, and hands the result to restaurant staff. It does not replace the restaurant's event CRM, answer from unapproved knowledge, take payment details, place reservations, or promise that an event is available or booked.

The customer experience is single-location with one owner contact. Storage and all backend operations remain tenant-scoped so a later multi-location product cannot expose another restaurant's records.

## Intake envelope

The voice provider sends a request to the trusted workflow. Trusted identifiers and settings are resolved from server-side configuration, not caller speech.

```json
{
  "request_type": "event_lead",
  "source": "voice_call",
  "source_call_id": "call_123",
  "idempotency_key": "call_123:event_lead:1",
  "caller": {
    "name": "Alex Example",
    "phone": "+15555550123"
  },
  "event": {
    "type": "private_dining",
    "date": "2026-11-12",
    "time": "18:30",
    "party_size": 35,
    "budget": null,
    "email": null,
    "notes": "Company dinner; date is flexible"
  }
}
```

### Validation and trusted fields

- `caller.phone` is required to create a lead; email and budget are optional and may be unknown.
- Validate and normalize event date/time using the configured location time zone. Missing or uncertain optional details remain null/unknown; do not invent values.
- `organization_id`, `location_id`, environment, lead status, notification destination, approved transfer target, and retention policy come from trusted server-side configuration.
- Every write uses a stable idempotency key scoped to the location. A retry replays the existing outcome and does not duplicate a lead or notification.
- Never store full payment card numbers, security codes, or PINs. The agent directs payment requests to the restaurant's approved human or hosted payment flow.

## Outcome contract

Every outcome returns one JSON object with these top-level fields:

```json
{
  "status": "accepted",
  "action": "event_lead_received",
  "request_id": "req_123",
  "caller_message": "I’ve recorded your event inquiry for the restaurant to review. Nothing is booked yet.",
  "missing_fields": [],
  "transfer_target": null,
  "retry_allowed": false
}
```

Allowed `status` values: `accepted`, `needs_information`, `duplicate`, `transfer_required`, `not_supported`, and `failed`.

- `accepted`: return only after the lead is stored or the previously stored idempotent result is retrieved. Do not imply that a staff notification was sent unless its delivery is confirmed.
- `needs_information`: request caller phone if absent; do not create a lead until there is a callback path.
- `duplicate`: return the original request identifier and accurate prior outcome; do not create another lead or send another notification.
- `transfer_required`: means a human handoff is needed, not that the call connected. Use only a trusted, verified destination. If transfer is not available, offer the approved callback path.
- `not_supported`: do not create a lead that implies acceptance; offer the human fallback.
- `failed`: use a generic caller-safe message. Never expose internal errors. Permit retries only when the same idempotency key is reused safely.

All branches must terminate promptly with this response shape. A stored lead is `New`/pending human follow-up; it is not a confirmed booking. Notification or transfer success must not be claimed unless independently verified.

## Lead record

Required: organization, location, caller phone, source call, idempotency key, request ID, status, timestamps. Optional: caller name, email, event date/time, party size, event type, notes, budget estimate, safe call summary, transfer state, and notification state.

Lead status values are `New`, `Contacted`, `Qualified`, `Won`, and `Lost`. Event state and transfer state are separate from lead status. No voice-agent input can set a lead to `Won` or mark an event confirmed.

## Privacy and operations

- Recording and transcript retention are off by default. A location-specific approved policy and disclosure are required before any recording or transcript storage is enabled.
- Store only information needed to follow up. Staff handoff and CSV export are tenant-scoped and use the minimum data needed.
- Preserve the customer's existing number and normal ring path. Keep the forwarded main number, AI number, and human transfer number distinct; reject known direct or indirect loops.
- A restaurant manager must be able to disable AI routing and restore the original phone flow without developer access.
- Secrets remain in server-side secret storage/provider connections. Never put service-role credentials in browser code or prompts.
