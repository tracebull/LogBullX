# LogBullX - Project Context

## Overview

Self-hosted log collection and viewing system. Alternative to ELK/Loki. Single Docker container. Apache 2.0 licensed.

## Tech Stack

- **Backend**: Go 1.24, Gin, GORM, PostgreSQL 17, OpenSearch 2.12, Valkey 8.0 (Redis fork)
- **Frontend**: React 19, TypeScript, Ant Design 5, Tailwind CSS 4, Vite, React Router 7
- **Infra**: Multi-stage Dockerfile (all-in-one), GitHub Actions CI/CD

## Local Environment

- **Go**: Binary at `C:\Users\arunp\go\bin\go.exe` (add `C:\Users\arunp\go\bin` to PATH), GOPATH at `C:\Users\arunp\go`
- **Node**: System-installed
- **Platform**: Windows (PowerShell 5.1)

## Project Structure

```
LogBullX/
├── backend/
│   ├── cmd/main.go              # Entry point
│   ├── internal/
│   │   ├── config/              # Environment config (cleanenv + godotenv)
│   │   ├── features/            # Feature modules (see below)
│   │   ├── storage/             # DB connection (GORM)
│   │   ├── cache/               # Valkey cache
│   │   ├── downdetect/          # Service down detection
│   │   └── util/                # Shared utilities
│   ├── migrations/              # Goose SQL migrations
│   ├── swagger/                 # Auto-generated Swagger docs
│   └── ui/build/                # Embedded frontend (production)
├── frontend/
│   └── src/
│       ├── entity/              # API layer + models (FSD)
│       ├── features/            # Feature components (FSD)
│       ├── widgets/             # Composite components (FSD)
│       ├── shared/              # Shared utilities, hooks, API helper
│       ├── pages/               # Route-level page components
│       └── constants.ts         # Runtime config, OAuth settings
├── Dockerfile                   # Multi-stage build (frontend + backend + services)
└── .github/workflows/           # CI/CD pipeline
```

## Backend Architecture

### Feature Module Structure

Each feature under `internal/features/` follows:

```
feature/
├── controllers/     # HTTP handlers (Gin)
├── services/        # Business logic
├── repositories/    # Database queries (GORM)
├── models/          # Data models
├── dto/             # Request/response DTOs
├── enums/           # Enums
├── interfaces/      # Interfaces
├── middleware/      # Middleware
├── testing/         # Test utilities
└── di.go            # Dependency injection (getter functions)
```

Current features: `users`, `projects`, `logs` (core/receiving/querying/cleanup), `api_keys`, `audit_logs`, `system`, `disk`

### Key Patterns

- **DI**: Package-level instances with `GetXxxService()` / `GetXxxController()` getters (implicit field style, see `.cursor/rules/di-rule.mdc`)
- **Routes**: Public routes in `RegisterRoutes()`, protected in `RegisterProtectedRoutes()`
- **Auth**: JWT (golang-jwt/jwt v4), middleware injects user into Gin context
- **Migrations**: Goose (`goose up`), SQL files in `migrations/`
- **Swagger**: Auto-generated via `swag init`, all endpoints documented

### Backend Commands (from `backend/` dir)

```bash
make run              # Run server
make test             # Run tests
make lint             # golangci-lint fmt && golangci-lint run
make swagger          # Generate swagger docs
make migration-create name=NAME
make migration-up
make migration-down
```

### Environment

Requires `.env` file (see `.env.development.example`). Key vars:

- `DATABASE_DSN`, `ENV_MODE`, `BACKEND_ROOT_PATH`
- `VALKEY_HOST`, `VALKEY_PORT`, `OPENSEARCH_URL`, `OPENSEARCH_API_PORT`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (optional OAuth)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (optional OAuth)

## Frontend Architecture

### Feature-Sliced Design (FSD)

- `entity/` — API calls + TypeScript models (per domain: users, projects, query, audit-logs, api-keys, disk)
- `features/` — UI components per feature (projects, query, users, settings)
- `widgets/` — Composite screens (main screen, project selection)
- `shared/` — Cross-cutting: API helper, auth token, form validation, toast, time utils

### Key Patterns

- **API layer**: `apiHelper` with retry (10 tries, 3s fixed interval), auth via `accessTokenHelper` (localStorage)
- **Auth flow**: JWT in localStorage, `userApi.addAuthListener()` for reactivity
- **UI framework**: Ant Design components, Tailwind for layout/spacing
- **Color theme**: Emerald-600 (#009966) primary
- **Routing**: Simple — `/` (auth or main screen), `/auth/callback` (OAuth)

### Frontend Commands (from `frontend/` dir)

```bash
npm run dev          # Dev server (Vite)
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
npm run format       # Prettier
```

## Database Schema

- **PostgreSQL**: Users, projects, memberships, API keys, audit logs, user plans, settings
- **OpenSearch**: Log items (per-project indices)
- **Valkey**: Caching, rate limiting

## Conventions

### Code Style Rules (`.cursor/rules/`)

- Public methods before private in Go files
- No obvious comments — code should be self-documenting
- Swagger annotations mandatory on all HTTP endpoints
- Time: always `time.Now().UTC()`, never `time.Now()`
- Migrations: UUID primary keys with `gen_random_uuid()`, `TIMESTAMPTZ` for timestamps
- DI: implicit field style (no named fields in struct literals for DI)

### Test Naming (Go)

`Test_WhatWeDo_WhatWeExpect` or `Test_WhatWeDo_WhichConditions_WhatWeExpect`

Tests go through HTTP endpoints (controller-level), not isolated unit tests. Test utilities in `testing.go` files.

### Commit Conventions

- `FEATURE (area): description` — minor version bump
- `FIX (area): description` — patch version bump
- `REFACTOR (area): description` — patch version bump
- `BREAKING CHANGE` — major version bump

### Pre-commit Hooks

Runs on Windows (PowerShell):
- Frontend: Prettier + ESLint
- Backend: golangci-lint fmt + golangci-lint run

## Permissions Model

### System Roles

- `ADMIN` — full access (LogBull Settings, Users management)
- `MEMBER` — restricted by global settings

### Project Roles

- `OWNER` — full project control, can transfer ownership
- `PROJECT_ADMIN` — can manage members, settings, API keys
- `PROJECT_MEMBER` — read-only access to project

### Global Settings

- `isAllowExternalRegistrations` — controls signup page visibility
- `isAllowMemberInvitations` — controls invite UI for members
- `isMemberAllowedToCreateProjects` — controls create project UI for members

### Route Visibility

| Tab | Visibility |
|-----|-----------|
| Search | Everyone |
| Project Settings | Project members (manage: OWNER/ADMIN) |
| Members | Project members (manage: OWNER/ADMIN) |
| API Keys | Project members (manage: OWNER/ADMIN) |
| Profile | Everyone |
| LogBull Settings | System ADMIN only |
| Users | System ADMIN only |
