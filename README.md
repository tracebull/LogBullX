<div align="center">
  <img src="frontend/public/logo.svg" alt="TraceBull Logo" width="100" style="margin-bottom: 12px;" />

  # TraceBull

  **Log collection, search and tracing for developers**

  Self-hosted · Modern UI · Multi-project · Role-based access

  [![CI](https://github.com/tracebull/tracebull/actions/workflows/ci-release.yml/badge.svg)](https://github.com/tracebull/tracebull/actions/workflows/ci-release.yml)
  [![Docker Image](https://ghcr-badge.egpl.dev/tracebull/tracebull/latest_tag?trim=major&label=ghcr.io)](https://github.com/tracebull/tracebull/pkgs/container/tracebull)
  [![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
  [![Self Hosted](https://img.shields.io/badge/self--hosted-yes-brightgreen)](#)
</div>

---

## Features

- **Easy Deployment** — Single `docker compose up -d`, everything included
- **Powerful Log Search** — Filter by fields, operators, and time ranges with a visual query builder
- **Multi-Project** — Isolated log spaces per project with separate API keys
- **Multi-User** — Role-based access control (Admin / Member) with project-level permissions
- **Multi-Language** — Send logs from Python, Go, Java, Node.js and more via HTTP API
- **Audit Logging** — Complete trail of all user and admin actions
- **API Keys & Security** — Per-project keys with optional domain and IP restrictions
- **OAuth Support** — GitHub and Google login (optional, cloud mode)
- **Modern UI** — React 19 + shadcn/ui with light/dark theme, built with Tailwind CSS 4

---

## Quick Start

### Option 1 — Docker image (recommended)

Pull the pre-built image from GitHub Container Registry and deploy with `docker compose`:

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/tracebull/tracebull/main/docker-compose.yml

# (Optional) customise port, passwords, OAuth keys
cp .env.example .env

# Start
docker compose up -d
```

The `docker-compose.yml` uses `ghcr.io/tracebull/tracebull:latest` by default. To pin a specific version replace `latest` with a tag like `v1.2.0`.

Access the app at **http://localhost:4005**.  
On first load you'll be prompted to set the admin password.

### Option 2 — Build from source

```bash
git clone https://github.com/tracebull/tracebull.git
cd tracebull

cp .env.example .env          # customise if needed

docker compose up -d --build
```

---

## Sending Logs

Once the app is running, open **Search → How to send logs from code?** for ready-to-copy snippets in multiple languages.

The endpoint is:

```
POST http://localhost:4005/api/v1/logs/ingest/{projectId}
Content-Type: application/json
X-API-Key: <your-api-key>          # only if the project requires it

{
  "message": "User signed in",
  "level": "INFO",
  "fields": { "userId": "abc123", "ip": "1.2.3.4" }
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, shadcn/ui, Tailwind CSS 4, Vite |
| Backend | Go 1.24, Gin, GORM |
| Database | PostgreSQL 17 |
| Log Storage | VictoriaLogs |
| Cache | Valkey 8.0 (Redis-compatible) |
| Infra | Docker, multi-stage build, linux/amd64 + linux/arm64 |

---

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
│   ├── migrations/              # SQL migrations (Goose)
│   └── swagger/                 # Auto-generated Swagger docs
├── frontend/
│   └── src/
│       ├── entity/              # API layer + models
│       ├── features/            # Feature components
│       ├── widgets/             # Composite components
│       ├── shared/              # Shared utilities and hooks
│       ├── components/ui/       # shadcn/ui components
│       └── pages/               # Route-level pages
├── Dockerfile                   # App-only multi-stage build
├── Dockerfile.all-in-one        # Bundles PostgreSQL + VictoriaLogs + Valkey
└── docker-compose.yml           # Production compose (external services)
```

---

## Development

### Backend

```bash
cd backend
make run          # Run server (hot-reload with air)
make test         # Run tests
make lint         # golangci-lint
make swagger      # Regenerate Swagger docs
```

### Frontend

```bash
cd frontend
npm run dev       # Vite dev server with HMR
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm run format    # Prettier
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRACEBULL_PORT` | `4005` | Port the app listens on |
| `POSTGRES_DB` | `tracebull` | PostgreSQL database name |
| `POSTGRES_USER` | `postgres` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `tracebull` | PostgreSQL password — **change in production** |
| `VICTORIALOGS_URL` | `http://victorialogs` | VictoriaLogs base URL |
| `VICTORIALOGS_PORT` | `9428` | VictoriaLogs port |
| `VALKEY_HOST` | `valkey` | Valkey hostname |
| `VALKEY_PORT` | `6379` | Valkey port |
| `IS_CLOUD` | `false` | Enables OAuth login |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth app client secret |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |

---

## Credits

TraceBull is built on top of [LogBull](https://github.com/logbull/logbull), created by [Rostislav Dugin](https://github.com/rostislav-dugin).

A huge thank you to Rostislav for building the original foundation — the core architecture, log ingestion pipeline, project management system, and multi-user model that TraceBull is built upon all originate from his work. Without LogBull, TraceBull would not exist.

If you find TraceBull useful, consider giving the [original repo](https://github.com/logbull/logbull) a star too.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
