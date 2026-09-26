# Restaurant Phone Routing Runbook

Use this runbook per location and carrier. Do not activate production forwarding until the restaurant approves the route and the release record is complete.

## Route inventory

| Route | Value | Owner/verification |
|---|---|---|
| Existing restaurant number |  |  |
| Carrier/account owner |  |  |
| AI inbound number |  |  |
| `forwarded_main_number` |  |  |
| `human_transfer_number` |  |  |
| Backup/callback contact |  |  |
| Approved coverage window |  |  |

Keep the restaurant's existing number and normal ringing behavior. `human_transfer_number` must not equal the existing/forwarded main number, AI inbound number, or a known indirect route back into the AI.

## Before enabling

- [ ] Confirm restaurant approval and named carrier/account owner.
- [ ] Capture the original route and how to restore it.
- [ ] Confirm AI disclosure, approved location knowledge, transfer/callback behavior, and recording-off setting.
- [ ] Confirm usage cap and test destination settings.
- [ ] Check the transfer target for direct and known indirect loops.
- [ ] Confirm the restaurant manager can perform rollback without developer access.

## Carrier activation record

For the customer's specific carrier, document the carrier-supported procedure for conditional no-answer/busy and after-hours forwarding. Do not assume universal dial codes. Record the exact settings applied, the person who applied them, and the timestamp.

| Check | Result/evidence | Operator | Date/time |
|---|---|---|---|
| Normal call rings restaurant first |  |  |  |
| Unanswered call forwards to AI |  |  |  |
| AI disclosure is spoken |  |  |  |
| Lead/callback path works with test data |  |  |  |
| Human transfer reaches the approved destination |  |  |  |
| Transfer-unanswered fallback works |  |  |  |
| No route loops back into AI |  |  |  |
| Recording/transcript settings match policy |  |  |  |
| Manager can disable AI and restore original route |  |  |  |

## Disable and rollback

1. The restaurant manager contacts the named carrier/account owner and uses the carrier-specific rollback procedure recorded for this location.
2. Disable conditional forwarding to the AI number and restore the captured original routing.
3. Place an inbound test call and verify it follows the restaurant's original flow.
4. Disable the location's AI intake configuration so any already-routed call receives the approved safe fallback.
5. Record who disabled the route, when, why, and the verification result; notify the operator and restaurant owner.

If a route loops, reaches an unapproved destination, exposes data, or fails to return calls to the restaurant, disable forwarding immediately and verify the original call flow before investigating further.

## Outage and transfer failure

- If the voice provider or intake workflow is unavailable, use the carrier rollback procedure; do not leave forwarding pointed at a dead endpoint.
- If human transfer fails, stop retrying and collect a callback request through the approved fallback. The assistant must not say a person was reached.
- After recovery, test the full route with approved test numbers and obtain restaurant approval before re-enabling production forwarding.
