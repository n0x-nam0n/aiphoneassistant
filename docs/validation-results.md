# Restaurant Call Validation — Decision Record

**Decision:** GO  
**Decision date:** 2026-09-26  
**Decision authority:** Product owner, in this project conversation  
**Scope approved:** Proceed to the single-location, overflow-first restaurant event lead pilot described in `restaurant-revenue-desk-build-plan.md`.

The product owner confirmed that the validation phase is complete and the project is a go. Interview evidence and restaurant-level metrics are not reproduced in this repository; do not infer or invent them from this decision record. The go decision authorizes the narrow pilot scope. It does not authorize enabling live customer call routing until the per-location safety and operations gates in `pilot-release-record.md` pass.

## Decision boundaries

- Paid deployment remains overflow-first; a dedicated line is optional and primarily for demos.
- The first release is for private dining, catering, and large-party inquiry capture.
- The restaurant's existing event CRM remains authoritative; email/CSV is the default handoff.
- The assistant records a lead for human follow-up and never confirms availability or a booking.
- Recording stays off by default. The pilot uses only the approved disclosure, retention, and transcript policy for its location.
- The pilot is single-location in its user experience, with tenant isolation in storage and every data handoff.

## Evidence available in this repository

- The product-owner go decision above.
- The detailed product and pilot constraints in `restaurant-revenue-desk-build-plan.md` and `v2.md`.

## Evidence not reproduced here

Restaurant-by-restaurant interview notes, monthly call counts, channel mix, forwarding feasibility, pilot commitments, and underlying sources remain outside this repository. Keep those records in the approved business record system; add anonymized aggregate results here if they are later provided for inclusion.

## Gate status

| Gate | Status | Basis |
|---|---|---|
| Product validation | **Passed** | Product owner's explicit go decision |
| Local pilot contract and operations artifacts | In progress | Tracked in the execution plan |
| Production routing activation | **Not passed** | Requires per-location setup, test calls, rollback proof, and release record |
