# AI Phone Intake Webhook Response Contract

> **Status: Reservation-request contract for the unpublished Stepper test draft.** The active event-lead contract is [`pilot-contract.md`](pilot-contract.md); update the external workflow to that contract before using it for the pilot.

Version: 1.0  
Scope: Stepper reservation intake workflow, test environment

Every validator outcome must reach exactly one terminal webhook response. Use the same JSON fields for every outcome so the voice agent can handle them predictably.

## Response fields

| Field | Type | Meaning |
|---|---|---|
| `status` | string | `accepted`, `needs_information`, `transfer_required`, `not_supported`, `failed`, or `duplicate` |
| `action` | string | Stable machine-readable outcome name |
| `request_id` | string or null | Request identifier when available |
| `caller_message` | string | Safe sentence for the voice agent to speak verbatim |
| `missing_fields` | string array | Required fields still needed; empty when none |
| `transfer_target` | string or null | Approved transfer target; never caller-controlled |
| `retry_allowed` | boolean | Whether the voice agent may retry the webhook |

Do not add credentials, internal error details, or unverified business claims to the caller message. A stored request is pending review and is not a confirmed reservation.

## Terminal responses

### Accepted

Return only after the pending request has been stored or an existing idempotent result has been found.

```json
{
  "status": "accepted",
  "action": "reservation_request_received",
  "request_id": "req_test_001",
  "caller_message": "Your reservation request was sent to the restaurant for review. It is not confirmed yet.",
  "missing_fields": [],
  "transfer_target": null,
  "retry_allowed": false
}
```

### Needs information

Do not write a reservation row. List the missing field names and ask the caller for them.

```json
{
  "status": "needs_information",
  "action": "collect_missing_reservation_details",
  "request_id": null,
  "caller_message": "I still need your phone number to send this request to the restaurant.",
  "missing_fields": ["caller_phone"],
  "transfer_target": null,
  "retry_allowed": false
}
```

### Transfer required

This means a human handoff is needed; it does not claim that the transfer connected. If transfer is attempted later, report its outcome separately.

```json
{
  "status": "transfer_required",
  "action": "human_review_required",
  "request_id": null,
  "caller_message": "For a party this size, the restaurant needs to help you directly. I can try to connect you now.",
  "missing_fields": [],
  "transfer_target": null,
  "retry_allowed": false
}
```

Keep `transfer_target` null until a trusted business configuration lookup provides an approved destination. If none is configured, return the same outcome with a caller message offering the approved callback route.

### Not supported

Do not write a reservation row. Offer human assistance without implying the request was submitted.

```json
{
  "status": "not_supported",
  "action": "human_assistance_offered",
  "request_id": null,
  "caller_message": "I can’t handle that request here. I can try to connect you with the restaurant for help.",
  "missing_fields": [],
  "transfer_target": null,
  "retry_allowed": false
}
```

### Failed

Use for an internal error or unavailable dependency. Do not expose raw exception text. Set `retry_allowed` only when the caller or voice platform can safely retry with the same idempotency key.

```json
{
  "status": "failed",
  "action": "request_not_processed",
  "request_id": null,
  "caller_message": "I couldn’t send that request just now. Please try again or contact the restaurant directly.",
  "missing_fields": [],
  "transfer_target": null,
  "retry_allowed": true
}
```

### Duplicate

Return the existing request result for the same idempotency key. Never create a second row. The caller message must reflect the original result and must not claim confirmation.

```json
{
  "status": "duplicate",
  "action": "reservation_request_already_received",
  "request_id": "req_test_001",
  "caller_message": "The restaurant has already received your request for review. It is not confirmed yet.",
  "missing_fields": [],
  "transfer_target": null,
  "retry_allowed": false
}
```

## Workflow branch map

```text
Webhook
  → Validate request and business
      ├─ accepted → map trusted storage fields → idempotency check
      │              ├─ existing → return duplicate
      │              └─ new → store pending request
      │                             ├─ stored → return accepted
      │                             └─ insert failed → recheck idempotency key
      │                                                ├─ found → return duplicate
      │                                                └─ not found → return failed
      ├─ needs_information → return needs_information
      ├─ transfer_required → return transfer_required
      ├─ not_supported → return not_supported
      └─ failed / storage error → return failed
```

Every route must terminate in one webhook response. Storage must only be reachable for `accepted`; failed storage must never return `accepted`.

## Manual verification checklist

- [ ] Each status produces valid JSON with every required field and the expected value types.
- [ ] Only `accepted` reaches storage.
- [ ] Duplicate idempotency keys return the prior request and create no extra row.
- [ ] If Create Row fails, a second lookup returns duplicate when the row committed, otherwise failed.
- [ ] Large-party requests do not claim that a transfer connected.
- [ ] No response says a reservation is confirmed.
- [ ] Failure messages do not reveal internal exception details.
- [ ] Every branch reaches a webhook response.
- [ ] Workflow remains unpublished and uses test configuration.
