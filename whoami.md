# Project Identity — Core-Hogar

> **Memoria de largo plazo (nivel subproyecto).** Hereda del raíz `/home/v/Desktop/Proyectos/whoami.md` y de la sección *Core-API Blueprint v1* del mismo. Solo conocimiento consolidado y validado. No contiene tareas ni estados temporales.

---

## Identidad

* **Nombre:** Core-Hogar.
* **Rol:** Core-API del sistema Centro-Hogar — primer microservicio backend centralizado de la suite.
* **Versión actual:** **v1** (mínima, validable, no disruptiva).
* **Ubicación:** `/home/v/Desktop/Proyectos/Core-Hogar/`.
* **Puerto:** **6100** (host) / 6100 (container). Elegido como siguiente slot tras los 6000 del backend del portal.
* **Origen:** creado el 2026-05-05 conforme al blueprint registrado en `../whoami.md → Core-API Blueprint v1`.

---

## Responsabilidades (v1)

1. **Validación de identidad.** Verifica JWTs ya emitidos por Centro-Hogar (mismo `JWT_SECRET`, mismo claim `userId`). **No** emite tokens.
2. **Centralización de notificaciones.** Único receptor cross-app de notificaciones para los usuarios de la suite (`POST /events/notification`) y único proveedor para el frontend del portal (`GET /notifications`).
3. **Exposición de servicios comunes.**
   * `GET /profile` — perfil básico del user del token.
   * `GET /apps` — registry estático de apps disponibles (`enabled` only).
4. **Base para futura orquestación.** Capa donde aterrizarán endpoints orquestados cross-app, mensajería distribuida, RBAC y eventos en versiones siguientes.

### NO hace (v1, por diseño)

* No emite JWT, no registra usuarios, no escribe perfil.
* No tiene mensajería distribuida (sin RabbitMQ/Kafka/IBM MQ).
* No tiene SSE/WebSocket (frontend hace polling).
* No corre en Kubernetes (Docker / docker-compose es suficiente).
* No accede directamente a tablas de otras apps (solo lee `users` para JOINs en respuestas; en futuro lo hará por API).
* No firma criptográficamente la ingestión (allow-list por `source_app` es el gate).

---

## Stack tecnológico

* **Lenguaje:** Node.js 20 (alpine en Docker).
* **Framework:** Express 4.
* **Auth:** `jsonwebtoken` (verify only).
* **DB:** PostgreSQL compartida con la suite (base `homelearn`), driver `pg`.
* **Config:** `dotenv` + módulo `src/config/env.js`.
* **CORS:** abierto a cualquier origen LAN (regex idéntica a la de `Centro-Hogar/backend/server.js`).

Sin ORM, sin builder de queries, sin TypeScript — paralelo intencional con `Centro-Hogar/backend/server.js` para que la futura extracción del backend del portal no sea un cambio de stack adicional.

---

## Organización del código

```
Core-Hogar/
├── src/
│   ├── app.js                       # Express bootstrap + CORS + error handler
│   ├── config/
│   │   ├── env.js                   # process.env → config object
│   │   ├── db.js                    # pg pool
│   │   └── apps.js                  # registry estático + APP_IDS (Set)
│   ├── controllers/
│   │   ├── authController.js        # /auth/validate
│   │   ├── profileController.js     # /profile
│   │   ├── appsController.js        # /apps
│   │   └── notificationsController.js  # /events/notification, /notifications
│   ├── middleware/
│   │   └── authMiddleware.js        # Bearer JWT verify → req.user.id
│   ├── migrations/
│   │   └── 00_notifications.sql     # tabla notifications + índice
│   ├── routes/
│   │   └── index.js                 # wiring de rutas → controllers
│   └── services/
│       └── migrations.js            # runner de migrations al boot
├── scripts/
│   └── test-e2e.js                  # smoke test multi-app
├── Dockerfile
├── package.json
├── .env.example
├── README.md
└── (YAPL: whoami.md, changelog.md, to-do.md)
```

### Patrones aplicados

