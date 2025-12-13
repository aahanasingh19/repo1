# Submission Service

Handles code submission lifecycle: validation, queue-based async processing, PostgreSQL storage with atomic transactions, and real-time status updates via WebSocket gateway.

## Features

- **Rate-limited** submission API (sliding window, 10 req/user/min)
- **PostgreSQL** storage with ACID transactions
- **BullMQ** queue integration with retry + exponential backoff
- **Metrics** endpoint (`/metrics`) for observability
- **Health check** endpoint (`/health`)

## Environment Variables

See `.env.example` in the project root.

## Running

```bash
npm install
npm run dev
```
