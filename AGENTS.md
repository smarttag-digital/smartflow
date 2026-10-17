# Architecture rules
- Pipeline loss transitions use the security-invoker `mark_lead_lost` RPC to persist status, reason, and history atomically; row locking and an identical-state check prevent duplicate history on retries.
- Lead update mutations require a returned row and reconcile the confirmed record; successful HTTP responses with no changed rows are not proof of persistence.
- Pipeline dragging respects existing owner-only mutation policies even when an administrator has global read access; it must not broaden tenant permissions.