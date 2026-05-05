# Task Engine — Core-Hogar

> **Motor de ejecución activo (nivel subproyecto).** Una sola tarea actual. Hereda reglas del raíz. Cada iteración deja entrada en `changelog.md` con `Status: pending`.

---

## Current Objective

**Validar funcionalmente el Core-API v1 mediante prueba end-to-end multi-app y dejar el servicio listo para uso real desde el frontend del portal.**

La estructura del servicio y los 5 endpoints definidos por el blueprint ya están construidos (Entry 1 del changelog local). El siguiente paso es **probarlo en flujo real** y **mantenerlo estable** mientras Centro-Hogar lo consume.

---

## Subtareas (orden recomendado)

### Inmediato

* [x] Inicializar el servicio (estructura, package.json, Dockerfile, env).
* [x] Implementar middleware de autenticación.
* [x] Implementar los 5 endpoints del blueprint v1.
* [x] Configurar conexión a DB y migración idempotente de `notifications`.
* [x] Crear YAPL local (este archivo + whoami + changelog).
* [ ] **Validar el flujo end-to-end multi-app** vía `scripts/test-e2e.js` o curl manual:
  1. Login en Centro-Hogar → obtener JWT.
  2. `POST /events/notification` simulando Boslei.
  3. `POST /events/notification` simulando Piggy-Bank.
  4. `GET /notifications` con el JWT del user → debe devolver ambas en orden DESC.
  5. Frontend del portal renderiza ambas en `NotificationPanel`.

### Corto plazo

* [ ] Confirmar que `docker compose up core-hogar` levanta sin errores en el host del usuario.
* [ ] Confirmar que el frontend reemplazado (`notificationService.ts` real) no rompe el comportamiento existente cuando no hay notificaciones (debe seguir mostrando el `LAST_UI_UPDATE` y el changelog del portal).
* [ ] Marcar Entry 1 del changelog local como `validated` cuando el flujo end-to-end pase.

### Diferido (post-validación de v1)

* [ ] Mover el registry de apps a tabla DB (preparación de v2).
* [ ] Endpoint `PUT /notifications/:id/read` para marcar como leídas.
* [ ] Endpoint `DELETE /notifications/:id` para descartar.
* [ ] Estrategia de firma para `POST /events/notification` (HMAC con shared secret por app o JWT de servicio).
* [ ] Reemplazar polling por SSE (`/notifications/stream`) en el frontend.
* [ ] Integrar cola de mensajería (decisión final RabbitMQ / Kafka / IBM MQ pendiente).

---

## Context Input

Antes de ejecutar cualquier subtarea, leer **siempre**:

* [whoami.md](whoami.md) — identidad y responsabilidades de Core-Hogar.
* [changelog.md](changelog.md) — entradas locales `pending`.
* [`../whoami.md`](../whoami.md) → secciones *Target Architecture* y *Core-API Blueprint v1*.
* [`../to-do.md`](../to-do.md) — objetivo activo del workspace.

---

## Execution Rules

1. **El blueprint v1 manda.** Cualquier discrepancia entre la implementación y `../whoami.md → Core-API Blueprint v1` es un bug; alinear la implementación, no el blueprint.
2. **No tocar tablas de otras apps.** Excepción: `users` (read-only, propiedad de Centro-Hogar).
3. **No emitir JWT en v1.** Centro-Hogar es el único emisor.
4. **Una subtarea por iteración** → una entrada en `changelog.md`.
5. **Compatibilidad backwards.** El backend del portal sigue corriendo; Core-Hogar es aditivo. Cualquier cambio que afecte al portal debe seguir funcionando con el modelo viejo.

---

## Self-Replication Rule

Cuando una carpeta de `src/` crezca en complejidad (≥ 5-7 archivos con dominios diferenciados o un módulo con identidad propia como `src/messaging/`):

* **Replicar YAPL** ahí: `src/<carpeta>/whoami.md`, `src/<carpeta>/changelog.md`, `src/<carpeta>/to-do.md`.
* Heredar de este whoami sin contradecirlo.
* Mover a ese nivel las subtareas exclusivas del módulo.

No replicar antes de tiempo: módulos triviales no necesitan YAPL propio.

---

## Operational Flow

```
to-do.md  →  ejecución  →  changelog.md (pending)  →  validación  →  whoami.md
```

* Validación = la suite arranca, los 5 endpoints responden lo esperado, el frontend renderiza notificaciones reales, no hay regresiones en el portal existente.
