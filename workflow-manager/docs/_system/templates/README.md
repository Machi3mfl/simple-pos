# Feature Tracking Templates

## Overview

This system provides reusable templates for tracking features, tasks, and progress across projects. Designed to be AI-friendly and easily parseable.

## 📋 Available Templates

### 0. PRD Template
**File**: `prd-template.md`  
**Purpose**: Define product scope, goals, requirements (FR/NFR), UX flows, and release strategy as a living document  
**When to Use**: Initial product/feature scope definition before implementation planning

### 1. Product Backlog Template
**File**: `product-backlog-template.md`  
**Purpose**: Maintain prioritized PBIs with acceptance criteria, dependencies, MVP cutline, and traceability to PRD  
**When to Use**: Right after PRD draft, during refinement and throughout execution

### 2. Requirements Template (Optional Complement)
**File**: `requirements-template.md`  
**Purpose**: Define and validate scope, functional/non-functional requirements, and use cases (high-level and detailed) before planning  
**When to Use**: When use-case-heavy analysis or formal requirement decomposition is needed

### 3. Feature Template
**File**: `feature-template.md`  
**Purpose**: Plan and document new features or major functionality  
**When to Use**: Starting development of a new feature that will span multiple tasks

### 4. Task Template  
**File**: `task-template.md`  
**Purpose**: Define atomic, testable units of work focused on business logic  
**When to Use**: Breaking down features into implementable components

### 5. Epic Template
**File**: `epic-template.md`  
**Purpose**: Manage large initiatives spanning multiple features  
**When to Use**: Planning major system changes or multi-sprint projects

### 6. POC Template
**File**: `poc-template.md`  
**Purpose**: Evaluate feature feasibility through structured experimentation  
**When to Use**: Before committing to feature development, when technical or business viability is uncertain

## AI Usage Instructions

### For AI Assistants:
1. **Start with `prd-template.md`** for modern scope definition
2. **Create `product-backlog-template.md`** to manage PBIs and priorities
3. **Use feature/task templates** to execute backlog items
4. **Follow the entity-based structure** from project rules
5. **Focus on business logic** over technical implementation
6. **Include acceptance criteria** for every task
7. **Generate unit tests** based on acceptance criteria
8. **Use consistent naming conventions**: `[ENTITY-XXX]` format
9. **Use `requirements-template.md` as optional complement** for deeper use-case decomposition

### Template Variables:
- `{feature-name}`: kebab-case feature name
- `{entity}`: Core entity (agent, manager, task, auth)
- `{task-id}`: Format: `[ENTITY-XXX]` (e.g., `[AGENT-001]`)
- `{github-issue}`: GitHub issue number
- `{pr-number}`: Pull request number

## Quick Start

1. Copy `prd-template.md` and define scope/goals/FR/NFR
2. Copy `product-backlog-template.md` and map PBIs to PRD items
3. (Optional) Use `requirements-template.md` for formal use-case decomposition
4. Create epic/feature/task docs for implementation
5. Replace all `{variables}` with actual values
6. Use GitHub templates in `.github/ISSUE_TEMPLATE/` and `.github/PULL_REQUEST_TEMPLATE.md` for consistent collaboration records
7. Run sync script to create/update linked GitHub issues
8. Start development following the task breakdown

## Workflow Examples

### Epic Workflow
1. Copy epic-template.md to docs/epics/{epic-name}.md
2. Define scope and break down into features
3. Create feature documents for each component
4. Track progress across all features
5. Manage releases and milestones

### POC Workflow
1. Copy poc-template.md to docs/pocs/{poc-name}.md
2. Define hypothesis and success criteria
3. Design experiment approach
4. Implement and test
5. Analyze results and make go/no-go decision
6. If GO: Create feature document for full implementation

## Project Implementation Workflow

The directory `workflow-manager/` is the designated central hub for managing and tracking the implementation of project requirements.

**Key Guidelines:**
1.  **Requirement Implementation Tracking**: All feature development and requirement implementation must be planned, documented, and tracked using the templates within this `workflow-manager` structure.
2.  **GitHub Synchronization**: It is mandatory to keep this documentation synchronized with the GitHub repository. All feature plans, task breakdowns, and status updates should be committed and pushed to ensure a single source of truth and version control.
3.  **Feature Documentation (Living Documentation)**:
    *   **Mandatory File**: Every feature MUST have a corresponding Markdown file (e.g., `docs/features/FEATURE-XXX-name.md`).
    *   **Content**: This file must include:
        *   Detailed Use Case explanation.
        *   **Code Examples**: Snippets showing how to use the feature (API calls, function signatures).
    *   **Maintenance**: This document is NOT static. It must be updated whenever the code changes to reflect the current reality (Living Documentation).
    *   **Naming Convention**: Use the `[ENTITY-XXX]` format consistent with the workflow manager (e.g., `INVENTORY-001-bulk-upload.md`).

## Integration with Project Rules

These templates enforce the project's Clean Architecture principles:
- Business logic tasks map to `/src/core/{entity}/` structure
- Technical subtasks follow the domain/application/infrastructure pattern
- All tasks require tests in the appropriate layer
