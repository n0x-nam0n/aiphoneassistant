# Voice Agent Configuration — Hostess Pilot

**Status:** The latest call ran published Main v9, which still directs reservation/staff requests to a broken transfer. The no-transfer callback behavior is present only in an unpublished draft. Production pilot release is not approved.

## Current provider configuration

- Provider: ElevenLabs
- Agent: `Bob's Burgers — Demo`
- Agent ID: `agent_7201m3gf7d0ff64bc1xdrvdxx9h0`
- Bridges: Supabase Edge Functions `submit-event-lead` and `submit-callback-request`
- Callback bridge status: source changes staged locally; callback migration not yet applied; notification delivery not verified
- Phone number: attached in ElevenLabs; keep the exact number in the provider account and secure phone-routing record, not in source control
- Voice recording: disabled
- Retention: zero days with transcript/PII and audio deletion enabled
- Conversation limit: three minutes
- Concurrency: one conversation
- Daily limit: ten conversations

## Tool contract

The agent may submit caller and event fields only. Organization, location, recipients, routing, and other control values are server-owned. The bridge authenticates the request, validates and normalizes input, applies quotas, and returns only caller-safe status fields.

Accepted leads are stored idempotently in Supabase. A retry returns `duplicate`; it does not create another lead. The agent must never describe an accepted lead as booked or confirmed. Callback requests must capture the caller's name, confirmed callback number, and reason; live transfers are prohibited. Callback acceptance may be spoken only after the request is stored and manager email delivery is confirmed.

## Call completion behavior

Every ordinary answer must end with: “Is there anything else I can help you with?” This applies to hours, menu, policy, and other simple questions—not only event inquiries. After an accepted or duplicate inquiry, speak the structured `caller_message` exactly once, then ask that closing question. If the caller says no, thanks, or goodbye, give one brief farewell and invoke ElevenLabs' native `end_call` system tool so the phone call actually disconnects. Do not ask again after the caller indicates they are done.

For an unfinished event inquiry, ask only for missing required details. Clarify an unclear field at most once; never repeat the same question indefinitely. If required information remains unavailable, explain that the request could not be completed, avoid promising an unconfigured callback, then offer help once and end cleanly if the caller has no further request. The unpublished draft has no-transfer instructions, a callback submission tool, and the native Transfer to number system tool disabled. Published Main v9 still contains transfer instructions. Do not claim the no-transfer fix is live until its backend and notification path are verified and that draft is published.

## Validation gate

- [x] Agent exists and has the event-lead tool attached.
- [x] Unpublished draft has `submit_callback_request` attached and `Transfer to number` disabled.
- [ ] Callback database migration applied and callback Edge Function deployed.
- [ ] Transactional email provider configured; test callback alert received at `zachary.estomo@gmail.com`.
- [ ] Publish the no-transfer agent draft only after the callback storage and notification checks pass.
- [x] Supabase bridge is deployed and active.
- [x] Required bridge secrets and pilot IDs are configured remotely.
- [x] Unsigned requests are rejected.
- [x] Synthetic accepted and replay/duplicate checks passed.
- [x] Phone number is attached to the agent.
- [x] Live prompt now requires the same closing question after every completed answer; stray greeting text removed and automated-receptionist greeting published.
- [x] Native End conversation system tool enabled and agent version published.
- [ ] Verify on a controlled inbound call that the close question is asked after an ordinary answer and a “no/thanks” reply actually disconnects the call.
- [x] Place a controlled inbound call to the attached number; accepted call recorded at 2026-09-28 19:35 UTC.
- [x] Verify the call produces the expected accepted response and one `New` lead.
- [x] Replay the stored idempotency key; the atomic RPC returned `duplicate` with the original request ID and created no second lead.
- [x] Provision the invited owner membership for the active test location; invite accepted and sign-in recorded at 2026-09-28 19:38 UTC.
- [ ] Verify the owner desk can read the lead under membership RLS after the invite is accepted.
- [ ] Verify notification delivery or documented outbox fallback.
- [ ] Complete the per-location release record before enabling customer routing.

Do not add the provider secret, Supabase service-role key, exact transfer number, or other credentials to this file.