* **Routes thin / Controllers gordas.** El módulo `routes/index.js` solo mapea HTTP → handler; toda lógica vive en controllers.
* **Config centralizada.** Nadie toca `process.env` fuera de `config/env.js`.
* **Migrations idempotentes.** Mismo patrón que `Centro-Hogar/backend/server.js` (`runMigrations()` antes de `app.listen()`).
* **`user_id` siempre del token** en endpoints autenticados. La única excepción es `POST /events/notification`, donde el publisher es otra app y el `user_id` viene en el body.

---

## Modelo de datos

* **`users`** — propiedad de Centro-Hogar. Core-Hogar **lee** (`profile`, validación de existencia en ingest). No modifica.
* **`notifications`** — propiedad de Core-Hogar.

```
notifications (
    id          BIGSERIAL PK,
    user_id     INTEGER FK → users(id) ON DELETE CASCADE,
    source_app  TEXT,
    message     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    read        BOOLEAN     DEFAULT FALSE
)
INDEX (user_id, created_at DESC)
```

* **`apps`** — todavía no en DB. Vive en `src/config/apps.js`. Migración a tabla queda diferida para v2.

---

## Contrato de endpoints

| Método | Ruta                       | Auth | Descripción |
|--------|----------------------------|------|-------------|
| GET    | `/health`                  | —    | `{status:"ok",service:"core-hogar",version}` |
| GET    | `/auth/validate`           | JWT  | `{valid:true,user_id}` o `401 {valid:false,...}` |
| GET    | `/profile`                 | JWT  | `{id,email,name}` del user del token |
| GET    | `/apps`                    | JWT  | Array de `{id,name,description,enabled}` |
| POST   | `/events/notification`     | —    | Body `{user_id,source_app,message}` → `201 {status:"stored"}` |
| GET    | `/notifications`           | JWT  | Top 50 del user, DESC por `created_at` |

Validaciones del ingest:
* `user_id` numérico positivo y existente en `users`.
* `source_app` ∈ `APP_IDS` (allow-list del registry).
* `message` string no vacío, ≤ 2000 chars.

---

## Relación con el sistema actual

* **Centro-Hogar** sigue siendo el único emisor de JWT. SSO por hash intacto.
* **Centro-Hogar/backend/** sigue corriendo en :6000 sin cambios. Core-Hogar es **aditivo**, no reemplaza nada en v1.
* **Frontend del portal** consume Core-Hogar en `${hostname}:6100` directamente (mismo patrón que Homelearn con su backend en :5000). Sin cambios en `nginx.conf` del portal.
* **Apps publishers** (Boslei, Piggy-Bank, Homelearn, Agatha) llaman `POST /events/notification` cuando tienen algo que comunicar. Hoy no lo hacen aún — la integración por app es una subtarea futura.

---

## Constraints / NO-go

* **No emitir JWT.** Centro-Hogar es la fuente.
* **No tocar tablas de otras apps.** Excepción: `users` (read-only).
* **No introducir Kubernetes / Helm / mensajería distribuida** en v1.
* **No agregar SSE/WebSocket** en v1.
* **No firmar la ingestión** (HMAC/mTLS) en v1 — el gate es la allow-list.
* **No modificar el frontend** más allá de `notificationService.ts` (los componentes UI no cambian).

---

## Self-Replication Rule

Aplican las reglas del raíz. Específicamente para Core-Hogar:

* Cuando una carpeta de `src/` crezca a un dominio diferenciado (≥ 5-7 archivos cohesivos, o un módulo con identidad propia como `src/messaging/`, `src/orchestrators/`, `src/adapters/`):
  * **Replicar YAPL** ahí (`src/<carpeta>/whoami.md`, `src/<carpeta>/changelog.md`, `src/<carpeta>/to-do.md`).
  * Heredar de este whoami sin contradecirlo.
  * Promoción `pending → validated → whoami` ocurre dentro de cada nivel.
* No replicar antes de tiempo: módulos triviales (un solo controller, un solo helper) no necesitan YAPL propio.

---

## Operational Flow (recordatorio)

```
to-do.md  →  ejecución  →  changelog.md (pending)  →  validación  →  whoami.md
```

* No actualizar `whoami.md` directamente.
* La validación se marca cuando el flujo end-to-end pasa, no antes.

---

## Consolidated Milestones

* (Sin entradas promovidas aún. La creación inicial del servicio está en `changelog.md` como `pending`.)
