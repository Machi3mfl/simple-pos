# Task: {task-name}

## 📋 Task Overview

**Document ID**: `{sequential-id}` (e.g., `001`, `002`, `003`)  
**File Name**: `{sequential-id}-task-{short-description}-{status}.md` (e.g., `001-task-implement-auth-draft.md`)  
**Feature**: `{parent-feature-name}`  
**Entity**: `{entity}` (agent | manager | task | auth)  
**GitHub Issue**: #{github-issue} (opcional - se puede agregar cuando se cree el issue)  
**Pull Request**: #{pr-number} (opcional - se puede agregar cuando se cree el PR)  
**Status**: `draft` | `planning` | `ready` | `in_progress` | `review` | `blocked` | `completed` | `cancelled`  
**Priority**: `high` | `medium` | `low`  
**Assignee**: `{assignee}`  
**Estimated Effort**: `{hours}h`  
**Actual Effort**: `{hours}h`  

### Business Logic Description
<!-- Clear description of the business logic this task implements -->
{business-logic-description}

### Business Rules
<!-- Specific business rules this task must enforce -->
- {business-rule-1}
- {business-rule-2}
- {business-rule-3}

---

## 🎯 Acceptance Criteria

### Functional Requirements
- [ ] **Given** {precondition}, **When** {action}, **Then** {expected-result}
- [ ] **Given** {precondition}, **When** {action}, **Then** {expected-result}
- [ ] **Given** {precondition}, **When** {action}, **Then** {expected-result}

### Non-Functional Requirements
- [ ] Performance: {performance-requirement}
- [ ] Security: {security-requirement}
- [ ] Reliability: {reliability-requirement}

### Error Handling
- [ ] **Given** {error-condition}, **When** {action}, **Then** {error-handling-behavior}
- [ ] **Given** {invalid-input}, **When** {action}, **Then** {validation-error-response}

---

## 🏗️ Technical Implementation

### Architecture Layer
- **Domain Layer**: `src/core/{entity}/domain/`
- **Application Layer**: `src/core/{entity}/application/`
- **Infrastructure Layer**: `src/core/{entity}/infrastructure/`
- **Presentation Layer**: `src/core/{entity}/presentation/`

### Files to Create/Modify
```
src/core/{entity}/
├── domain/
│   ├── entities/
│   │   └── {EntityName}.ts          # [Create/Modify]
│   ├── interfaces/
│   │   └── I{InterfaceName}.ts      # [Create/Modify]
│   └── value-objects/
│       └── {ValueObjectName}.ts     # [Create/Modify]
├── application/
│   ├── use-cases/
│   │   └── {UseCaseName}.ts         # [Create/Modify]
│   └── services/
│       └── {ServiceName}.ts         # [Create/Modify]
├── infrastructure/
│   └── repositories/
│       └── {RepositoryName}.ts      # [Create/Modify]
└── presentation/
    ├── components/
    │   └── {ComponentName}.tsx      # [Create/Modify]
    └── hooks/
        └── use{HookName}.ts         # [Create/Modify]
```

### Dependencies
- **Internal Dependencies**: {internal-dependencies}
- **External Dependencies**: {external-dependencies}
- **Socket.IO Events**: {socket-events}

---

## 🧪 Testing Requirements

### Unit Tests (Required)
**Location**: `src/core/{entity}/__tests__/`

#### Domain Layer Tests
- [ ] **File**: `{EntityName}.test.ts`
  - **Test Cases**:
    - [ ] `should create valid entity with correct properties`
    - [ ] `should throw error for invalid input`
    - [ ] `should enforce business rules`
  - **Coverage**: 100%

- [ ] **File**: `{ValueObjectName}.test.ts`
  - **Test Cases**:
    - [ ] `should create valid value object`
    - [ ] `should validate input constraints`
    - [ ] `should be immutable`
  - **Coverage**: 100%

#### Application Layer Tests
- [ ] **File**: `{UseCaseName}.test.ts`
  - **Test Cases**:
    - [ ] `should execute use case successfully with valid input`
    - [ ] `should handle business rule violations`
    - [ ] `should handle repository failures`
    - [ ] `should return expected output format`
  - **Coverage**: 100%

