# Architecture Guidelines & Agent Instructions

This document defines the architectural standards and coding conventions for the project. It is intended to guide AI agents and developers in maintaining a consistent, scalable, and decoupled codebase based on **Hexagonal Architecture (Ports and Adapters)**.

## 1. Architectural Pattern: Hexagonal (Clean Architecture)

The system is divided into concentric layers. The most critical rule is the **Dependency Rule**: source code dependencies can only point **inwards**. Nothing in an inner circle can know anything at all about something in an outer circle.

### Layers

#### 🟢 Core (Inner Layer)
*   **Location**: `src/core`
*   **Responsibility**: Contains the business logic and domain entities. It is pure TypeScript and has **ZERO dependencies** on frameworks (Next.js, React), databases (Supabase), or external libraries.
*   **Components**:
    *   **Domain Entities**: Pure classes/interfaces representing business objects (e.g., `Order`, `ProductKey`).
    *   **Value Objects**: Immutable objects defined by their attributes (e.g., `Email`, `Price`).
    *   **Domain Services**: Stateless domain operations that do not naturally belong to a single Entity/Value Object (e.g., pricing or debt allocation policy across aggregates).
    *   **Ports (Interfaces)**:
        *   *Repository Interfaces*: Define how to save/retrieve data (e.g., `OrderRepository`).
        *   *Service Interfaces*: Define external services (e.g., `PaymentGateway`, `EmailSender`).
    *   **Use Cases (Application Services)**: Orchestrators that implement specific business rules using Entities and Ports (e.g., `CreateOrderUseCase`, `ClaimKeyUseCase`).

#### 🟡 Infrastructure (Middle Layer)
*   **Location**: `src/infrastructure`
*   **Responsibility**: Implements the interfaces (Ports) defined in the Core. This is where frameworks and tools live.
*   **Components**:
    *   **Repositories**: Concrete implementations using the database (e.g., `SupabaseOrderRepository`).
    *   **Adapters**: Implementations of external services (e.g., `SendGridEmailSender`).
    *   **Config**: Environment variables and external client initialization.
*   **Critical Rule**:
    *   **NO Business Logic in DB**: Avoid using Stored Procedures, Triggers, or RLS for complex business rules. Logic must live in the Application Core to remain database-agnostic.
    *   **Supabase Role**: Treat Supabase purely as a Persistence Layer and Auth Provider.

#### 🔴 Presentation / Interface (Outer Layer)
*   **Location**: `src/app` (Next.js App Router)
*   **Responsibility**: Interaction with the user or external systems via HTTP.
*   **Components**:
    *   **React Components**: UI using `shadcn/ui`.
    *   **API Routes**: Next.js Route Handlers acting as controllers.
    *   **Server Actions**: Entry points for mutations.
    *   **DTOs**: Data Transfer Objects for validation (Zod schemas).

## 2. Implementation Rules

1.  **Dependency Direction**:
    *   `Infrastructure` depends on `Core`.
    *   `Presentation` depends on `Core` (to call Use Cases).
    *   `Core` depends on NOTHING.

2.  **Inversion of Control (IoC)**:
    *   The `Core` defines *interfaces* for what it needs.
    *   The `Infrastructure` implements those interfaces.
    *   Dependency Injection (manual or via container) is used to provide implementations to Use Cases at runtime.

3.  **Testing**:
    *   **Core**: Unit tests are fast and easy because everything can be mocked.
    *   **Infrastructure**: Integration tests are required here.

## 3. Directory Structure Template (Modular / Vertical Slices)

The architecture is organized by **Modules (Entities/Features)**. Each module is a self-contained unit that respects the Hexagonal Architecture layers internally.

