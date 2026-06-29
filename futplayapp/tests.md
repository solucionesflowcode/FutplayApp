# Tests — FutplayApp

**Total: 351 tests · 29 archivos · Todos pasan**

## Resumen por archivo

| Archivo | Tests | Cobertura |
|---------|------:|-----------|
| `api/admin/capsulas.test.ts` | 7 | CRUD cápsulas, ?tipo=modulos, validaciones |
| `api/admin/clases.test.ts` | 15 | CRUD clases, asistencia, sedes, permisos |
| `api/admin/documentos.test.ts` | 6 | CRUD documentos por cápsula |
| `api/admin/membresias.test.ts` | 3 | GET membresías, autenticación, roles |
| `api/admin/modulos.test.ts` | 7 | CRUD módulos |
| `api/admin/planes.test.ts` | 20 | CRUD planes, permisos, errores |
| `api/admin/profesores.test.ts` | 9 | CRUD profesores, joins, conflictos |
| `api/admin/students.test.ts` | 3 | Creación estudiantes, validaciones |
| `api/admin/upload.test.ts` | 3 | Subida archivos, formatos permitidos |
| `api/clases/cancelar.test.ts` | 17 | Cancelación con/sin reembolso, bordes 3h, estados |
| `api/clases/inscribir.test.ts` | 14 | Inscripción partido/entrenamiento, tokens, re-inscripción |
| `api/flow/cancel-recurrence.test.ts` | 3 | Cancelación suscripción recurrente |
| `api/flow/cancel.test.ts` | 7 | Anulación boleta, propiedades, errores |
| `api/flow/confirm.test.ts` | 17 | Confirmación pago, estados rechazado/anulado, concurrencia |
| `api/flow/create-order.test.ts` | 16 | Creación orden Flow, recurrencia, rollback, validaciones |
| `api/flow/webhook.test.ts` | 23 | Webhook Flow, pagado/rechazado, membresía automática, TOCTOU |
| `data/auth.test.ts` | 13 | Autenticación Supabase, getUsuario, signIn, busqueda teléfono |
| `data/clases.test.ts` | 9 | Próxima clase, partido/entrenamiento, sede null |
| `data/fichaMedica.test.ts` | 12 | Cálculo IMC, clasificación, CRUD ficha médica |
| `data/membresia.test.ts` | 24 | Membresías activas, tokens, agrupación, planes |
| `data/misclases-calendario.test.ts` | 4 | Clases calendario con inscripción |
| `data/pagos.test.ts` | 9 | Boletas con items, plan null, membresía |
| `data/plans.test.ts` | 20 | Lista planes, CRUD fetch, getUsers con membresías |
| `e2e/flow-sandbox.test.ts` | 5 | E2E real contra sandbox Flow (crear orden, webhook) |
| `lib/fechas.test.ts` | 12 | Suma días, bordes mes/año/bisiesto, vigencia membresía |
| `lib/flow.test.ts` | 15 | createFlowOrder, encoding, firma, getStatus, errores HTTP |
| `lib/rate-limit.test.ts` | 7 | Rate limiting, ventana, keys distintas |
| `webhook/data.test.ts` | 18 | Scheduler: horarios 24h, inscripciones, actualizaciones |
| `webhook/handlers.test.ts` | 33 | WhatsApp bot: confirmar/cancelar, bordes 1h/3h, BOT-RESP |

## Tests destacados

### API Flow (pagos)
- **confirm.test.ts** — CONFIRM-023 (atomic guard concurrencia), CONFIRM-024/025 (rechazado/anulado), CONFIRM-026/027 (fallback con error Flow)
- **webhook.test.ts** — WEBHOOK-RACE-001 (segundo webhook "Ya procesado"), WEBHOOK-RACE-002 (TOCTOU recurrencia), WEB-020/021 (idempotencia membresía)
- **create-order.test.ts** — API-FLOW-CREATE-022 (409 con distinto plan), rollback en fallo Flow

### WhatsApp Bot
- **handlers.test.ts** — BOT-RESP-001 a 007: clase actionada desde web, cancelado_sin_reembolso, recordatorio opciones, silencio usuario no registrado
- Bordes temporales: 1h (confirmar), 3h (cancelar con reembolso), fracciones, minúsculas, espacios

### Administración
- **planes.test.ts** — 20 tests: CRUD completo, permisos (admin/no-auth), defecto tokens_mensuales=1
- **clases.test.ts** — 15 tests: GET con joins, sedes, asistencia, PATCH registrar-asistencia, DELETE con devolución tokens
- **profesores.test.ts** — 9 tests: creación con usuario existente (409), eliminación en cascada

### Data Layer
- **membresia.test.ts** — 24 tests: MB-007/008/009/010 (selección membresía activa), DATA-MEMB-TODAS (agrupación), DATA-MEMB-ADMIN (fetch)
- **plans.test.ts** — DATA-GETUSERS-001 a 006: getUsers con membresías combinadas, roles, null fields, status Activo/Vencido
- **auth.test.ts** — DATA-AUTH-GCU/GU/SIG/BUS/OASC: getCurrentUser, getUsuario, signIn, buscar por teléfono, onAuthStateChange

### Scheduler / Webhook Data
- **data.test.ts** — SCH-DATA-001 a 018: ventana 24h, clases pasadas, +1h, inscripciones sin confirmar, setPendiente, actualizarPorClaseYEstado, getClase, getUsuario

### E2E
- **flow-sandbox.test.ts** — 5 tests contra sandbox Flow real: createOrder, getPaymentStatus, POST /api/flow/create-order, POST /api/flow/webhook con token real

## Tests de borde y concurrencia

| Test | Archivo | Qué cubre |
|------|---------|-----------|
| CONFIRM-023 | `api/flow/confirm.test.ts` | Atomic guard: doble escritura si boleta ya pagada |
| WEBHOOK-RACE-001 | `api/flow/webhook.test.ts` | Segundo webhook status=2 retorna "Ya procesado" |
| WEBHOOK-RACE-002 | `api/flow/webhook.test.ts` | TOCTOU: anula boleta si recurrencia se desactiva durante procesamiento |
| BOT-RESP-002/003 | `webhook/handlers.test.ts` | Usuario responde "1"/"2" después de accionar desde web |
| API-CLASES-CAN-010..017 | `api/clases/cancelar.test.ts` | Estados ya procesados: cancelado, presente, ausente, cancelado_sin_reembolso |
| API-CLASES-INS-010..014 | `api/clases/inscribir.test.ts` | Re-inscripción después de cancelación, con/sin membresía, tokens |
| WEB-020/021 | `api/flow/webhook.test.ts` | Idempotencia: salta creación si ya existe membresía para la boleta |
| SCH-DATA-012 | `webhook/data.test.ts` | Ya no está sin_confirmar → false |
| rate-limit.test.ts | `lib/rate-limit.test.ts` | Ventana, keys distintas, remaining no negativo |
