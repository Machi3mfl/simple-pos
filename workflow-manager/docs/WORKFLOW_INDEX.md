# Workflow Index and Glossary

Mobile-friendly navigation map for the full project workflow.

---

## 1. Reading Order (Recommended)

1. [UI Reference (approved design)](./planning/005-ui-reference-pos-v1-draft.md)
2. [Requirements](./planning/001-requirements-simple-pos-draft.md)
3. [PRD](./planning/002-prd-simple-pos-draft.md)
4. [Product Backlog](./planning/003-backlog-simple-pos-draft.md)
5. [Implementation Plan](./planning/004-implementation-plan-simple-pos-draft.md)
6. [Daily Execution Runbook (Iteration 0/1)](./runbooks/001-runbook-iteration-0-1-daily-execution-ready.md)
7. [Release Gate Runbook (Iteration 6 real backend)](./runbooks/002-runbook-release-gate-real-backend-ready.md)
8. Feature set:
   - [POS-001](./features/POS-001-ui-pos-mockup-and-checkout-draft.md)
   - [API-001](./features/API-001-contracts-v1-and-mock-runtime-draft.md)
   - [CATALOG-001](./features/CATALOG-001-guided-product-onboarding-and-placeholders-draft.md)
   - [INVENTORY-001](./features/INVENTORY-001-stock-movement-and-weighted-average-profit-draft.md)
   - [AR-001](./features/AR-001-on-account-debt-and-payments-draft.md)
   - [OFFLINE-001](./features/OFFLINE-001-offline-capture-and-sync-draft.md)
   - [RELEASE-001](./features/RELEASE-001-release-hardening-and-reporting-draft.md)
8. Iteration 0/1 execution tasks:
   - [TASK-001](./tasks/001-task-class-diagram-mvp-domains-ready.md)
   - [TASK-002](./tasks/002-task-flow-diagrams-checkout-stock-debt-sync-ready.md)
   - [TASK-003](./tasks/003-task-openapi-v1-skeleton-and-dto-baseline-ready.md)
   - [TASK-004](./tasks/004-task-pos-tablet-layout-from-approved-reference-ready.md)
   - [TASK-005](./tasks/005-task-checkout-payment-rules-cash-on-account-ready.md)
   - [TASK-006](./tasks/006-task-playwright-mock-smoke-and-visual-baseline-ready.md)

---

## 2. Iteration Map

| Iteration | Goal | Tasks |
| --- | --- | --- |
| Iteration 0 | Architecture and contract baseline | [TASK-001](./tasks/001-task-class-diagram-mvp-domains-ready.md), [TASK-002](./tasks/002-task-flow-diagrams-checkout-stock-debt-sync-ready.md), [TASK-003](./tasks/003-task-openapi-v1-skeleton-and-dto-baseline-ready.md) |
| Iteration 1 | Tablet-first UI and checkout validation | [TASK-004](./tasks/004-task-pos-tablet-layout-from-approved-reference-ready.md), [TASK-005](./tasks/005-task-checkout-payment-rules-cash-on-account-ready.md), [TASK-006](./tasks/006-task-playwright-mock-smoke-and-visual-baseline-ready.md) |
| Iteration 6 | Release hardening and reporting baseline | [RELEASE-001](./features/RELEASE-001-release-hardening-and-reporting-draft.md), [INVENTORY-001](./features/INVENTORY-001-stock-movement-and-weighted-average-profit-draft.md), [API-001](./features/API-001-contracts-v1-and-mock-runtime-draft.md) |

---

## 3. GitHub Sync Commands

From `workflow-manager/`:

```bash
# Option A: script auto-loads .env.github
# Supported locations:
# - ./workflow-manager/.env.github
# - project-root/.env.github
# - current working directory .env.github

# Ensure labels
./docs/scripts/sync-github.sh --ensure-labels

# Sync planning + features + tasks + epics
./docs/scripts/sync-github.sh --sync-execution

# Sync everything (also docs/workflow)
./docs/scripts/sync-github.sh --sync-all

# Option B: explicit env file path
GITHUB_ENV_FILE="../.env.github" ./docs/scripts/sync-github.sh --sync-execution
```

---

## 4. Glossary

| Term | Meaning | Where to read |
| --- | --- | --- |
| `PRD` | Product scope, goals, FR/NFR, risks, release strategy | [002 PRD](./planning/002-prd-simple-pos-draft.md) |
| `Requirements` | Use-case decomposition (high-level + detailed) and business rules | [001 Requirements](./planning/001-requirements-simple-pos-draft.md) |
| `Backlog` / `PBI` | Prioritized work items linked to PRD scope | [003 Backlog](./planning/003-backlog-simple-pos-draft.md) |
| `FR` | Functional Requirement (what system must do) | [001 FR section](./planning/001-requirements-simple-pos-draft.md#4-functional-requirements-fr) |
| `NFR` | Non-functional requirement (quality constraints) | [001 NFR section](./planning/001-requirements-simple-pos-draft.md#5-non-functional-requirements-nfr) |
| `UC` | Use Case (main/alternative/exception flows) | [001 Use Cases](./planning/001-requirements-simple-pos-draft.md#6-use-cases---high-level) |
| `BR` | Business Rule enforced in domain/application | [001 Business Rules](./planning/001-requirements-simple-pos-draft.md#8-business-rules-and-policies) |
| `Feature` | Delivery slice grouping related tasks/PBIs | [features/](./features/) |
| `Task` | Atomic, implementable unit with acceptance criteria and tests | [tasks/](./tasks/) |
| `Traceability` | Mapping FR/NFR/BR to PBIs/tests/issues | [001 Traceability Matrix](./planning/001-requirements-simple-pos-draft.md#11-traceability-matrix), [002 Traceability](./planning/002-prd-simple-pos-draft.md#9-traceability-and-handoff) |
| `weighted_average` | Costing policy used to compute inventory cost basis/profit | [001 Open Questions / Decisions](./planning/001-requirements-simple-pos-draft.md#10-risks-and-open-questions), [INVENTORY-001](./features/INVENTORY-001-stock-movement-and-weighted-average-profit-draft.md) |
| `on_account` | Sale mode that creates customer debt | [AR-001](./features/AR-001-on-account-debt-and-payments-draft.md) |
| `pending_sync` | Offline event state before backend synchronization | [OFFLINE-001](./features/OFFLINE-001-offline-capture-and-sync-draft.md) |

---

## 5. Standards and Method

- [Modern Scope Definition (PRD + Backlog)](./guides/modern-scope-definition-prd-backlog.md)
- [GitHub Issues and PR Standards](./guides/github-issues-pr-standards.md)
- [Templates README](./_system/templates/README.md)
