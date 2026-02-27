# GitHub Issues and PR Standards

## Objective

Standardize how Issues and Pull Requests are created so all artifacts follow a predictable structure and traceability model.

This project uses:
- PRD + Product Backlog as primary planning artifacts.
- Feature/Task docs for implementation execution.
- GitHub Issues/PR as collaboration and delivery records.

---

## 1) Naming Convention

### Issue Titles
Use these prefixes:
- `[PRD-XXX]` for PRD scope/approval issues
- `[REQ-XXX]` for use-case decomposition complement
- `[PBI-XXX]` for backlog items
- `[EPIC-XXX]` for epics
- `[FEATURE-XXX]` for feature execution
- `[TASK-XXX]` for atomic tasks

Examples:
- `[PRD-002] simple-pos MVP scope approval`
- `[PBI-013] real backend E2E release gate`
- `[FEATURE-001] POS visual catalog and cart interactions`
- `[TASK-014] validate CreateSaleDTO with zod`

### PR Titles
Use conventional-style prefixes plus artifact id when possible:
- `feat(pos): visual catalog grid [PBI-001]`
- `fix(inventory): prevent negative stock [TASK-014]`
- `docs(workflow): update PRD traceability [PRD-002]`

---

## 2) One-Issue-Per-Artifact Rule

Recommended default:
- 1 issue per PRD
- 1 issue per PBI
- 1 issue per Feature
- 1 issue per Task

Optional:
- 1 issue per Requirements/use-case decomposition doc

This avoids ambiguity and keeps progress measurable.

---

## 3) Required Traceability

Every implementation issue should reference:
1. PRD item(s): FR/NFR affected
2. Backlog item (PBI)
3. Feature/Task markdown path

Every PR should include:
1. `Closes #<issue>`
2. Linked docs paths
3. Test evidence

---

## 4) GitHub Templates in This Repo

### Issue Forms
Location: `.github/ISSUE_TEMPLATE/`

- `01-prd.yml`
- `02-backlog-item.yml`
- `03-epic.yml`
- `04-feature.yml`
- `05-task.yml`
- `06-requirements.yml`

### Pull Request Template
Location: `.github/PULL_REQUEST_TEMPLATE.md`

All templates enforce nearly identical structure:
- context/value
- scope
- acceptance criteria
- dependencies/risks
- testing and traceability

---

## 5) Labels

Core labels expected by automation:
- type: `prd`, `backlog`, `requirements`, `epic`, `feature`, `task`, `poc`
- context: `planning`, `workflow`, `documentation`
- priority: `priority:high`, `priority:medium`, `priority:low`
- status: `status:draft`, `status:planning`, `status:ready`, `status:in_progress`, `status:review`, `status:approved`, `status:blocked`, `status:completed`, `status:cancelled`, `status:candidate`, `status:done`

The sync script can create/ensure these labels.

---

## 6) Automation Workflow

From `workflow-manager/`:

```bash
# Option A: script auto-loads .env.github
# Ensure labels exist
./docs/scripts/sync-github.sh --ensure-labels

# Sync planning artifacts (PRD, backlog, requirements)
./docs/scripts/sync-github.sh --sync-planning

# Sync execution artifacts (planning + features + tasks + epics)
./docs/scripts/sync-github.sh --sync-execution

# Sync all workflow artifacts
./docs/scripts/sync-github.sh --sync-all

# Option B: explicit env file
GITHUB_ENV_FILE="../.env.github" ./docs/scripts/sync-github.sh --sync-execution
```

---

## 7) Practical Recommendation

For this project, do not create "generic" issues.
Create issues from artifacts using templates and keep markdown as source-of-truth.

That gives:
- consistent issue/PR structure
- complete scope traceability
- cleaner planning-to-delivery flow
