# [OFFLINE-001] Feature: Offline Capture and Synchronization

## Metadata

**Feature ID**: `OFFLINE-001`  
**Status**: `draft`  
**Priority**: `high`  
**Linked PBIs**: `PBI-017`, `PBI-018`  
**Linked FR/NFR**: `FR-014`, `NFR-007`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`

---

## Business Goal

Allow critical operations to continue during internet outages and synchronize safely when connectivity returns.

## Use Case Summary

**Primary Actor**: operator/support admin  
**Trigger**: connectivity loss during checkout or debt flow  
**Main Flow**:
1. System detects offline mode.
2. Sale/debt events are stored locally as `pending_sync`.
3. On reconnect, system sends queued events to sync endpoint.
4. Synced items are marked as `synced`; failed items remain retryable.

---

## API / Code Examples

```ts
export interface SyncEventsBatchDTO {
  events: Array<{
    eventId: string;
    eventType: "sale_created" | "debt_payment_registered";
    occurredAt: string;
    payload: unknown;
    idempotencyKey: string;
  }>;
}
```

```bash
curl -X POST /api/v1/sync/events \
  -H "content-type: application/json" \
  -d '{
    "events":[
      {
        "eventId":"evt_001",
        "eventType":"sale_created",
        "occurredAt":"2026-03-30T10:21:00Z",
        "payload":{"saleId":"sale_123"},
        "idempotencyKey":"sync-sale-123"
      }
    ]
  }'
```

---

## Acceptance Criteria

- [ ] Offline-confirmed critical events are never dropped.
- [ ] Sync uses idempotency keys to avoid duplicate processing.
- [ ] Failed sync events remain visible and retryable.
- [ ] Outage and recovery scenarios are covered by E2E + integration tests.

