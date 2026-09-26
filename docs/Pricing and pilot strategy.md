Pricing and pilot strategy — approved with revisions
I agree with the direction. The revised model is $199/month + $399 setup, no usage-based billing during the first 3–5 pilots, with on-site adaptation and outcome-based reporting.
The most important change is that we're separating what we charge customers from what we measure internally. Customers receive predictable pricing while we collect the usage and cost data needed to design a sustainable commercial model.
I'll incorporate these decisions into the implementation plan alongside the previously agreed single-location MVP and call-transfer safety requirements.
1. Final pilot pricing
Approved pilot offer
AI Restaurant Revenue Desk
$199
/month per restaurant

$399 one-time setup fee

Included:
- Overflow and after-hours AI answering
- Private dining, catering and large-party qualification
- Approved restaurant FAQs
- Structured lead delivery and CRM handoff
- Human transfers and callback capture
- On-site setup, testing and adaptation
- No per-minute overage charges during the agreed pilot period
Pilot billing: Flat rate
Manual invoices. No published pricing tiers, automated metering charges, or self-service billing.


One necessary safeguard: No overages should not mean an undisclosed right to terminate service or a hidden usage cap. The pilot agreement should specify the service scope, pilot duration and any exceptional-use protections upfront.
If usage becomes unexpectedly expensive, we investigate the call flow and discuss changes with the restaurant. We do not retroactively charge for minutes or silently disconnect calls.
Setup fee waiver
The $399 setup fee can be waived for selected founding customers in exchange for a written agreement to participate in a case study.
The agreement should define what can be published, require the restaurant's approval of customer-identifying material, and avoid promising a positive testimonial or particular results.
A case study documenting a poor conversion rate or unsuccessful deployment is still valuable research, even if it is not a marketing asset.

2. Never gate a qualified event call
Hard product requirement
An event call must never be terminated because a minute allowance or usage threshold has been reached.
This applies to:
- Private dining
- Catering
- Large-party inquiries
- Restaurant buyouts
- Corporate events
Once the agent detects qualifying event intent, it must be allowed to finish the conversation, capture the available contact information and attempt the configured lead handoff.
The rule remains active after usage-based pricing is introduced.
Usage limits, when eventually implemented, should be evaluated before starting new non-event interactions or through approved routing changes—not by abruptly terminating an active event conversation.

For the pilot, the simplest implementation is to omit customer-facing usage enforcement entirely.
We still need internal provider-spend alerts and a documented response to abnormal usage, fraud or infrastructure failure. Those are operational safeguards, not a disguised billing meter.

3. Short non-event handling is an explicit AI requirement
This is both a cost-control mechanism and a better customer experience.
The agent should identify the caller's intent early and respond according to the appropriate workflow rather than treating every call as an open-ended conversation.
Target call-handling behavior
Call type	Expected behavior
Hours, address, parking	Answer immediately using approved facts; aim for 20–30 seconds.
Ordinary reservations	Provide the booking URL or approved booking instructions. Do not attempt live reservation management.
Takeout/ordering	Direct caller to the approved ordering channel without conducting an ordering conversation.
Private dining/catering	Enter the full qualification workflow. Prioritize lead completeness and caller experience over call duration.
Human request	Attempt safe transfer; capture callback information if transfer is unavailable.
The 20–30-second FAQ target is a performance goal, not a rigid call timeout. The agent must still respond to accessibility needs, additional questions and genuine event intent discovered later in the conversation.

The prompt and application logic should work together. Prompt instructions alone are insufficient to guarantee efficient handling.
The build plan will include intent-specific tools, approved response templates, call-duration monitoring, and tests confirming that the agent does not unnecessarily prolong ordinary FAQ calls.

4. Instrument everything internally
Although pilot customers will not be billed for usage, the backend must capture the information needed to understand the economics.
For every call, record:
Measurement	Purpose
Connected duration	Understand total usage
Provider cost	Calculate actual variable expense
Intent classification	Separate event and non-event traffic
Qualification duration	Optimize event conversations
FAQ duration	Identify unnecessary AI spending
Transfer outcome	Measure call-routing reliability
Lead created	Measure commercial output
Lead handoff outcome	Verify that captured inquiries reach staff
Customer-reported booking outcome	Evaluate realized value
At the end of each pilot month, calculate per-location total cost, event-call share, total connected minutes, support hours and contribution margin.
Once the first cohort provides sufficient data, use observed usage—particularly the 75th percentile—as an input to the next pricing model.
With only 3–5 restaurants, that percentile is directional rather than a statistically reliable estimate of the broader market. It should be combined with actual costs, call mix and additional pilot observations before establishing public pricing.

5. Lead with outcomes on every invoice
The invoice should make the subscription's purpose obvious.
ILLUSTRATIVE MONTHLY CUSTOMER SUMMARY
Restaurant Revenue Desk
September 2026 · Example restaurant

Qualified event inquiries
12

Estimated opportunity value
$24,000

Confirmed bookings
2

Reported booking value
$4,800



Monthly subscription
$199.00

Example figures only. Actual reports must use verified customer data. Estimated pipeline value is not realized revenue.
The formal invoice must still clearly display the service, billing period, amount due and any applicable taxes. The outcome summary can accompany it without replacing the required billing information.
Internally, we continue measuring minutes and call costs. Externally, we emphasize captured opportunities and confirmed results.

6. Competitive risk: event CRMs adding voice
The point about Tripleseat is important.
A company that already manages the restaurant's event pipeline has a natural opportunity to add voice intake, either directly or through an integration.
Our positioning should therefore be:
The overflow phone-capture layer that delivers qualified opportunities into the restaurant's existing event-sales workflow.
We should not attempt to compete with established event CRMs on proposal management, contracts, event calendars or full sales-pipeline functionality.
On-site implementation is a useful early distribution and adoption advantage. However, it is not a permanent product moat by itself. We need to convert what we learn during installations into repeatable workflows, reliable integrations and measurable customer outcomes.

7. Final implementation-plan constraints
The following decisions are now pinned:
Area	Final decision
Pilot price	$199/month/location
Setup	$399, selectively waivable for case-study participation
Billing	Manual invoices
Pilot usage	Flat rate; no minute-based overages
Usage measurement	Full internal instrumentation
Event calls	Never terminate due to usage limits
Non-event calls	Fast, intent-specific handling
Deployment	Overflow-first; dedicated events line for demos
Onboarding	Human-assisted, with on-site adaptation
Product interface	Single location, one owner role
Database	Multi-tenant-safe and forward-compatible
Human transfers	Verified separate destination; no forwarding loops
Success metric	Captured opportunities, confirmed bookings and renewal
The commercial test is whether restaurants renew at $199/month after experiencing the product—not whether we can technically answer calls or generate a large number of leads.
The implementation plan should now be built against these decisions rather than reopening pricing, expanding the receptionist feature set or adding a full event CRM.
