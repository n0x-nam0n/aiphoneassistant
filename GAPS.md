# Pilot Readiness Gaps

The core intake workflow exists, but several pieces are still needed to turn a clever demo into a dependable business. Work on these before the first pilot.

## 1. Actual voice-agent configuration

Stepper is only the workflow server. Create the Retell or Vapi agent that:

- Answers the telephone
- Identifies caller intent
- Collects required fields
- Calls the Stepper webhook
- Reads Stepper’s `caller_message`
- Transfers calls
- Handles silence, interruptions, and hangups
- Stops after repeated misunderstanding

Start with a licensed stock voice. Voice cloning is optional and should come later.

## 2. Telephone routing and ownership

For the pilot:

```text
Restaurant’s existing number
        ↓
Rings restaurant normally
        ↓
Nobody answers after several rings
        ↓
Forward to AI receptionist number
```

Document:

- Who owns the AI telephone number
- Which carrier provides it
- How forwarding is enabled and disabled
- Human transfer destination
- Backup telephone number
- Behavior when Retell, Vapi, or Stepper is unavailable
- How the client gets its number and data back after cancellation

Never transfer back to the forwarded main line; that can create a call loop.

## 3. Business configuration

Do not hardcode restaurant details inside Stepper nodes. Create a configuration record containing:

- Business name
- Time zone
- Regular and holiday hours
- Main and transfer numbers
- Manager contact information
- Maximum normal party size
- Supported request types
- Notification rules
- Recording/transcription policy
- Data-retention period
- Enabled languages
- Test/production status

## 4. All webhook response branches

Complete these before adding more features:

- `accepted`
- `needs_information`
- `transfer_required`
- `not_supported`
- `failed`
- `duplicate`

Every call must receive a response, even when Supabase or notifications fail. Otherwise, the voice agent may stall or improvise.

## 5. Failure and rollback procedures

Deliberately test:

- Retell cannot reach Stepper
- Stepper cannot reach Supabase
- Supabase stores the request but SMS fails
- Manager does not answer a transfer
- Restaurant accidentally forwards calls in a loop
- Caller hangs up halfway through
- The same webhook is delivered twice
- Knowledge base contains contradictory information
- A vendor has an outage

Create one emergency action:

```text
Disable AI routing and return calls to the restaurant’s original telephone flow.
```

The restaurant manager should be able to trigger this without needing you.

## Restaurant-specific safety work

### 6. Allergen and food-safety boundaries

The agent should never guess whether food is safe for someone with an allergy.

Approved behavior:

> “I don’t have sufficiently verified information to guarantee that. Let me connect you with the restaurant.”

Immediately escalate:

- Allergic reactions
- Claims of food poisoning
- Injuries
- Fire, smoke, or violence
- Threats
- Payment disputes
- Media or legal inquiries

### 7. Reservation language

Keep these outcomes separate:

- `request_received`
- `pending_restaurant_review`
- `availability_found`
- `reservation_created`
- `reservation_confirmed`
- `reservation_declined`

Only the reservation system or an authorized employee can produce `reservation_confirmed`.

### 8. Payment information

Do not let callers give the agent full card numbers, security codes, or PINs. Do not place payment information in transcripts.

Telephone payments and call recordings create additional payment-data risks. Route payment to a compliant hosted payment flow rather than processing raw card information through the AI. Consult PCI Security Standards Council guidance before adding payment functionality.

## Privacy, legal, and security work

### 9. Recording and transcription consent

Decide whether calls will be:

- Recorded
- Transcribed
- Summarized without retaining full audio
- Excluded from recording entirely

Because production calls may involve California callers, obtain legal guidance before recording. California Penal Code §632 addresses recording confidential communications without all-party consent.

Conservative opening:

> “I’m the restaurant’s automated assistant. This call may be recorded or transcribed to assist with your request.”

Give callers a human or non-recorded alternative where practical.

### 10. Outbound-call restrictions

Inbound answering and outbound automated calling are different risk categories. If confirmation calls, marketing calls, or automated follow-ups are added later, do not assume that an inbound relationship authorizes them.

The FCC treats AI-generated voices as artificial voices under the TCPA; outbound calls using them are subject to consent and other applicable restrictions. Keep version one primarily inbound.

### 11. Tenant separation and access

Each business must have separate:

- Knowledge
- Caller records
- Credentials
- Phone configuration
- Notifications
- Reports
- Retention settings

Also implement:

- Role-based access
- Multifactor authentication
- Secret storage
- Audit records
- Credential rotation
- Data deletion
- Export when the customer leaves

Never paste production credentials into Stepper descriptions, prompts, or chat messages.

## Product and business work

### 12. Restaurant onboarding package

Create a repeatable intake form asking for:

- Hours and holiday schedule
- Address and parking
- Menu source
- Reservation policy
- Large-party procedure
- Catering information
- Approved answers
- Prohibited answers
- Staff transfer directory
- Escalation situations
- Manager contacts
- Systems and integrations
- Call recording preference

The restaurant must approve this information before launch.

### 13. Test script and acceptance criteria

Create at least 50 scripted calls covering:

- Normal questions
- Background noise
- Caller interruptions
- Unusual names
- Dates and time zones
- Large parties
- Angry callers
- Allergies
- Unsupported requests
- Failed transfers
- Duplicate webhook deliveries
- Prompt-injection attempts

Define measurable acceptance standards:

- 100% of allergen questions safely escalated
- Zero false reservation confirmations
- Zero cross-business data exposure
- 100% of accepted requests stored exactly once
- Every webhook branch returns a caller-safe response
- Human transfer available on request

### 14. Measurement and proof

Capture a baseline before launch:

- Calls received
- Calls missed
- Reasons people call
- Peak calling times
- Catering leads
- Reservation requests
- Employee interruptions
- Estimated opportunity lost

After launch, compare:

- Calls handled
- Requests captured
- Transfers completed
- Failures
- Knowledge gaps
- Staff time saved
- Revenue-generating inquiries recovered

This evidence becomes the first case study.

### 15. Customer agreement

The agreement should explain:

- The service assists staff; it does not guarantee revenue
- What the agent may and may not do
- The restaurant owns and approves its information
- Who owns telephone numbers
- Usage limits and overages
- Supported integrations
- Data retention and deletion
- Support hours
- Outage behavior
- Human escalation responsibilities
- Voice rights
- Cancellation and export
- Liability boundaries

### 16. Monitoring and support

Decide:

- Who receives outage alerts
- How quickly critical failures are addressed
- How transcripts are reviewed
- Who approves knowledge changes
- How restaurant managers report incorrect answers
- How configuration versions are restored
- How usage and costs are monitored
- When the system automatically disables a failing integration

## What not to build yet

Postpone:

- Multiple industries
- Custom voice cloning
- Direct payment collection
- Full POS ordering
- Outbound marketing calls
- Multiple languages
- Complicated owner dashboards
- Autonomous complaint resolution
- Dozens of integrations

## Next five tasks

1. Finish every Stepper response branch.
2. Create the Supabase staging schema with duplicate protection.
3. Build the first Retell or Vapi test agent using a stock voice.
4. Connect a separate test telephone number and test human transfers.
5. Write the restaurant onboarding form and 50-call acceptance test.

## Real pilot milestone

The milestone is not “the agent answered a call.” It is:

> A caller reaches the test number, submits a valid reservation request, the request is stored exactly once, the manager is notified, the caller hears that it is pending—not confirmed—and every failure condition safely returns to a human path.

