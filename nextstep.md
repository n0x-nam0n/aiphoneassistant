# Next Steps — AI Phone Foundation

This is a strong session log. The foundation is correctly scoped, and the workflow remains safely unpublished. The most important next step is not notifications or Retell—it is completing every response branch so the webhook always returns a valid caller-safe response.

## Next work order

### 1. Complete all response branches

```text
Validate
├── accepted
│   └── Store → Return accepted
├── needs_information
│   └── Return missing fields
├── transfer_required
│   └── Log escalation → Return transfer instructions
├── not_supported
│   └── Return human-assistance option
└── failed
    └── Return generic failure
```

Every path must terminate in a webhook response. Otherwise, the voice agent may wait, time out, repeat itself, or tell the caller something inaccurate.

### 2. Freeze the response contract

Every branch should return the same top-level structure:

```json
{
  "status": "accepted",
  "action": "reservation_request_received",
  "request_id": "req_123",
  "caller_message": "Your request was sent to the restaurant for review. It is not confirmed yet.",
  "missing_fields": [],
  "transfer_target": null,
  "retry_allowed": false
}
```

Only the values should change between outcomes.

### 3. Create the staging Supabase schema

Recommended `reservation_requests` columns:

| Column | Type | Requirement |
|---|---|---|
| `id` | UUID | Primary key |
| `request_id` | Text | Unique |
| `idempotency_key` | Text | Unique |
| `business_id` | Text or UUID | Required |
| `source_call_id` | Text | Required |
| `caller_name` | Text | Required |
| `caller_phone` | Text | Required |
| `requested_date` | Date | Required |
| `requested_time` | Time | Required |
| `party_size` | Integer | Required |
| `status` | Text | Default `PENDING_REVIEW` |
| `environment` | Text | `test` or `production` |
| `created_at` | Timestamp | Server-generated |
| `updated_at` | Timestamp | Server-generated |

Enforce:

- `party_size > 0`
- `status IN (PENDING_REVIEW, LARGE_PARTY_REVIEW, CONFIRMED, DECLINED, CANCELLED)`
- `environment IN (test, production)`

Do not use the storage record itself as evidence of confirmation.

### 4. Add the flattening step

Add this between validation and Supabase:

```text
Validate
  → accepted
  → Map accepted request for storage
  → Duplicate check
  → Store
```

The mapping step should add server-controlled values such as:

```json
{
  "request_id": "req_123",
  "idempotency_key": "call_456:reservation_request:1",
  "business_id": "restaurant_001",
  "source_call_id": "call_456",
  "caller_name": "Zach",
  "caller_phone": "+19165551212",
  "requested_date": "2026-09-25",
  "requested_time": "19:00:00",
  "party_size": 4,
  "status": "PENDING_REVIEW",
  "environment": "test"
}
```

Do not allow the voice agent to supply `status`, `environment`, or other trusted internal fields.

### 5. Add duplicate protection before insertion

Use the idempotency key to handle webhook retries:

```text
Look up idempotency_key
├── Found
│   └── Return the previous result
└── Not found
    └── Create the record
```

Also enforce uniqueness in Supabase. The workflow check improves the response, while the database constraint protects against two simultaneous requests.

### 6. Add business configuration

Create a `businesses` or `business_configuration` table containing:

- `business_id`
- `business_name`
- `timezone`
- `active`
- `environment`
- `maximum_standard_party`
- `confirmation_mode`
- `manager_email`
- `manager_phone`
- `transfer_number`
- `notifications_enabled`
- `sms_enabled`
- `email_enabled`

The workflow should reject an unknown or inactive `business_id` before storing caller information.

### 7. Prepare six automated test envelopes

Test:

1. Valid standard reservation request
2. Missing caller telephone number
3. Party larger than eight
4. Unsupported request type
5. Duplicate request
6. Simulated internal failure

For every case verify:

- Correct branch selected
- Database write occurred only when permitted
- Exactly one record was created
- Caller message was safe and accurate
- No confirmation language appeared
- The webhook returned promptly

### 8. Add notifications afterward

Once storage and responses are proven:

```text
Store successfully
  → Attempt notification
  → Log notification result
  → Return accepted
```

A notification failure should not erase a successfully stored request. Return something like `accepted_notification_delayed`, log the failure, and create a retry path.

## Transfer terminology

For a large party, `transfer_required` should not automatically mean the transfer succeeded. Keep these separate:

- `transfer_required`
- `transfer_attempted`
- `transfer_connected`
- `transfer_failed`

This prevents the agent from saying “I connected you” when the manager never answered.

## Next milestone

All five outcomes return correctly, one accepted staging request is stored exactly once, and no branch can falsely confirm a reservation.

