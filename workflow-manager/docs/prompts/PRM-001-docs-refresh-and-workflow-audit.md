# PRM-001 - Docs Refresh and Workflow Audit

## Objective
Use this prompt after significant feature completion to refresh project documentation and verify workflow-manager/GitHub issue consistency without creating new issues.

## Reusable Prompt
```text
You are working in the `<project-repository>` repository.

Goal:
Refresh project documentation to match the current codebase and audit workflow-manager synchronization status.

Scope:
1) Update documentation summaries:
   - `workflow-manager/docs/PROJECT-SUMMARY.md` (if used in this project)
   - `workflow-manager/docs/API-SUMMARY.md` (if used in this project)
   Include current modules/features, endpoint coverage, and GitHub issue traceability where applicable.

2) Reorganize documentation if needed:
   - Move loose docs into stable folders (`planning/`, `guides/`, `runbooks/`) when appropriate.
   - Ensure all references are updated after moves.
   - Keep all documentation in English.

3) Keep technical examples close to ownership:
   - Place `.rest`/API examples under the corresponding module or feature docs.
   - Remove stale references to old locations.

4) Validate feature traceability:
   - Ensure every markdown file under `workflow-manager/docs/features/` has `**GitHub Issue**: #<id>`.
   - Report missing issue references.

5) Run workflow-manager sync in safe mode:
   - Do not create new GitHub issues.
   - Do not reopen closed issues.
   - Use dedupe/close-only behavior where possible.

6) Verify GitHub issue state:
   - Confirm open issue count is `0`.
   - Cross-check all issue IDs referenced in markdown against GitHub.
   - Report any invalid references (ID present in markdown but issue does not exist).

Constraints:
- Do not create new issues.
- Keep existing closed issues closed.
- Do not modify business code unless required for docs linkage.
- Output everything in English.

Expected output:
1) Files changed and why.
2) Workflow-manager sync command used.
3) Open issue count after sync.
4) Missing issue references (if any).
5) Invalid issue IDs referenced in docs (if any).
6) Follow-up recommendations.
```

## Notes
- This prompt is intentionally conservative for repositories where all planned work is already completed.
- If you later need active planning mode, create a separate prompt variant that allows issue creation.