```
src/
├── modules/               # Vertical Slices (Features/Entities)
│   ├── [module-name]/     # e.g., 'order', 'inventory', 'auth'
│   │   ├── domain/        # Pure Business Logic (Entities, Value Objects, Repository Interfaces)
│   │   │   ├── entities/
│   │   │   └── errors/
│   │   ├── application/   # Use Cases (Interactors) & Services
│   │   │   └── use-cases/
│   │   ├── infrastructure/# Implementation of Interfaces
│   │   │   ├── repositories/ # Concrete Repositories (e.g., SupabaseOrderRepository)
│   │   │   └── mappers/      # Data Mappers (DB <-> Domain)
│   │   └── presentation/  # Module-specific UI & Controllers
│   │       ├── components/   # React Components specific to this module
│   │       └── actions.ts    # Server Actions
│   │
├── shared/                # Shared Kernel (Cross-cutting concerns)
│   ├── core/              # Shared Domain abstractions (Entity base class, Result type)
│   └── infra/             # Shared Infrastructure (Database client, Generic Repositories)
│
├── app/                   # Next.js App Router (Main Entry Point / Routing)
│   ├── (public)/          # Public Pages
│   ├── (admin)/           # Admin Pages
│   └── api/               # API Routes (Delegates to Module Use Cases)
│
└── lib/                   # External libraries setup (utils, constants)
```

### Layer Details per Module:
*   **Domain**: Defines *what* the module does. Contains `Entities`, `Value Objects`, `Domain Services`, and `Repository Interfaces`. Dependencies: None.
*   **Application**: Orchestrates logic. Contains `Use Cases`. Dependencies: `Domain`.
*   **Infrastructure**: Implements the plumbing. Contains `Concrete Repositories` and `DTOs`. Dependencies: `Domain` (implements interfaces), `Shared/Infra`.
*   **Presentation**: UI elements. Dependencies: `Application` (triggers use cases).


## 4. Tech Stack Specifics

*   **Framework**: Next.js 14+ (App Router).
*   **Language**: TypeScript (Strict Mode).
*   **Database**: Supabase (PostgreSQL).
*   **UI**: Tailwind CSS + shadcn/ui.
*   **Validation**: Zod (for DTOs and Domain validation).

## 5. Development Standards

### Domain-Driven Design (DDD) Principles
Since the project handles complex business logic (Inventory Management, Secure Delivery), **DDD is mandatory** for the Core layer.
*   **Ubiquitous Language**: Use the exact same terminology in the code as in the `REQUIREMENTS.md` (e.g., `ClaimToken`, `ProductKey`, `OrderMetadata`).
*   **Rich Domain Models**: Entities must contain business logic (methods), not just data. Avoid "Anemic Domain Models".
    *   *Bad*: `order.status = 'PAID';` (Public setter)
    *   *Good*: `order.markAsPaid();` (Method that enforces invariants)
*   **No Anemic Domain Model Rule**:
    *   Public mutable setters are forbidden in domain entities.
    *   Invariants must be enforced in constructors/factories/domain methods.
    *   If behavior is missing from entities, move logic to domain methods or domain services, never to controllers.
*   **Aggregates**: Define clear consistency boundaries.
    *   Example: An `Order` might be an Aggregate Root that ensures line items are valid.
    *   Repositories must be defined per Aggregate Root, not per table.
    *   Cross-aggregate references should be by ID, not direct object graph coupling.
*   **Domain Services**:
    *   Mandatory when business rules span multiple aggregates or cannot be owned by one entity/value object.
    *   Must be pure domain logic and framework-agnostic.
*   **DTO Boundaries**:
    *   DTOs are mandatory at API/action boundaries.
    *   DTOs must never replace domain entities/value objects inside core business logic.
*   **Value Objects**: Use immutable objects for attributes like `Email`, `Price`, or `ClaimToken` to encapsulate validation rules.
*   **Inventory Cost and Profit Rule**:
    *   Inbound stock operations must include unit cost.
    *   Profit calculations must use persisted inventory cost basis, never ad-hoc UI values.

### Principles
*   **SOLID**: Strictly adhere to SOLID principles.
    *   *Single Responsibility*: Each class/module has one job.
    *   *Open/Closed*: Open for extension, closed for modification.
    *   *Liskov Substitution*: Subtypes must be substitutable for base types.
    *   *Interface Segregation*: Small, specific interfaces are better than one general-purpose interface.
    *   *Dependency Inversion*: Depend on abstractions, not concretions.
