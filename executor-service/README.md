# Executor Service

Docker-based sandboxed code execution engine. Evaluates submitted code in isolated containers with strict resource limits and zero RCE attack surface.

## Security Model

- User code written via Docker `putArchive` (tar format) — no shell interpolation
- Test inputs piped exclusively through stdin
- Container constraints: 256MB memory, 1 CPU, 64 PID limit, no network, readonly rootfs
- Automatic container cleanup via kill + remove in `finally` blocks

## Features

- **Unified CodeRunner** for all languages (Python, Java, C++)
- **Single container per submission** (not per test case)
- **BullMQ** worker with retry + DLQ
- **BullBoard** dashboard at `/ui`

## Running

```bash
npm install
npm run dev
```
