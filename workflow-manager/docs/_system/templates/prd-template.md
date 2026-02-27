# PRD: {product-or-feature-name}

## Document Metadata

**Document ID**: `{sequential-id}` (e.g., `001`, `002`)  
**File Name**: `{sequential-id}-prd-{short-description}-{status}.md`  
**Status**: `draft` | `planning` | `ready` | `review` | `approved` | `cancelled`  
**Owner**: `{product-owner}`  
**Author**: `{author}`  
**Version**: `{version}`  
**Created At**: `{yyyy-mm-dd}`  
**Last Updated**: `{yyyy-mm-dd}`  
**Linked Backlog**: `{backlog-doc-link}`  
**Linked Design**: `{design-link}`

---

## 1. Product Context

### Problem Statement
{what-problem-does-this-solve}

### Target Users
- {user-segment-1}
- {user-segment-2}

### Why Now
{business-urgency-or-opportunity}

---

## 2. Goals and Non-Goals

### Goals
- {goal-1}
- {goal-2}
- {goal-3}

### Non-Goals
- {non-goal-1}
- {non-goal-2}

### Success Metrics
| Metric | Target | Measurement Window | Owner |
| --- | --- | --- | --- |
| {metric-1} | {target} | {window} | {owner} |
| {metric-2} | {target} | {window} | {owner} |

---

## 3. Scope

### In Scope (MVP)
- {in-scope-item-1}
- {in-scope-item-2}

### Out of Scope (MVP)
- {out-of-scope-item-1}
- {out-of-scope-item-2}

### Assumptions
- {assumption-1}
- {assumption-2}

### Constraints
- {constraint-1}
- {constraint-2}

---

## 4. User Experience and Flows

### UX Principles
- {ux-principle-1}
- {ux-principle-2}

### Primary User Journeys (High Level)
| Journey ID | Name | Actor | Trigger | Expected Outcome |
| --- | --- | --- | --- | --- |
| J-001 | {journey-name} | {actor} | {trigger} | {result} |
| J-002 | {journey-name} | {actor} | {trigger} | {result} |

### Key Screens / States
- {screen-1}
- {screen-2}

---

## 5. Requirements

### Functional Requirements (FR)
| ID | Requirement | Priority | Acceptance Summary | Journey |
| --- | --- | --- | --- | --- |
| FR-001 | {requirement} | high | {expected-behavior} | J-001 |
| FR-002 | {requirement} | medium | {expected-behavior} | J-002 |

### Non-Functional Requirements (NFR)
| ID | Category | Requirement | Target/Threshold | Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | performance | {requirement} | {target} | {test-or-metric} |
| NFR-002 | security | {requirement} | {target} | {test-or-audit} |
| NFR-003 | usability | {requirement} | {target} | {review-or-test} |

---

## 6. API and Domain Boundaries

### Domain Modules (Hexagonal)
- {module-1}
- {module-2}

### API Contract Overview
| Endpoint/Action | Method | Purpose | Request DTO | Response DTO |
| --- | --- | --- | --- | --- |
| `/api/{resource}` | GET | {purpose} | {schema} | {schema} |
| `/api/{resource}` | POST | {purpose} | {schema} | {schema} |

### External Integrations
- {integration-1} - {phase}
- {integration-2} - {phase}

---

## 7. Release Strategy

### Phase Plan
- **Phase 0 (UI Mock + Contracts)**: {description}
- **Phase 1 (MVP Real Persistence)**: {description}
- **Phase 2 (Post-MVP Enhancements)**: {description}

### Go/No-Go Criteria for MVP
- [ ] {criterion-1}
- [ ] {criterion-2}

---

## 8. Risks and Open Questions

### Risks
- **R-001**: {risk} - Mitigation: {mitigation}
- **R-002**: {risk} - Mitigation: {mitigation}

### Open Questions
- [ ] Q-001: {question}
- [ ] Q-002: {question}

---

## 9. Traceability and Handoff

### Traceability
| PRD Item | Backlog Item(s) | Test Type |
| --- | --- | --- |
| FR-001 | PBI-001, PBI-004 | unit/integration/e2e |
| NFR-001 | PBI-00X | performance |

### Planning Handoff
- Link every FR/NFR to at least one Product Backlog Item.
- Use `feature-template.md` for grouped delivery slices.
- Use `task-template.md` for atomic implementation tasks.

---

## 10. Approvals

- [ ] Product Owner approval
- [ ] Tech Lead/Architect approval
- [ ] Business stakeholder approval

### Sign-off
- **Product Owner**: `{name}` - `{date}`
- **Tech Lead**: `{name}` - `{date}`
- **Business Owner**: `{name}` - `{date}`
