# Core-Hogar — Core-API v1

First functional slice of the centralized backend for the Centro-Hogar suite.
Implements the v1 blueprint defined in [`../whoami.md`](../whoami.md).

## What it does (v1)

- Validates JWTs already emitted by Centro-Hogar (it does **not** issue tokens).
- Exposes the authenticated user's basic profile.
- Exposes the static apps registry.
- Ingests cross-app notifications and serves them per user.


## Endpoints

| Method | Path                       | Auth | Purpose                                   |
|--------|----------------------------|------|-------------------------------------------|
| GET    | `/health`                  | —    | Liveness check.                           |
| GET    | `/auth/validate`           | JWT  | `{valid, user_id}`.                       |
| GET    | `/profile`                 | JWT  | `{id, email, name}` of the token's user.  |
| GET    | `/apps`                    | JWT  | Static registry (enabled apps only).      |
| POST   | `/events/notification`     | —    | `{user_id, source_app, message}` → store. |
| GET    | `/notifications`           | JWT  | Latest 50 for the token's user.           |

## Run locally (without Docker)

```bash
cp .env.example .env   # adjust DB_HOST, etc.
npm install
npm start              # listens on :6100
```

## Run with Docker (suite-integrated)

The service is wired into the master compose at the repo root:

```bash
cd ..
docker compose up -d core-hogar
```

It joins `homelearn-net` so it can reach the shared Postgres (`database`) and
the JWT_SECRET is shared via the `x-shared-env` anchor.

## Smoke test

After `docker compose up`:

```bash
# 1. Login on Centro-Hogar to obtain a JWT (or reuse one from localStorage)
TOKEN="<your jwt here>"

# 2. Validate
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6100/auth/validate

# 3. Profile
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6100/profile

# 4. Apps
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6100/apps

# 5. Publish a notification (simulating Boslei)
curl -s -X POST http://localhost:6100/events/notification \
  -H "Content-Type: application/json" \
  -d '{"user_id":"1","source_app":"boslei","message":"Sprint 3 cerrado"}'

# 6. Read notifications
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6100/notifications
```

Or run the bundled end-to-end script:

```bash
node scripts/test-e2e.js
```

## Project layout

```
Core-Hogar/
├── src/
│   ├── app.js                      # Express bootstrap
│   ├── config/
│   │   ├── apps.js                 # static apps registry + allow-list
│   │   ├── db.js                   # pg pool
│   │   └── env.js                  # env → config object
│   ├── controllers/                # one per domain
│   ├── middleware/
│   │   └── authMiddleware.js       # JWT verification
│   ├── migrations/
│   │   └── 00_notifications.sql    # idempotent schema
│   ├── routes/
│   │   └── index.js                # HTTP wiring
│   └── services/
│       └── migrations.js           # boot-time migration runner
├── scripts/
│   └── test-e2e.js                 # end-to-end multi-app test
├── Dockerfile
├── package.json
├── .env.example
├── whoami.md                       # YAPL — identity
├── changelog.md                    # YAPL — short-term memory
└── to-do.md                        # YAPL — active task
```

## Constraints (v1, by design)

- No distributed messaging (RabbitMQ / Kafka). Webhook ingestion only.
- No Kubernetes. Docker Compose is enough.
- No JWT issuance. Centro-Hogar remains the issuer.
- No SSE / WebSocket. Frontend polls `GET /notifications`.
- No HMAC / mTLS on event ingestion. Allow-list of `source_app` is the gate.
