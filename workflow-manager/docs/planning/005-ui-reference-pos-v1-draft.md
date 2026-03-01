# UI Reference: POS v1

## Document Metadata

**Document ID**: `005`  
**File Name**: `005-ui-reference-pos-v1-draft.md`  
**Status**: `done`
**GitHub Issue**: #1  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.3`
**Created At**: `2026-02-27`  
**Last Updated**: `2026-03-01`  
**Related Planning**: `004-implementation-plan-simple-pos-draft.md`  
**Related Feature**: `POS-001-ui-pos-mockup-and-checkout-draft.md`

---

> Closure note: this visual reference was approved and implemented in the delivered MVP. It remains the historical design baseline for the original POS shell.

## 1. Source of Truth

- Design approved by the project owner from the provided UI image (tablet POS layout).
- Canonical image file in repository:
  - `workflow-manager/docs/planning/assets/pos-ui-reference-v1.png`

---

## 2. Visual Contract (MVP)

### Layout Structure
- Left navigation rail (dark background, icon-first actions).
- Center catalog workspace (categories, search, product grid).
- Right order panel (order items, totals, checkout CTA).

### Hierarchy and Interaction
- Product cards are the primary interaction element.
- Category chips/tabs are always visible near top area.
- Totals and checkout button are always visible in order panel.
- Large touch targets and high readability for 60+ operator.

### Style Direction
- Rounded containers/cards.
- Strong contrast between navigation and content area.
- Blue accent for selected actions/primary button.
- Dense but readable layout optimized for tablet landscape.

---

## 3. Implementation Rules

- Any POS UI implementation must be reviewed against this visual contract.
- Structural deviations (layout zones, hierarchy, CTA placement) require explicit re-approval.
- Cosmetic refinements are allowed if usability improves and structure is preserved.

---

## 4. Review Checklist

- [x] Left/center/right structure preserved.
- [x] Category and product discovery remain visual-first.
- [x] Order panel keeps totals + primary CTA visible.
- [x] Tablet landscape remains primary validated viewport.
- [x] Stakeholder approves visual parity for MVP demo.
