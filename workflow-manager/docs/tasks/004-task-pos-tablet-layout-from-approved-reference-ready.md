# Task: [TASK-004] Implement Tablet POS Layout from Approved Reference

## Task Overview

**Document ID**: `004`  
**File Name**: `004-task-pos-tablet-layout-from-approved-reference-ready.md`  
**Feature**: `POS-001`  
**Entity**: `task`  
**Pull Request**: `TBD`  
**Status**: `done`  
**GitHub Issue**: #14  
**Priority**: `high`  
**Assignee**: `TBD`  
**Estimated Effort**: `10h`  
**Actual Effort**: `7h`

### Business Logic Description
Build the tablet-first static UI structure following the approved visual reference: left nav rail, center catalog grid, and right order panel.

### Business Rules
- UI structure must match the approved visual baseline (`005-ui-reference-pos-v1-draft.md`).
- Controls must preserve large touch targets and readability.
- MVP target viewport is tablet landscape.

---

## Acceptance Criteria

### Functional Requirements
- [x] **Given** tablet viewport, **When** POS screen renders, **Then** three-zone layout is present (left/center/right).
- [x] **Given** product catalog section, **When** UI loads, **Then** category strip and product cards are visible and tappable.
- [x] **Given** order panel, **When** UI loads, **Then** totals and checkout CTA are fixed and visible.

### Non-Functional Requirements
- [x] Usability: touch targets are >= 44px.
- [x] Portability: layout degrades gracefully on smaller widths.
- [x] Maintainability: UI sections are componentized.

### Error Handling
- [x] **Given** empty products, **When** screen renders, **Then** empty state is clear and actionable.
- [x] **Given** product image missing, **When** card renders, **Then** placeholder is shown without layout break.

---

## Technical Implementation

### Files to Create/Modify
- `src/modules/sales/presentation/components/PosLayout.tsx` (create)
- `src/modules/sales/presentation/components/LeftNavRail.tsx` (create)
- `src/modules/sales/presentation/components/ProductCatalogPanel.tsx` (create)
- `src/modules/sales/presentation/components/OrderSummaryPanel.tsx` (create)
- `src/app/(admin)/pos/page.tsx` (create/modify)

### Current Output
- `src/modules/sales/presentation/components/PosLayout.tsx`
- `src/modules/sales/presentation/components/LeftNavRail.tsx`
- `src/modules/sales/presentation/components/ProductCatalogPanel.tsx`
- `src/modules/sales/presentation/components/OrderSummaryPanel.tsx`
- `src/app/(admin)/pos/page.tsx`
- `src/app/page.tsx` now redirects to `/pos`
- Layout section test coverage:
  - `tests/e2e/pos-layout-sections.spec.ts`
- Responsive visual baseline:
  - `tests/e2e/pos-visual-baseline.spec.ts`
  - `tests/e2e/pos-visual-baseline.spec.ts-snapshots/pos-tablet-layout-darwin.png`
  - `tests/e2e/pos-visual-baseline.spec.ts-snapshots/pos-tablet-layout-compact-darwin.png`

### Dependencies
- `TASK-001`
- `TASK-002`
- `005-ui-reference-pos-v1-draft.md`

---

## Testing Requirements

- [x] Component tests for layout sections.
- [x] Responsive snapshot tests for tablet-first viewport.
- [x] Manual visual parity check against approved reference.

Validation evidence:

```bash
npm run lint
npm run build
```

---

## GitHub Issue Seed

**Title**: `[TASK-004] Implement Tablet POS Layout from Approved Reference`  
**Issue Template**: `05-task.yml`  
**task_id**: `TASK-004`  
**task_doc**: `workflow-manager/docs/tasks/004-task-pos-tablet-layout-from-approved-reference-ready.md`  
**linked_feature**: `POS-001`

---

## Definition of Done

- [x] Layout implemented with three-zone structure.
- [x] UI baseline parity reviewed.
- [x] Tests and docs updated.
