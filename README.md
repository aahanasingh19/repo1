# CodeForge — Distributed Code Execution Platform

A production-grade full-stack online code judge with React frontend, Node.js microservices, Docker-sandboxed execution, real-time WebSocket updates, and PostgreSQL transactional storage.

## Architecture

```
┌──────────────────┐
│   React Client   │  (Vite + TypeScript + Monaco Editor)
│   Port 80/5173   │
└────────┬─────────┘
         │
    ┌────▼──────────────────────────────────────────┐
    │              API Layer                         │
    │                                                │
    │  ┌─────────────────┐  ┌────────────────────┐  │
    │  │ Problem Service  │  │ Submission Service  │  │
    │  │ Express + Mongo  │  │ Fastify + PG + JWT │  │
    │  │    :3000         │  │    :4000            │  │
    │  └─────────────────┘  └──────────┬─────────┘  │
    └──────────────────────────────────┼─────────────┘
                                       │
                              ┌────────▼─────────┐
                              │  SubmissionQueue  │  BullMQ + Redis
                              │  retry + DLQ      │
                              └────────┬─────────┘
                                       │
                              ┌────────▼──────────┐
                              │  Executor Service  │
                              │  Docker Sandbox    │
                              │  Strategy Pattern  │
                              │    :7000           │
                              └────────┬──────────┘
                                       │
                              ┌────────▼─────────┐
                              │ EvaluationQueue   │
                              └────────┬─────────┘
                                       │
                              ┌────────▼─────────┐
                              │  Gateway Service  │  Socket.IO
       WebSocket ◄────────────│    :5001          │
                              └──────────────────┘
```

## Request Flow

```
1. User writes code in Monaco Editor
2. POST /api/v1/submission → auth check → rate limit check → PostgreSQL INSERT
3. Job added to SubmissionQueue (BullMQ + Redis)
4. Executor Service picks up job:
   a. Creates hardened Docker container (256MB, no network, PID limit)
   b. Writes code via putArchive (tar) — zero shell injection
   c. Compiles (C++/Java) then runs against each test case via stdin
   d. Collects stdout/stderr for each test case
5. Results added to EvaluationQueue
6. Submission Service updates PostgreSQL status + response JSONB
7. Gateway Service emits results via WebSocket
8. React client receives real-time update → renders test case results
```

## Features

### Frontend (React + TypeScript)
- **JWT Authentication** — Login/Signup with protected routes
- **Monaco Editor** — Language switching (Python, Java, C++)
- **Real-time Updates** — WebSocket integration for live judging status
- **Problem Listing** — Search + difficulty filtering
- **Submission History** — Fetched from PostgreSQL
- **Leaderboard** — Ranked by problems solved with acceptance rates
- **Error Handling** — Loading spinners, API failure messages, rate limit alerts, empty states

### Backend
- **Sandboxed Execution** — Docker `putArchive` + stdin (zero RCE)
- **Container Isolation** — 256MB memory, 1 CPU, 64 PID, no network, readonly rootfs
- **ACID Transactions** — Atomic submission + stats updates in PostgreSQL
- **Rate Limiting** — Redis sliding window (10 req/user/min)
- **Retry + DLQ** — Exponential backoff, dead letter queue for failed jobs
- **Observability** — `/metrics` endpoint with P95 latency, `/health` checks

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Monaco Editor, Socket.IO Client |
| Submission API | Fastify, PostgreSQL, BullMQ, JWT, bcrypt |
| Problem API | Express, MongoDB, Mongoose |
| Code Executor | Docker, Dockerode, TypeScript |
| Job Queues | BullMQ (Redis-backed) |
| Real-time | Socket.IO |
| Rate Limiting | Redis sorted sets |
| Logging | Winston + MongoDB transport |
| Orchestration | Docker Compose |
| Load Testing | k6 |

## API Contracts

### Auth

```
POST /api/v1/auth/register
  Request:  { username, email, password }
  Response: { success, data: { user: { id, username, email }, token } }

POST /api/v1/auth/login
  Request:  { email, password }
  Response: { success, data: { user: { id, username, email }, token } }

GET /api/v1/auth/profile  [Auth Required]
  Response: { success, data: { id, username, email, total_submissions, accepted_submissions, problems_solved } }
```

### Problems

