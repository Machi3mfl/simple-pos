# Requirements Definition: {project-or-feature-name}

## Document Metadata

**Document ID**: `{sequential-id}` (e.g., `001`, `002`)  
**File Name**: `{sequential-id}-requirements-{short-description}-{status}.md`  
**Status**: `draft` | `planning` | `ready` | `review` | `approved` | `cancelled`  
**Priority**: `high` | `medium` | `low`  
**Owner**: `{product-owner-or-requester}`  
**Author**: `{author}`  
**Version**: `{version}`  
**Created At**: `{yyyy-mm-dd}`  
**Last Updated**: `{yyyy-mm-dd}`  
**Related Epic/Feature**: `{link-or-id}`  
**Related Planning Doc**: `{link-or-id}`

---

## 1. Executive Summary

### Problem Statement
{what-problem-are-we-solving}

### Business Objective
{what-outcome-we-need}

### Success Metrics (KPIs)
- {kpi-1}
- {kpi-2}
- {kpi-3}

---

## 2. Scope Definition

### In Scope
- {in-scope-item-1}
- {in-scope-item-2}

### Out of Scope
- {out-of-scope-item-1}
- {out-of-scope-item-2}

### Assumptions
- {assumption-1}
- {assumption-2}

### Constraints
- {constraint-1}
- {constraint-2}

### Dependencies
- [ ] {dependency-1} - Status: `pending` | `completed` | `blocked`
- [ ] {dependency-2} - Status: `pending` | `completed` | `blocked`

---

## 3. Stakeholders and Users

### Stakeholders
- **{stakeholder-role-1}**: {expectation-or-responsibility}
- **{stakeholder-role-2}**: {expectation-or-responsibility}

### Personas / User Roles
- **{persona-1}**: {goal}
- **{persona-2}**: {goal}

---

## 4. Functional Requirements (FR)

| ID | Requirement | Priority | Source | Acceptance Summary |
| --- | --- | --- | --- | --- |
| FR-001 | {requirement} | high | {stakeholder/use-case} | {expected-behavior} |
| FR-002 | {requirement} | medium | {stakeholder/use-case} | {expected-behavior} |

---

## 5. Non-Functional Requirements (NFR)

| ID | Category | Requirement | Target/Threshold | Validation Method |
| --- | --- | --- | --- | --- |
| NFR-001 | performance | {requirement} | {target} | {test/metric} |
| NFR-002 | security | {requirement} | {target} | {test/audit} |
| NFR-003 | reliability | {requirement} | {target} | {test/monitoring} |
| NFR-004 | usability | {requirement} | {target} | {test/review} |

---

## 6. Use Cases - High Level (Trazo Grueso)

| UC ID | Name | Primary Actor | Trigger | Expected Result | Related FR |
| --- | --- | --- | --- | --- | --- |
| UC-001 | {use-case-name} | {actor} | {trigger} | {outcome} | FR-001, FR-002 |
| UC-002 | {use-case-name} | {actor} | {trigger} | {outcome} | FR-00X |

---

## 7. Use Cases - Detailed (Trazo Fino)

### UC-001 - {use-case-name}
- **Goal**: {goal}
- **Primary Actor**: {actor}
- **Preconditions**:
  - {precondition-1}
  - {precondition-2}
- **Trigger**: {trigger}
- **Main Flow**:
  1. {step-1}
  2. {step-2}
  3. {step-3}
- **Alternative Flows**:
  1. {alt-flow-1}
  2. {alt-flow-2}
- **Exception Flows**:
  1. {exception-1}
  2. {exception-2}
- **Business Rules**:
  - BR-001
  - BR-002
- **Data Inputs/Outputs**:
  - Input: {input-data}
  - Output: {output-data}
- **Postconditions**:
  - {postcondition-1}
  - {postcondition-2}
- **Acceptance Criteria (BDD)**:
  - [ ] **Given** {context}, **When** {action}, **Then** {expected-result}
  - [ ] **Given** {context}, **When** {action}, **Then** {expected-result}

> Duplicate this section for each use case (`UC-002`, `UC-003`, etc.).

---

## 8. Business Rules and Policies

| ID | Rule | Rationale | Related FR/UC |
| --- | --- | --- | --- |
| BR-001 | {rule} | {why} | FR-001, UC-001 |
| BR-002 | {rule} | {why} | FR-002, UC-00X |

---

## 9. Data and Integrations (High Level)

### Data Entities
- {entity-1}
- {entity-2}

### External Integrations
- {service-1}: {purpose}
- {service-2}: {purpose}

---

## 10. Risks and Open Questions

### Risks
- **R-001**: {risk-description} - Mitigation: {mitigation}
- **R-002**: {risk-description} - Mitigation: {mitigation}

### Open Questions
- [ ] Q-001: {question}
- [ ] Q-002: {question}

---

## 11. Traceability Matrix

| Item Type | ID | Mapped To | Verification |
| --- | --- | --- | --- |
| FR | FR-001 | UC-001, BR-001 | unit/integration/e2e |
| NFR | NFR-001 | UC-001 | performance/security test |
| BR | BR-001 | FR-001, UC-001 | business-rule tests |

---

## 12. Approval Checklist

- [ ] Scope approved by business owner
- [ ] Functional requirements validated
- [ ] Non-functional requirements validated
- [ ] High-level use cases reviewed
- [ ] Detailed use cases reviewed
- [ ] Traceability matrix completed
- [ ] Risks accepted or mitigated
- [ ] Ready to create planning document

### Sign-off
- **Business Owner**: `{name}` - `{date}`
- **Product Owner**: `{name}` - `{date}`
- **Tech Lead / Architect**: `{name}` - `{date}`

---

## 13. Planning Handoff (Next Step)

After approval, break this document into execution artifacts:
- `Epic` doc (if needed)
- `Feature` docs
- `Task` docs with atomic acceptance criteria
- test plan aligned with FR/NFR/UC traceability
