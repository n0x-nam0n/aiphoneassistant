# Aiphone change log — September 28, 2026

This log records Aiphone work completed or investigated on September 28, 2026. It distinguishes changes committed locally from production actions and unresolved pilot requirements. “Deployed” below means the named Supabase function or database migration was observed deployed/applied; it does not mean the complete pilot is released.

## Owner access and account setup

- Improved the invitation acceptance path so new owners are directed into the desk onboarding flow rather than dropped at an uninformative homepage.
- Added required password setup for invited owners and improved reset-link failure messaging.
- The owner invitation was accepted for `zachary.estomo@gmail.com`. The owner account and notification recipient were configured during the pilot setup; delivery verification remains outstanding.

## Call and lead data

- Added caller phone visibility to the call log and database compatibility for persisted caller numbers.
- Separated real calls from synthetic test records so test data is identifiable and excluded from real operational views.
- Kept platform-provided caller ID distinct from the best callback number. Callers may explicitly consent to use their incoming caller ID; otherwise the callback number must be captured separately.
- Updated the event-lead bridge and desk views to preserve/display the source caller and callback number independently.

## Callback follow-up workflow

- Added persistent callback requests, including request category, caller name, callback number/source consent, call reference, request details, priority/status, and notification state.
- Added a protected `submit-callback-request` Edge Function and email notification handling; added callback/event schema validation and regression tests.
- Large parties, major complaints, and staff requests for a manager are to be captured as manager-priority callbacks, not transferred back into the unavailable staff line. Caller name, callback number, and reason are the core intake; already-provided details should not be requested again.
- Relative dates (`today`, `tomorrow`, `day after tomorrow`) are resolved against trusted restaurant-local time where applicable.
- Corrected the callback endpoint’s response contract: if a request is saved but notification delivery is unconfirmed, return a structured business result over HTTP 200 rather than an HTTP error that makes the voice platform report a failed tool invocation. The response must still clearly say the notification was not confirmed.

## Database and Supabase production state

- Applied callback-request migration `20260928140000_add_callback_requests.sql` to project `aiphoneassistant` (`frhohipnsqzariwppaxx`). Earlier caller-phone, test-record, source/callback separation, and transfer-callback migrations were also present in the applied sequence.
- Deployed `submit-event-lead` (observed active v7) and `submit-callback-request` (v2, hotfix deployed around 6:48 PM PDT).
- Confirmed the endpoint still rejects unauthenticated requests (HTTP 401).
- Diagnosed the real Tony / 20-person table request: it was stored as a new `large_party` callback request, but the restaurant notification remained pending. The earlier v1 response used HTTP 503, causing ElevenLabs to mark the tool call failed even though the record existed. The v2 response fix addresses that status mismatch; it does not itself deliver the email.
- The Supabase project had no `RESEND_API_KEY` or `PILOT_EMAIL_FROM` configured when checked. Therefore successful email notification and “we notified the team” claims remain unverified and blocked until the provider/sender are configured and tested.

## Demo receptionist guidance

- Updated the local Bob’s Burgers demo guidance for graceful handling of irrelevant/teasing comments, collecting callback requests without loops, retaining fields already supplied, caller-ID consent, relative dates, large-party manager priority, and truthful handling of failed or unconfirmed submissions.
- Reviewed the ElevenLabs agent configuration after the call. The live/persisted prompt did not contain all of the intended conversation-state instructions; earlier editor changes were not confirmed saved or published. Do not treat those prompt improvements as live.
- The captured request failure is no longer accurately described as “the database failed”: evidence shows the callback row was saved and the notification was pending. The voice tool’s earlier error status obscured that distinction.

## Commits created today

These nine commits are on local `main`; at the last repository check, `main` was three commits ahead of `origin/main`, so the final callback workflow and its two fixes had not been pushed:

| Commit | Change |
| --- | --- |
| `74a2c10` | Improve invitation callback onboarding |
| `c504a72` | Require owner password setup in desk |
| `ab292d3` | Explain password reset delivery failures |
| `0eeafbe` | Show caller numbers in call log |
| `fb9ba42` | Separate test calls and trust caller ID |
| `4d3b7c9` | Store caller ID separately from callback number |
| `ad2012b` | Add callback follow-up workflow |
| `e1e204e` | Handle caller ID consent and relative dates |
| `9216aad` | Return structured callback notification failures |

Other ongoing, uncommitted documentation/worktree edits were present; they were not overwritten or represented as clean committed changes. In particular, the demo receptionist guidance was present as a local untracked document and was edited today; the pilot checklist, execution plan, and older session log also had separate local modifications.

## Verification performed

- Edge-function tests: 15 passed across shared callback/event logic and event-lead tests, before the final HTTP status hotfix.
- `git diff --check` passed after the final hotfix.
- Live database read confirmed the callback request row, category/status, and pending notification state.
- Live endpoint check confirmed unauthenticated submission is rejected.
- The final HTTP-status-only hotfix was deployed, but the full test suite was not rerun after that deployment.

## Still required before calling the pilot ready

1. Configure and verify the outbound email provider and approved sender; send a real notification test to `zachary.estomo@gmail.com` and confirm receipt.
2. Verify the owner can read the correct restaurant desk data under production membership/RLS, not merely accept the invitation or sign in.
3. Save and publish the corrected live voice-agent prompt, then place a real end-to-end test call. Confirm the agent preserves caller-provided details, captures the right callback number, closes cleanly, and does not claim a notification that was not delivered.
4. Complete and sign the pilot release record after the above checks. Production pilot activation is not complete until that record is signed.

## Cost/availability note

The ElevenLabs account page shown during the day reported the Free plan with 9,997 of 10,000 credits used. The displayed renewal date (“May 7, 2024”) was already in the past, so it did not establish when credits would renew. Calls requiring more credits may fail until the account’s current quota/billing state is resolved.
