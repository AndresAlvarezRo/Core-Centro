# Changelog — Core-Hogar

> **Memoria de corto plazo (nivel subproyecto).** Máximo **6** entradas activas. Cada entrada nace como `pending`. Al validarse, se promueve a `whoami.md` y se elimina de aquí. Hereda reglas del raíz.

---

## Reglas de entrada

Cada entrada contiene:

* **Context** — situación / disparador.
* **Action** — qué se hizo.
* **Result** — qué quedó.
* **Status** — `pending` | `validated`.

### Reglas de promoción

* `pending` permanece acá.
* `validated` migra a `whoami.md` y se elimina de este archivo.
* `whoami.md` no se edita sin pasar por acá.

---

## Active Entries (MAX 6)

### Entry 1 — Creación del servicio Core-Hogar (Core-API v1)

* **Context:**
  * El raíz tenía como objetivo activo (Entry 3 raíz) implementar la Fase 1 del Core-API v1 conforme al blueprint consolidado en `../whoami.md → Core-API Blueprint v1`.
  * El frontend del portal tenía un stub puro en `notificationService.ts` (TODOs explícitos para SSE/WebSocket) sin backend real detrás.
  * Decisión adoptada en esta iteración: crear un **microservicio nuevo** (`Core-Hogar/`) en lugar de mutar el backend embebido en `Centro-Hogar/backend/`. Esto valida el patrón de extracción del backend del portal sin romperlo.
* **Action:**
  1. **Estructura del proyecto** creada en `/home/v/Desktop/Proyectos/Core-Hogar/`:
     * `src/{config,controllers,middleware,migrations,routes,services}` + `src/app.js`.
     * `package.json` con dependencias mínimas (express, cors, dotenv, jsonwebtoken, pg). Sin ORM.
     * `Dockerfile` (node:20-alpine, expone 6100).
     * `.env.example`, `.gitignore`, `README.md`.
  2. **Configuración base:**
     * `src/config/env.js` — centraliza acceso a `process.env`.
     * `src/config/db.js` — pool Postgres compartido.
     * `src/config/apps.js` — registry estático con 5 apps (centro-hogar, homelearn, boslei, piggy-bank, agatha) + `APP_IDS` (Set para allow-list de `source_app`).
  3. **Middleware de autenticación** en `src/middleware/authMiddleware.js`:
     * Lee `Authorization: Bearer <token>`.
     * Verifica con `JWT_SECRET` compartido.
     * Inyecta `req.user = { id }` con el `userId` del token (mismo claim que emite Centro-Hogar).
  4. **Endpoints implementados** (`src/routes/index.js` + controllers):
     * `GET /health` — liveness.
     * `GET /auth/validate` — `{ valid: true, user_id }` si el JWT verifica.
     * `GET /profile` — `{ id, email, name }` del user del token.
     * `GET /apps` — registry estático filtrado por `enabled: true`.
     * `POST /events/notification` — valida shape, longitud (≤ 2000 chars), allow-list de `source_app`, existencia de `user_id`, persiste.
     * `GET /notifications` — top 50 del user, ordenadas DESC por `created_at`.
  5. **Persistencia:**
     * Migración idempotente `src/migrations/00_notifications.sql` con tabla `notifications` (FK a `users(id)` ON DELETE CASCADE) + índice `(user_id, created_at DESC)`.
     * Runner `src/services/migrations.js` ejecuta migrations al boot antes de `app.listen()`.
  6. **Decisiones técnicas registradas:**
     * Puerto **6100** (siguiente slot libre tras 6000 del backend del portal).
     * `user_id` derivado del token siempre, nunca del body/query (excepto en ingest, donde el publisher es otra app).
     * Allow-list de `source_app` derivada del registry — agregar app al registry la habilita automáticamente.
     * `POST /events/notification` sin auth en v1 (ingestión abierta, gate por allow-list + validación de payload). HMAC/mTLS queda para v2.
     * Sin ORM intencional — pg directo, mantiene simplicidad y paralelo con `Centro-Hogar/backend/server.js`.
  7. **YAPL local creado:** `whoami.md`, `changelog.md` (este archivo), `to-do.md` con regla de auto-replicación condicionada al crecimiento de `src/`.
* **Result:**
  * Servicio Core-Hogar funcional y listo para arrancar (`npm install && npm start`) o vía Docker.
  * Estructura de carpetas alineada al patrón Routes ↔ Controllers ↔ Services/Config (referencia para cuando se extraiga el backend del portal).
  * `notifications` se crea automáticamente al primer boot.
  * Cero modificaciones al backend del portal (`Centro-Hogar/backend/server.js`); cero modificaciones al SSO; cero modificaciones a apps publishers.
  * Pendiente: integración a `docker-compose.yml` raíz, reemplazo del stub en el frontend, prueba end-to-end multi-app — todo cubierto por entradas en el changelog raíz.
* **Status:** pending
