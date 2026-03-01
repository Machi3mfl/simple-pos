# Workflow Docs

This `docs/` workspace is a reusable base for project planning and issue traceability.

## Start Here
- [Workflow Index and Glossary](./WORKFLOW_INDEX.md)
- [Modern Scope Definition (PRD + Backlog)](./guides/modern-scope-definition-prd-backlog.md)
- [GitHub Issues and PR Standards](./guides/github-issues-pr-standards.md)

## Core system
- `_system/templates/`: source-of-truth templates
- `_system/examples/`: example documents
- `_system/integrations/`: integration notes

## Automation and utilities
- `scripts/`: GitHub sync + PR helper scripts
- `prompts/`: reusable prompt library
- `injector/`: optional sample-data injector scaffold
- `guides/`: methodology and operating standards (including GitHub issues/PR conventions)
- `pocs/`: feasibility and spike artifacts linked to upcoming features

## Diagram Format Rule
- Use Markdown files (`.md`) with embedded Mermaid blocks (` ```mermaid `).
- Do not create standalone Mermaid source files with `.mmd` extension.

## Project-owned folders
These folders are intentionally empty in this repository and must be filled per project:
- `features/`
- `pocs/`
- `planning/`
- `runbooks/`
- `guides/`
- `workflow/`
- `tasks/`
- `epics/`
