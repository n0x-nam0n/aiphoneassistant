# Hostess Pilot Release Record

**Status:** Not released. Controlled phone validation pending.

## Location

- Restaurant/location: ______________________________
- Authorized approver: ______________________________
- Pilot window: ______________________________
- Operator: ______________________________

## Route verification

- [ ] Existing restaurant number and carrier owner recorded securely
- [ ] AI number verified in provider account
- [ ] Forwarded main number recorded
- [ ] Human transfer number recorded and distinct from AI and forwarded numbers
- [ ] Direct and indirect loop checks passed
- [ ] Manager completed disable/restore procedure
- [x] Controlled inbound call passed: accepted outcome, one `New` lead, and one pending outbox row recorded at 2026-09-28 19:35 UTC

## Product and safety verification

- [ ] AI disclosure approved
- [ ] Recording/transcription settings match the approved policy
- [ ] Approved knowledge packet loaded
- [ ] Caller phone is required for lead creation
- [ ] No booking or availability confirmation is possible
- [ ] Allergy, payment, urgent-safety, and human-request escalation tested
- [x] Stored idempotency replay returned `duplicate` with the original request ID and no duplicate lead
- [ ] Failure paths return caller-safe wording

## Data and operations verification

- [ ] Supabase migration is applied to the intended project
- [x] Owner account invitation accepted and organization membership provisioned; successful sign-in recorded 2026-09-28 19:38 UTC
- [ ] Owner desk reads only the assigned organization/location
- [ ] Lead notification delivery is verified; pending outbox rows are addressed to `zachary.estomo@gmail.com`
- [ ] CSV export and deletion procedure are approved
- [ ] Customer agreement, usage cap, outage behavior, and termination terms reviewed

## Decision

- Release decision: ______________________________
- Evidence links/IDs: ______________________________
- Approver signature/date: ______________________________

Production or customer call routing must remain disabled until the required checks above are evidenced.
