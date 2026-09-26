# Hostess Restaurant Pilot Onboarding Checklist

Complete one copy per restaurant location. The restaurant contact approves all caller-facing information before routing is enabled.

## Owner and operating contacts

- [ ] Restaurant legal/business name and public name
- [ ] Location address and time zone
- [ ] Owner/authorized approver name and contact
- [ ] Day-to-day manager and after-hours escalation contact
- [ ] Backup contact if the primary transfer target is unavailable
- [ ] Support contact and agreed support hours
- [ ] Pilot start/end dates, call coverage windows, usage cap, and overage terms
- [ ] Create the organization and location through trusted Supabase administration
- [ ] Disable public account sign-up in Supabase Auth and invite the named owner account through trusted administration
- [ ] Add the owner to `organization_memberships` through trusted administration and verify the invited account can see only this organization's location
- [ ] Configure the exact production owner-desk redirect URLs (`desk.html`, `desk.html?mode=reset`, and `desk.html?mode=invite`) in Supabase Auth
- [ ] Configure production SMTP for owner invitation and password reset email delivery

## Approved restaurant information

- [ ] Regular hours, holiday hours, closures, and time zone
- [ ] Address, parking, accessibility, and other approved public details
- [ ] Private dining, catering, and large-party policies
- [ ] Minimum/maximum party sizes and required qualification fields
- [ ] Approved answer for unknown or conflicting information
- [ ] Explicitly prohibited promises, topics, and claims
- [ ] Escalation instructions for allergies, illness, injury, threats, fire, payment disputes, legal/media inquiries, and other urgent cases
- [ ] Language(s) supported and human fallback for unsupported language
- [ ] Restaurant representative approval and approval date for the knowledge packet

## Caller data and consent

- [ ] AI disclosure text approved for this location
- [ ] Recording is off by default and confirmed off in provider settings
- [ ] Transcription/summarization choice and retention period recorded
- [ ] If recording/transcript storage is requested, relevant legal review and location-specific consent wording documented before enabling it
- [ ] Human/non-recorded alternative defined
- [ ] Caller data retention, deletion, and customer export owner documented
- [ ] Staff understand not to request or retain full payment card data, security codes, or PINs

## Phone route and handoff

- [ ] Existing restaurant number and carrier/account owner recorded securely
- [ ] AI inbound number recorded
- [ ] `forwarded_main_number` recorded
- [ ] `human_transfer_number` recorded and verified as distinct from forwarded main and AI numbers
- [ ] Direct and known indirect transfer loops checked
- [ ] Normal ring, unanswered forwarding, and approved after-hours behavior documented
- [ ] Transfer failure/callback behavior approved
- [ ] Carrier-specific enable and rollback steps tested
- [ ] Manager has completed the emergency disable/restore procedure

## Handoff and release

- [ ] Staff notification recipients and backup recipient verified
- [ ] CSV format and delivery/access owner approved
- [ ] Existing event CRM and any pilot-specific handoff requirement documented
- [ ] Acceptance scenarios run against approved test numbers
- [ ] No production recording, notification, database write, or customer call occurs during configuration tests unless specifically covered by the approved pilot procedure
- [ ] Release record signed by operator and restaurant approver before activation
