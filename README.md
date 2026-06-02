<div align="center">
  <img src="assets/logo.svg" style="margin-bottom: 20px;" alt="TraceBull Logo" width="250"/>

  <h3>Log collection, viewing and tracing system for developers</h3>
  <p>Self-hosted, modern UI, multi-backend log storage. Fork of LogBull with VictoriaLogs support and shadcn/ui interface.</p>

  [![Apache 2.0 License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-lightgrey)](#)
  [![Self Hosted](https://img.shields.io/badge/self--hosted-yes-brightgreen)](#)
  [![Open Source](https://img.shields.io/badge/open%20source-Apache%202.0-blue)](#)
</div>

## Features

- **Easy Deployment** — Single Docker container with `docker compose up -d`
- **Multi-Backend Storage** — VictoriaLogs for high-throughput log ingestion
- **Modern UI** — shadcn/ui with light/dark theme toggle, built with React 19 + Tailwind CSS 4
- **Multi-Language Log Collection** — Send logs from Python, Go, Java, Node.js, and more via HTTP API
- **Project Management** — Isolated log spaces per project with separate API keys
- **Multi-User Support** — Role-based access control (Admin, Member) with project-level permissions
- **Audit Logging** — Track all user actions with complete audit trail
- **Powerful Log Querying** — Search by text, filter by fields, query within time ranges
- **API Keys & Security** — Per-project API keys with rate limiting and domain restrictions
- **OAuth Support** — GitHub and Google login (optional)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/LogBullX/LogBullX.git
cd LogBullX

# Copy environment config
cp .env.example .env

# Start all services
docker compose up -d
```

Access the app at `http://localhost:4005`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, shadcn/ui, Tailwind CSS 4, Vite |
| Backend | Go 1.24, Gin, GORM |
| Database | PostgreSQL 17 |
| Log Storage | VictoriaLogs |
| Cache | Valkey 8.0 (Redis fork) |
| Infra | Docker, multi-stage build |

## Architecture

```
├── backend/
│   ├── cmd/main.go              # Entry point
│   ├── internal/
│   │   ├── config/              # Environment config
│   │   ├── features/            # Feature modules (users, projects, logs, etc.)
│   │   ├── storage/             # DB connection (GORM)
│   │   ├── cache/               # Valkey cache
│   │   └── util/                # Shared utilities
│   ├── migrations/              # SQL migrations
│   └── swagger/                 # Auto-generated Swagger docs
├── frontend/
│   └── src/
│       ├── entity/              # API layer + models
│       ├── features/            # Feature components
│       ├── widgets/             # Composite components
│       ├── shared/              # Shared utilities and hooks
│       ├── components/ui/       # shadcn/ui components
│       └── pages/               # Route-level pages
├── Dockerfile                   # Multi-stage build
└── docker-compose.yml           # PostgreSQL, Valkey, VictoriaLogs, TraceBull
```

## Development

### Backend (from `backend/` dir)

```bash
make run              # Run server
make test             # Run tests
make lint             # Lint
make swagger          # Generate swagger docs
```

### Frontend (from `frontend/` dir)

```bash
npm run dev          # Dev server (Vite)
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
npm run format       # Prettier
```

## Environment Variables

Key configuration via `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `TRACEBULL_PORT` | `4005` | App port |
| `POSTGRES_DB` | `tracebull` | PostgreSQL database name |
| `POSTGRES_USER` | `postgres` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `tracebull` | PostgreSQL password |
| `VICTORIALOGS_URL` | `http://victorialogs` | VictoriaLogs URL |
| `VICTORIALOGS_PORT` | `9428` | VictoriaLogs port |
| `IS_CLOUD` | `false` | Cloud mode (enables OAuth) |

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

<sub>TraceBull is a fork of [LogBull](https://github.com/logbull/logbull) — a simple log collection and viewing system by [Rostislav Dugin](https://github.com/rostislav-dugin).</sub>
