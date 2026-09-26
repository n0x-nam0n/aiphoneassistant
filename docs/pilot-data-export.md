# Pilot Data Export and Deletion

## Owner CSV export

The private owner desk exports all leads and call metadata visible to the signed-in owner's organization. The browser fetches results in pages and relies on database RLS for tenant isolation. The exported file contains:

`request_id`, `created_at`, `caller_name`, `caller_phone`, `caller_email`, `event_type`, `event_date`, `event_time`, `party_size`, `budget_amount`, `budget_currency`, `lead_status`, `call_outcome`, `transfer_state`, and `notes`.

Caller-provided values are quoted and spreadsheet formula prefixes are neutralized. Do not forward the export outside the restaurant's approved staff group. The export does not include audio or transcripts.

## Customer request to export or delete

1. Verify the request came from the restaurant's authorized owner contact.
2. Export that location's leads/calls through the authenticated owner desk or trusted operator workflow.
3. Confirm the requested date range and whether the export includes currently retained call metadata.
4. For deletion, resolve the customer/location IDs from trusted records, then remove the location's data through an authorized server-side operation. Foreign-key cascades remove related calls, leads, and notification records.
5. Record request, authorization, scope, completion date, and any backup-retention limit in the pilot's business record.
6. Confirm completion to the authorized customer contact.

Never delete by caller-supplied organization/location ID. Do not offer a self-service delete control in the browser; the owner desk is read-only for caller/event details and allows only lead follow-up status changes.