- [ ] **File**: `{ServiceName}.test.ts`
  - **Test Cases**:
    - [ ] `should coordinate between use cases correctly`
    - [ ] `should handle service dependencies`
    - [ ] `should manage transactions properly`
  - **Coverage**: 100%

#### Infrastructure Layer Tests
- [ ] **File**: `{RepositoryName}.test.ts`
  - **Test Cases**:
    - [ ] `should save entity correctly`
    - [ ] `should retrieve entity by id`
    - [ ] `should handle not found scenarios`
    - [ ] `should handle database errors`
  - **Coverage**: 100%

### Integration Tests (Optional)
**Location**: `src/core/{entity}/__tests__/integration/`

- [ ] **File**: `{TaskName}Integration.test.ts`
  - **Test Cases**:
    - [ ] `should complete full workflow end-to-end`
    - [ ] `should handle cross-layer interactions`
    - [ ] `should maintain data consistency`

### Component Tests (If UI Changes)
**Location**: `src/core/{entity}/presentation/components/__tests__/`

- [ ] **File**: `{ComponentName}.test.tsx`
  - **Test Cases**:
    - [ ] `should render with correct props`
    - [ ] `should handle user interactions`
    - [ ] `should display loading states`
    - [ ] `should display error states`

---

## 🔧 Implementation Checklist

### Pre-Development
- [ ] Task requirements understood
- [ ] Architecture design reviewed
- [ ] Dependencies identified
- [ ] Test cases planned

### Development Phase
- [ ] Domain entities created/modified
- [ ] Business rules implemented
- [ ] Use cases implemented
- [ ] Repository interfaces defined
- [ ] Repository implementations created
- [ ] Presentation components created (if needed)

### Testing Phase
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (if applicable)
- [ ] Component tests written and passing (if applicable)
- [ ] Code coverage meets requirements (100% for business logic)

### Code Quality
- [ ] TypeScript strict mode compliance
- [ ] ESLint rules passing
- [ ] Prettier formatting applied
- [ ] No `any` types used
- [ ] Proper error handling implemented
- [ ] JSDoc comments added for public methods

### Review & Deployment
- [ ] Self-review completed
- [ ] Code review requested
- [ ] Code review approved
- [ ] CI/CD pipeline passing
- [ ] Documentation updated

---

## 🔗 Related Information

### Parent Feature
- **Feature**: [{parent-feature-name}](../features/{parent-feature-name}.md)
- **GitHub Issue**: [#{parent-github-issue}](https://github.com/{repo}/issues/{parent-github-issue})

### Related Tasks
- **Depends On**: [{ENTITY-XXX}](./[{ENTITY-XXX}]-{task-name}.md)
- **Blocks**: [{ENTITY-XXX}](./[{ENTITY-XXX}]-{task-name}.md)

### Documentation
- **API Documentation**: [Link to API docs]
- **Architecture Decision**: [Link to ADR]
- **Design Mockups**: [Link to designs]

---

## 📝 Implementation Notes

### Technical Decisions
- **Decision 1**: {technical-decision} - *Rationale*: {rationale}
- **Decision 2**: {technical-decision} - *Rationale*: {rationale}

### Challenges & Solutions
- **Challenge**: {challenge-description}
  - **Solution**: {solution-description}
  - **Alternative Considered**: {alternative-solution}

### Performance Considerations
- {performance-consideration-1}
- {performance-consideration-2}

### Security Considerations
- {security-consideration-1}
- {security-consideration-2}

---

## ✅ Definition of Done

- [ ] All acceptance criteria met
- [ ] Business rules properly enforced
- [ ] Unit tests written and passing (100% coverage for business logic)
- [ ] Integration tests passing (if applicable)
- [ ] Code follows project architecture guidelines
- [ ] No framework dependencies in business logic
- [ ] TypeScript strict mode compliance
- [ ] Code review completed and approved
- [ ] Documentation updated
- [ ] CI/CD pipeline passing

---

*Last Updated*: {last-updated-date}  
*Created By*: {creator}  
*Template Version*: 1.0