*   **DRY (Don't Repeat Yourself)**: Extract common logic but be careful of premature abstraction.
*   **KISS (Keep It Simple, Stupid)**: Avoid over-engineering.

### Iterative Development Strategy
*   **Small Batches**: Never attempt to build a full feature in one go. Break it down into atomic, reviewable units.
*   **Vertical Slices**: Deliver a complete slice (DB -> API -> UI) for a *tiny* part of the feature, rather than building all DB, then all API, then all UI.
*   **UI Checkpoints**: For frontend tasks, deliver visual checkpoints (e.g., "Static Layout" -> "Mocked Data Integration" -> "Real API Integration") to allow early feedback.

### Documentation & Code Quality
*   **Function Signatures**: All exported functions must have explicit type definitions for arguments and return values.
*   **Critical Comments**:
    *   Do NOT comment *what* the code does (the code should speak for itself).
    *   DO comment *why* a specific decision was made, especially for:
        *   Complex regex or math logic.
        *   Workarounds for known bugs/limitations.
        *   Critical security logic (e.g., encryption steps).
        *   Potential "Code Smells" that are intentional (e.g., performance optimizations).

### Design Patterns

#### Architectural Patterns (Core to Hexagonal/Clean)
These patterns are **fundamental** to the architecture and should be used consistently:
*   **Dependency Injection (DI)**: Essential to invert dependencies. The Core defines interfaces, and Infra implementations are injected at runtime.
*   **Repository Pattern**: To decouple the Domain from the Data Access Layer.
*   **Adapter Pattern**: The core mechanism of Hexagonal Architecture. "Primary Adapters" (Controllers) drive the application, and "Secondary Adapters" (DB, Email) are driven by the application.
*   **DTO (Data Transfer Object)**: Use DTOs to pass data between the Presentation and Application layers to avoid leaking Domain Entities to the UI.
*   **Use Case (Command Pattern)**: Each business action (e.g., `ClaimKey`) is a separate class/function with a single responsibility.
*   **Domain Service Pattern**: Required for multi-aggregate business policies (e.g., stock cost valuation/profit policy, debt allocation rules).

#### Tactical Patterns (Contextual)
Apply these only when they solve a specific problem in the current feature:
*   **Mandatory Analysis Step**: Before implementing ANY new feature or complex logic, the developer/agent MUST pause and analyze: *"What Design Pattern fits this problem to improve scalability and maintainability?"*
    *   *Do not rush to code.* First, justify the choice (or rejection) of a pattern.
*   **Examples**:
    *   *Strategy*: Useful for interchangeable algorithms (e.g., different pricing strategies or payment providers).
    *   *Factory/Builder*: For creating complex domain entities with invariants.
    *   *Result Pattern*: Recommended for explicit error handling in the Domain.

### Architecture Modeling Artifacts (Mandatory)
Before implementing medium/large features, create and review architecture diagrams in `workflow-manager/` to validate the solution at high level.
*   **Required diagrams (Mermaid preferred)**:
    *   Class Diagram: domain model and aggregate boundaries.
    *   Sequence Diagram: critical end-to-end flows (checkout, stock movement, debt payment).
    *   Activity/Flow Diagram: user flow and decision branches.
    *   State Diagram (when applicable): lifecycle-heavy entities (e.g., Order/Debt status).
*   **Documentation Rule**:
    *   Link diagrams from PRD/Feature docs and from related GitHub Issues/PRs.
    *   Update diagrams whenever core flow/domain decisions change.

### API Design Standards (Scalable by Default)
All new APIs must follow these rules:
*   **Contract-first**: Define/update OpenAPI schema before implementation.
*   **Versioning**: Public endpoints must be versioned (`/api/v1/...`).
*   **Idempotency for critical writes**: Support idempotency keys for retry-prone operations (checkout, stock ingress, debt payment).
*   **Consistent errors**: Use a normalized error envelope (recommended: RFC 7807/problem+json style).
*   **Pagination/filtering/sorting**: Mandatory for list endpoints to avoid unbounded queries.
*   **Backward compatibility**: Additive changes by default; breaking changes require new API version.
*   **Observability**: Emit request/correlation IDs and structured logs in all API handlers.
*   **Security baseline**: AuthN/AuthZ checks, input validation (Zod DTO), and rate limiting where abuse risk exists.

### Testing Strategy
*   **E2E Strategy (Playwright)**:
    *   **Stage 1 - UI-first MVP (Mocked Backend)**: For early UX validation, E2E may run against a mocked backend (mock adapters or mock HTTP server) without a fully functional backend.
    *   **Mocking Rule**: Prefer mocking at adapter/repository boundaries to preserve use-case orchestration and stable API contracts.
    *   **Contract Safety**: Every mocked endpoint must have schema/contract validation tests to prevent divergence from real implementation.
    *   **Stage 2 - Pre-release Validation (Real Backend)**: Before any production release, critical flows must run against a real local backend with ephemeral Supabase.
    *   **Environment**: Use a **local ephemeral Supabase instance** (via Docker/CLI) for E2E tests to ensure isolation and speed.
    *   **Data Management**: Database should be reset/seeded before each test suite to ensure deterministic results.
    *   **Scope**: Critical POS flows (sale checkout, stock movement, product onboarding) must be covered by E2E tests against a real database instance (to verify consistency and concurrency logic).
    *   **External Services**: Mock 3rd party APIs (Payments, Email) at the network layer to avoid flakiness.
*   **Unit Tests**: Mandatory for the **Domain** and **Application** layers.
    *   Mock all dependencies (Repositories, Services).
    *   Focus on business rules and edge cases.
*   **Integration Tests**: Mandatory for the **Infrastructure** layer.
    *   Test database queries and external API calls against real/containerized services.

## 6. Frontend Architecture (React/Next.js)

### Component Patterns
*   **Presentational vs. Container Components**:
    *   **Dumb Components (UI)**: Purely presentational. Receive data via props. No dependency on Use Cases or API calls. Located in `presentation/components`.
    *   **Smart Components (Containers/Pages)**: Connect to the Application layer. They fetch data, call Use Cases, and pass data down to Dumb Components.
*   **Logic Separation**:
    *   **Custom Hooks**: Encapsulate UI logic and state.
    *   **Use Case Reusability**: React components/hooks should call `Use Cases` (via Server Actions or APIs), never implement business logic directly.

### State Management
*   Prefer server state (React Server Components) where possible.
*   Use URL state for filters/pagination.
*   Keep client-side global state to a minimum (only for UI state like themes or modals).

## 7. Project Workflow & Documentation

The project uses a structured **Workflow Manager** to track requirements, features, and tasks. This is **MANDATORY** for all development work.

*   **Location**: `workflow-manager/`
*   **Source of Truth**: The `workflow-manager/docs/_system/templates/README.md` file contains the detailed guidelines.

### Workflow Guidelines
1.  **Requirement Implementation Tracking**:
    *   The `workflow-manager/` directory is the designated central hub for managing and tracking the implementation of project requirements.
    *   All feature development and requirement implementation must be planned, documented, and tracked using the templates within this structure.
2.  **GitHub Synchronization**:
    *   It is mandatory to keep this documentation synchronized with the GitHub repository.
    *   All feature plans, task breakdowns, and status updates should be committed and pushed to ensure a single source of truth and version control.
3.  **Living Documentation**:
    *   **Mandatory File**: Every feature MUST have a corresponding Markdown file (e.g., `docs/features/FEATURE-XXX-name.md`).
    *   **Content**: Detailed Use Case explanation and **Code Examples** (API calls, signatures).
    *   **Maintenance**: Update this document whenever code logic changes.
4.  **Naming Convention**:
    *   Use the `[ENTITY-XXX]` format consistent with the workflow manager (e.g., `INVENTORY-001-bulk-upload.md`).
5.  **Documentation Freshness & Sync (Mandatory)**:
    *   Any meaningful change in scope, architecture, feature behavior, task status, or testing strategy MUST update the related `workflow-manager/docs/` markdowns in the same work batch.
    *   Keep `workflow-manager/docs/WORKFLOW_INDEX.md` updated when adding/renaming core planning/feature/task artifacts so mobile GitHub reading stays navigable.
    *   After docs updates, sync issues using `workflow-manager/docs/scripts/sync-github.sh` (recommended: `--sync-execution` or `--sync-all`).
    *   Use `.env.github` for GitHub sync environment variables; never hardcode or commit secrets outside ignored env files.

### Rules for Agents & Developers
1.  **Check Workflow First**: Before starting any task, check `workflow-manager/` for existing feature plans or tasks.
2.  **Use Templates**: All new features must be documented using the templates in `workflow-manager/docs/_system/templates/`.
