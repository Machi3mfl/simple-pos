# Modern Scope Definition Guide (PRD + Backlog)

## Purpose

This guide explains the modern approach used in this repository to define project scope and plan execution:

1. PRD (living scope and requirements)
2. Product Backlog (ordered work items)
3. Explicit NFRs (quality constraints)
4. Optional formal SRS (regulated/contract contexts)

---

## 1) PRD (Product Requirements Document)

### What it is
A living document that explains **why** the product/feature exists, **what** outcomes it must create, and **which requirements** define success.

### What it should contain
- Problem statement and target users
- Goals, non-goals, and success metrics
- In-scope/out-of-scope boundaries
- Key user journeys
- Functional requirements (FR)
- Non-functional requirements (NFR)
- Risks, open questions, and release strategy

### Why it matters
- Aligns business + product + engineering.
- Reduces ambiguity before implementation.
- Works as a single source of scope truth.

---

## 2) Product Backlog

### What it is
An ordered list of implementation items (PBIs) that realize PRD outcomes incrementally.

### What it should contain
- Epics and PBIs
- Priority and status
- Acceptance criteria per item
- Dependencies
- Traceability to FR/NFR
- MVP cutline (must-have vs later)

### Why it matters
- Converts scope into executable work.
- Enables iterative delivery and reprioritization.
- Keeps roadmap flexible while preserving direction.

---

## 3) NFRs (Non-Functional Requirements)

### What they are
Quality constraints that define **how well** the system must work (not only what it does).

### Typical categories
- Performance
- Reliability/availability
- Security
- Usability/accessibility
- Maintainability/testability
- Portability

### Why they matter
- Prevent expensive late rework.
- Protect user experience and operations.
- Provide objective quality gates for release.

---

## 4) SRS (Optional, formal contexts)

### What it is
A formal software requirements specification, usually needed in regulated domains or strict contracts.

### When to use it
- Government or enterprise procurement
- Compliance/audit-heavy environments
- Fixed-scope contracts requiring formal sign-off

### Note
For most agile product teams, PRD + Backlog + NFRs is enough. SRS is added only when governance/compliance requires formalization.

---

## Recommended Workflow in This Repository

1. Create PRD from `docs/_system/templates/prd-template.md`.
2. Create Product Backlog from `docs/_system/templates/product-backlog-template.md`.
3. Optionally add detailed use-case decomposition with `requirements-template.md`.
4. Derive execution docs (`epic`, `feature`, `task`) from backlog.
5. Keep all artifacts updated as living documentation.

---

## Current Project Mapping (simple-pos)

- PRD: `workflow-manager/docs/planning/002-prd-simple-pos-draft.md`
- Product Backlog: `workflow-manager/docs/planning/003-backlog-simple-pos-draft.md`
- Use-case complement: `workflow-manager/docs/planning/001-requirements-simple-pos-draft.md`
