# Stepper Workflow Contract — Hostess Event Lead Pilot

**Status:** Implementation contract for the externally hosted workflow. The repository does not contain a Stepper workflow export, so the draft must be updated and verified in Stepper before pilot use.

## Trusted configuration

The workflow must bind one approved `organization_id` and `location_id` from server-side configuration for each deployed agent. Never accept those identifiers, status, notification recipient, environment, or transfer target from the caller or voice-agent payload. Store the Supabase service-role credential only in a trusted Stepper connection/secret store.

Authenticate the provider-to-Stepper request with the provider's signed webhook verification or a high-entropy shared secret checked before any RPC call. If the provider/Stepper path cannot verify authenticity, put an authenticated gateway in front of Stepper. Reject invalid credentials and rate-limit abusive traffic; never treat an unguessable webhook URL by itself as authentication.

The location is activated only after `active = true` and the location record has distinct verified AI inbound, forwarded main, and human transfer numbers plus a manager email. The database rejects incomplete/direct-loop configurations; known indirect loops still require the live carrier test in `phone-routing-runbook.md`.

## Request mapping

The voice provider posts `source_call_id`, `idempotency_key`, caller phone/name/email, and optional event details. Stepper validates shape/lengths, confirms a callback phone is available, and normalizes event date/time using the trusted location time zone.

For an accepted request, call `public.submit_event_lead` by Supabase RPC with these parameters:

| RPC parameter | Source |
|---|---|
| `p_organization_id` | Trusted Stepper location configuration |
| `p_location_id` | Trusted Stepper location configuration |
| `p_source_call_id` | Verified voice-provider call ID |
| `p_idempotency_key` | Stable voice-provider event/retry key |
| `p_caller_phone` | Caller-provided callback number |
| `p_caller_name` | Optional caller value |
| `p_caller_email` | Optional caller value |
| `p_event_type` | Optional classified inquiry type |
| `p_event_date`, `p_event_time` | Optional values normalized to local location time |
| `p_party_size` | Optional positive integer |
| `p_budget_amount`, `p_budget_currency` | Optional caller-provided estimate and currency |
| `p_notes` | Optional concise caller-provided notes; never include payment credentials |

The RPC atomically inserts the call, one idempotent lead, and a pending email notification outbox row. It returns a stable JSON object with `status`, `action`, `request_id`, `caller_message`, `missing_fields`, `transfer_target`, and `retry_allowed`. Speak only `caller_message`; do not synthesize a stronger success claim.

## Branch behavior

- `accepted`: speak the returned acknowledgment. The lead is recorded for human review; nothing is booked. The email outbox row is pending, not proof an email was sent.
- `duplicate`: speak the returned prior-recorded message. Do not create another lead or notification.
- `needs_information`: ask only for the fields named in `missing_fields`. Do not claim submission.
- `transfer_required`: use the trusted approved transfer target; track required, attempted, connected, and failed separately. If no verified target or the transfer fails, collect a callback request.
- `not_supported`: offer the approved human fallback and record the outcome without storing caller details.
- `failed`: use a generic safe response; never expose the Supabase/Stepper/provider error.

For non-accepted outcomes, call `public.record_event_call_outcome` with trusted organization/location IDs, the provider call ID, and the selected outcome. It records only call metadata. Do not write a lead for these branches.

## Notification outbox

Only process `lead_notifications` rows with `status = 'pending'`. On confirmed send, mark `sent` and increment attempt count. On a definitive failure, mark `failed`, store a bounded error code (never credentials or raw provider payload), increment attempt count, and alert the operator through the configured internal channel. Retry using the same row. If the send result is ambiguous due to timeout, email may be duplicated on retry; do not promise exactly-once delivery. Lead creation itself remains idempotent.

## Release checks

1. Update the existing unpublished reservation workflow or create a dedicated event-lead workflow; never point the event agent at the old reservation validator without changing its contract.
2. Run `pilot-acceptance-tests.md` using synthetic data, a staging/test organization/location, and test notification recipients.
3. Verify one accepted call creates one lead and one outbox row; replay returns `duplicate` with the same request ID.
4. Verify every non-accepted branch records no lead and returns the full caller-safe response.
5. Verify timeout/storage errors are caught and mapped to `failed`, not exposed raw and not spoken as accepted.
6. Keep the workflow unpublished and production forwarding disabled until the location release record is complete.

The private owner desk uses Supabase Auth with an owner membership row. The workflow uses a separate trusted `service_role` connection only for the two RPC calls and notification outbox updates. Do not embed that credential in `desk.html`, `desk.js`, or `config.js`.