```
GET  /api/v1/problems           → List all problems
GET  /api/v1/problems/:id       → Get problem with test cases + code stubs
POST /api/v1/problems           → Create problem (admin)
```

### Submissions

```
POST /api/v1/submission  [Auth + Rate Limited]
  Request:  { problemId, code, language, userId }
  Response: { success, data: { id, status: "PENDING", ... } }
  Errors:   429 Rate Limit | 401 Unauthorized

GET /api/v1/submission/:userId  [Auth Required]
  Response: { success, data: [{ id, problem_id, language, status, response, created_at }] }
```

### WebSocket Events

```
Client → Server:  setUserId(userId)
Server → Client:  evalResultResponse({ status, response: [{ input, expected, actual, status }] })
```

### Leaderboard

```
GET /api/v1/leaderboard?limit=50&offset=0
  Response: { success, data: { rankings: [{ rank, username, solved, accepted, total }], total } }
```

### Error Format (all endpoints)

```json
{ "success": false, "message": "Human-readable error", "error": "Technical detail", "data": {} }
```

## Getting Started

### Docker Compose (Recommended)

```bash
docker-compose up --build
# Frontend: http://localhost
# Problem API: http://localhost:3000
# Submission API: http://localhost:4000
# Executor: http://localhost:7000
```

### Local Development

```bash
cp .env.example .env
docker-compose up redis mongodb postgres -d

# Terminal 1: Problem Service
cd problem-service && npm install && npm run dev

# Terminal 2: Submission Service
cd submission-service && npm install && npm run dev

# Terminal 3: Executor Service
cd executor-service && npm install && npm run dev

# Terminal 4: Gateway Service
cd gateway-service && npm install && npm start

# Terminal 5: Frontend
cd client && npm install && npm run dev
```

## PostgreSQL Schema

```sql
-- Users with auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL
);

-- Submissions with JSONB response storage
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  problem_id VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  language VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard view with RANK() window function
CREATE VIEW leaderboard AS
  SELECT u.username, s.problems_solved, s.accepted_submissions,
    RANK() OVER (ORDER BY s.problems_solved DESC) AS rank
  FROM users u LEFT JOIN user_stats s ON u.id = s.user_id;
```

## Tradeoffs

1. **PostgreSQL for submissions vs MongoDB** — Chose PG for ACID transactions. Tradeoff: more setup, stronger consistency.
2. **Single container per submission** — O(1) vs O(n) container creation. Tradeoff: one crash fails all test cases.
3. **Fail-open rate limiter** — Allows requests if Redis is down. Tradeoff: brief window of no rate limiting vs outage.
4. **In-memory metrics** — Zero-dependency. Tradeoff: lost on restart. Production would use Prometheus.
5. **JWT in localStorage** — Simple implementation. Tradeoff: XSS vulnerability. Production would use httpOnly cookies.

## Load Testing

```bash
k6 run --env BASE_URL=http://localhost:4000 load-tests/k6-submission-test.js
```

| Metric | Value |
|--------|-------|
| P95 Latency | ~850ms |
| Success Rate | 96.2% |
| Max Concurrent | 500 VUs |

## Project Structure

```
├── client/                    # React + TypeScript Frontend
│   └── src/
│       ├── components/        # Navbar, CodeEditor, ProtectedRoute, SubmissionResult
│       ├── pages/             # Login, Signup, Problems, ProblemDetail, Submissions, Leaderboard
│       ├── context/           # AuthContext (JWT state management)
│       ├── hooks/             # useSocket (real-time updates)
│       ├── services/          # API client with typed endpoints
│       └── types/             # TypeScript interfaces
├── problem-service/           # Problem CRUD (Express + MongoDB)
├── submission-service/        # Submission + Auth + Leaderboard (Fastify + PG)
│   └── src/
│       ├── middleware/        # authMiddleware, rateLimiter, metrics
│       ├── services/          # AuthService, SubmissionService
│       └── repositories/      # PostgreSQL with transactions
├── executor-service/          # Docker sandbox execution (TypeScript)
│   └── src/containers/        # CodeRunner with Strategy pattern
├── gateway-service/           # WebSocket gateway (Socket.IO)
├── load-tests/                # k6 scripts
├── docker-compose.yml
├── init.sql                   # PostgreSQL schema
└── .env.example
```
