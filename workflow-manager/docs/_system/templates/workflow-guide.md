# Workflow Methodology Guide

## 📋 Methodology Overview

This guide describes the document organization methodology using the `workflow/` folder with `{ID}-{TYPE}-{SHORT_DESCRIPTION}-{STATUS}.md` nomenclature.

## 🎯 Objectives

- **Immediate visibility**: See all documents and their states at a glance
- **GitHub independence**: No need to create issues before documenting
- **Traceability**: Clear tracking of each element's progress
- **Simplicity**: A single folder for all document types

## 📁 File Structure

### Nomenclature
```
{ID}-{TYPE}-{SHORT_DESCRIPTION}-{STATUS}.md
```

**Examples:**
- `001-epic-user-authentication-draft.md`
- `002-feature-login-form-in_progress.md`
- `003-task-setup-database-completed.md`
- `004-poc-socket-integration-review.md`
- `011-epic-add-agent-management-draft.md`

### Components

#### ID (Sequential)
- **Format**: 3-digit sequential numbers (`001`, `002`, `003`)
- **Purpose**: Unique identification independent of GitHub
- **Advantages**: 
  - No need to create issue first
  - Easy internal reference
  - Natural chronological order

#### TYPE (Document Type)
- `epic`: Large strategic initiatives
- `feature`: Specific functionalities
- `task`: Individual development tasks
- `poc`: Proof of concepts

#### SHORT_DESCRIPTION (Brief Description)
- **Format**: kebab-case (words separated by hyphens)
- **Pattern**: `action-what` (action + what)
- **Examples**:
  - `add-user-authentication`
  - `implement-socket-connection`
  - `setup-database-schema`
  - `create-login-form`
- **Purpose**: Quick content identification without opening the file

#### STATUS (State)
- `draft`: Initial draft
- `planning`: In planning
- `ready`: Ready for development
- `in_progress`: In development
- `review`: Under review
- `blocked`: Blocked
- `completed`: Completed
- `cancelled`: Cancelled

## 🔄 Workflow

### 1. Document Creation
```bash
# Get next available ID
ls docs/workflow/ | grep -E '^[0-9]{3}-' | sort | tail -1

# Create new document with description
cp docs/_system/templates/{type}-template.md docs/workflow/{next-id}-{type}-{short-description}-draft.md

# Example:
cp docs/_system/templates/task-template.md docs/workflow/005-task-implement-auth-draft.md
```

### 2. Status Change
```bash
# Rename file to change status
mv docs/workflow/001-task-setup-database-draft.md docs/workflow/001-task-setup-database-in_progress.md
```

### 3. GitHub Reference (Optional)
- GitHub Issue and PR IDs are added **inside** the markdown file
- Not required to create the document
- Can be added when available

## 📝 Updated Templates

All templates in `docs/_system/templates/` have been updated to include:

- **Document ID**: Field for sequential ID
- **File Name**: Nomenclature example with SHORT_DESCRIPTION
- **GitHub Issue/PR**: Optional fields
- **Status**: Standardized states

## 🛠️ Helper Scripts (Future)

### Create New Document
```bash
# Proposed script: create-doc.sh
./scripts/create-doc.sh task "implement-authentication"
# Result: 005-task-implement-authentication-draft.md
```

### Change Status
```bash
# Proposed script: change-status.sh
./scripts/change-status.sh 005 in_progress
# Result: 005-task-implement-authentication-draft.md → 005-task-implement-authentication-in_progress.md
```

### List by Status
```bash
# Proposed script: list-by-status.sh
./scripts/list-by-status.sh in_progress
# Result: Lists all documents in progress
```

## 📊 Methodology Advantages

### Visibility
- **Quick view**: `ls docs/workflow/` shows entire project status
- **Easy filtering**: `ls docs/workflow/*-in_progress-*` shows only elements in progress
- **Natural order**: Files are sorted by chronological ID

### Operational Efficiency
- **No navigation**: No need to browse through multiple folders
- **No movement**: Change status = rename file
- **Quick search**: Find by ID, type, or status

### Traceability
- **Clear history**: Sequential ID shows creation order
- **Internal references**: Easy reference between documents
- **GitHub integration**: Issue/PR IDs are added when available

## 🔗 GitHub Integration

### Recommended Flow
1. **Create document** with sequential ID
2. **Develop content** in DRAFT/PLANNING status
3. **Create GitHub Issue** when ready
4. **Add reference** of the issue inside the markdown
5. **Create PR** and add reference when appropriate

### Internal Reference Example
```markdown
**Document ID**: `005`
**GitHub Issue**: #123 (added when issue was created)
**Pull Request**: #456 (added when PR was created)
```

## 📋 Migration from Previous Structure

### Completed Steps
1. ✅ Created `docs/workflow/` folder
2. ✅ Updated all templates
3. ✅ Maintained `docs/_system/` folder for templates and documentation

### Next Steps
- Migrate existing documents (if any)
- Create helper scripts
- Update `workflow-manager/docs/guides/quick-start.md`

## 🎯 Use Cases

### New Developer
```bash
# View current project status
ls docs/workflow/

# Search for available tasks
ls docs/workflow/*-task-*-ready-*

# View epics in progress
ls docs/workflow/*-epic-*-in_progress-*
```

### Product Manager
```bash
# View all features
ls docs/workflow/*-feature-*

# View blocked elements
ls docs/workflow/*-blocked-*

# View general progress
ls docs/workflow/ | sort
```

### Architect
```bash
# View active POCs
ls docs/workflow/*-poc-*

# View completed epics
ls docs/workflow/*-epic-*-completed-*
```

---

This methodology provides an optimal balance between simplicity, visibility, and traceability, while maintaining flexibility to integrate with GitHub when necessary.
