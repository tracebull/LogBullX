# TraceBull — Frontend

React 19 + TypeScript + Vite frontend for [TraceBull](../README.md).

## Development

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173
```

The dev server proxies API requests to the backend at `localhost:4005`. Start the backend first (see `backend/` or root `docker-compose.yml`).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build → `dist/` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (formats in-place) |
