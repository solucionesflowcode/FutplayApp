# FutPlay App — Contexto del proyecto

> Actualizado: 2026-10-10. Contrastado con el código de `empresa/deploy-main` y la BD de producción.
> Detalle de la base de datos: **`docs/DOCUMENTACION_BD_v2.md`**.

## 0. Repositorio y despliegue

- **Repo oficial:** `https://github.com/solucionesflowcode/FutplayApp` (remoto `empresa`), rama **`deploy-main`**. Vercel despliega desde ahí. La app vive en la subcarpeta `futplayapp/`.
- El remoto `origin` (`JoaquinLepeSegovia/FutplayApp`) es una copia personal **desactualizada**: no usarlo como base.
- **Supabase:** proyecto `cdhbfyqtubqnmgjdgkab`. Las migraciones se registran en `supabase_migrations` y los SQL se versionan en `docs/migrations/`.
- **Bot de WhatsApp:** servicio aparte en `webhook/` (Docker), con su propio `package.json`.

## 1. Stack

| Tecnología | Versión / uso |
|---|---|
| Next.js | 16.2.2 (App Router). **No hay `proxy.ts` ni `middleware.ts`**: la protección es `AuthGuard` en cliente + validación en cada API |
| React | 19.2.4 |
| Supabase | `@supabase/supabase-js` ^2.103, `@supabase/ssr` ^0.10.3 |
| Tailwind CSS | v4 |
| Flow (flow.cl) | Pagos únicos (`src/lib/flow.ts`). Cobro recurrente **deshabilitado** |
| Bunny Stream | Videos de cápsulas con URL **firmada** (`src/lib/bunny.ts`) |
| Google OAuth | Flujo propio con id_token (`src/lib/google-oauth.ts`) |
| Vitest + Testing Library + MSW | `npm test` (~480 pruebas) |
| Bot | Node + whatsapp-web.js + node-cron (`webhook/`) |

## 2. Estructura

```
futplayapp/
├── docs/
│   ├── DOCUMENTACION_BD_v2.md     # BD: tablas, triggers, RLS, migraciones, auditoría
│   ├── MIGRACION_SQL_v2.md, PLAN_CAMBIOS_CODIGO.md
│   └── migrations/*.sql           # SQL versionados (2026-10-auditoria-*.sql, etc.)
├── src/
│   ├── app/
│   │   ├── page.tsx               # Redirector por rol
│   │   ├── auth/callback/         # Callback Google → exchange → link-usuario
│   │   ├── planes/familiar/[token]/   # Compra de plan familiar/liga por link
│   │   ├── (public)/  home/ (acerca-de-nosotros, nuestros-amigos), login/
│   │   ├── (dashboard)/  AuthGuard ["jugador"]: dashboard, planes, pagos, misclases,
│   │   │                 capsules (+[id]), perfil, configuracion
│   │   ├── (profesor)/profesor/   AuthGuard ["profesor"]: calendario + asistencia
│   │   ├── (admin)/admin/         AuthGuard ["administrador"]: usuarios, analiticas,
│   │   │                          clases, modulos, capsulas, profesores, planes, membresias, perfil
│   │   └── api/                   # ver §5
│   ├── components/   admin/ checkout/ dashboard/ landingPage/ Login/ misclases/
│   │                 navbars/ perfil/ profesor/ userDashboard/ videoPlayer/
│   ├── context/      AuthContext, AuthGuard
│   ├── data/         acceso a datos desde el cliente (ver §6)
│   ├── lib/          utilidades de servidor y compartidas (ver §6)
│   ├── utils/supabase/  client.ts, server.ts, admin.ts (verifyAdmin + getAdminClient)
│   └── tests/        api/, data/, lib/, components/, webhook/, mocks/
└── webhook/          server.js, data.js, handlers.js, limpieza.js, Dockerfile, docker-compose.yml
```

## 3. Autenticación

1. `/login` → Google → `/auth/callback` (página de cliente).
2. `POST /api/auth/google/exchange` intercambia el code por el id_token (valida el redirect_uri canónico).
3. `supabase.auth.signInWithIdToken`.
4. Si no hay fila en `usuario` con ese id, `POST /api/auth/link-usuario` con **`Authorization: Bearer <access_token>`**. La ruta toma el id y el email **del token verificado**, nunca del body.
5. Redirección por rol: administrador → `/admin`, profesor → `/profesor`, jugador → `/dashboard`.

`AuthGuard allowedRoles` muestra un botón a `/login` si no hay sesión y redirige a la sección del rol si no corresponde.

## 4. Reglas de negocio clave

- **Membresía vigente:** `estado` + no congelada + `fecha_inicio <= now <= fecha_vencimiento`. Las fechas son el **instante real** (`new Date()`). `ahoraChile()` se eliminó.
- **Comprar un plan:** lo bloquea solo una membresía vigente **con tokens**. La regla es la función SQL `usuario_tiene_membresia_vigente`, que usan `create-order` (servidor), `/planes` y `/pagos` (cliente vía RPC).
- **Planes familiar y liga:** se compran solo con el link del admin (`codigo_acceso`, que no es legible por los usuarios). Liga es un pago único y no bloquea ni crea una membresía activa.
- **Tokens:** los descuenta el trigger al inscribirse (los partidos no). Los devuelve `devolver_token` al cancelar con ≥ 3 h, salvo partidos.
- **Plan ↔ clase:** kids solo reserva clases kids; normal no reserva kids. Lo valida la API y el trigger.
- **Cancelar:** ≥ 3 h → `cancelado` + token; 1–3 h → `cancelado_sin_reembolso`; < 1 h → no se permite. La fecha se lee de la BD.
- **Borrar una clase:** devuelve tokens solo a reservas activas de clases que aún no ocurren.
- **Contenido pago** (videos y documentos): staff, o alumno con membresía vigente (no congelada, con tokens totales > 0). El video usa una URL firmada de Bunny.

## 5. API (resumen)

Autenticación por grupo: **admin** = `verifyAdmin()` + service_role; **user** = sesión de Supabase.

| Grupo | Rutas |
|---|---|
| Auth | `auth/google/exchange`, `auth/link-usuario` (Bearer), `auth/callback` (legacy) |
| Alumno (user) | `perfil`, `clases/inscribir`, `clases/cancelar`, `clases/cupos`, `flow/create-order`, `flow/cancel`, `flow/cancel-recurrence`, `flow/diagnose`, `download-documento` (requiere acceso a contenido) |
| Flow (validadas contra Flow) | `flow/webhook`, `flow/confirm`, `flow/return` |
| Públicas | `planes/familiar` (devuelve datos de un plan por su link, sin el código) |
| Admin | `admin/{clases, modulos, capsulas(+destacada), documentos, profesores, students(+status), membresias(+gestion, +freeze), planes(+link), perfil(+avatar), analiticas/*, upload*}`, `bunny/*` (incluida `thumbnail`) |

### Flujo de pago (Flow)
1. `create-order` crea la boleta `pendiente` y el ítem, y obtiene la orden en Flow. Sin recurrencia.
2. Flow notifica a `flow/webhook?boletaId=…`. Se verifica con `getStatus` (si falla en producción responde 502 para que Flow reintente).
3. Si el estado es 2 (pagado), la boleta pasa a `pagado` aunque estuviera anulada, y se asegura la membresía (`crearMembresiaPorBoleta`, idempotente). Si falla, responde 500 para que Flow reintente.
4. El alumno vuelve por `flow/return` → `/dashboard?flowSuccess=1`, que consulta `flow/confirm` (que también repara la membresía si falta).

## 6. Módulos de `src/lib` y `src/data`

**`src/lib`:**
- `fechas.ts`: zona de Chile **solo para mostrar**, `membresiaActiva`, `fechaVencimientoDesde`, `parseClaseFechaHora`.
- `membresia-pago.ts`: `crearMembresiaPorBoleta`, idempotente; un unique violation cuenta como "ya existe".
- `acceso-contenido.ts`: `tieneAccesoContenido`.
- `bunny.ts`: API de Bunny + `getSignedEmbedUrl`.
- `plan-columnas.ts`: `PLAN_COLUMNAS_PUBLICAS`.
- `auth-email.ts`: `sincronizarEmailAuth`.
- `flow.ts`, `rate-limit.ts`, `errores.ts`, `base-url.ts`, `google-oauth.ts`, `capsula-destacada.ts` (se guarda en `.data/`, efímero en Vercel).

**`src/data`:**
- `pagos.ts`: `getMisBoletas`, `getMiMembresia`, `tieneMembresiaPagos`.
- `plans.ts`: catálogo con columnas públicas.
- `membresia.ts`, `clases.ts`, `clase_usuario.ts` (`cancelarClase(inscripcionId)`), `misclases-calendario.ts`, `profesor-clases.ts`, `capsules*.ts`, `capsulas-admin.ts`, `modulos.ts`, `documentos*.ts`, `comentarios.ts`, `fichaMedica.ts`, `profesores.ts`, `auth.ts`.

## 7. Bot de WhatsApp (`webhook/`)

- **Sin servidor HTTP:** los mensajes llegan por el cliente de whatsapp-web.js (`c.on('message')`). Se eliminaron `/whatsapp-webhook` y `/test-reminder`, y el contenedor ya no publica el puerto 3001.
- **Respuestas:** "1" confirma (`confirmado_whatsapp`) y "2" cancela con las mismas reglas de 3 h. Cancelar un partido nunca devuelve token.
- **Scheduler** (node-cron, cada minuto; `SCHEDULER_ENABLED=true`):
  1. Manda los recordatorios 24 h antes (`sin_confirmar` → `pendiente`), salvo si la clase empieza en menos de 2 h.
  2. 1 h antes de la clase, solo `pendiente` (avisado y sin responder) pasa a `cancelado_sin_reembolso`. Las reservas `sin_confirmar` (nunca avisadas) no se cancelan.
  3. 1 h después de la clase, `confirmado_whatsapp` pasa a `no_asistio` (el profesor lo corrige a `asistio`).
- **Encendidos cortos** (`webhook/mensajes.js`): al conectarse lee las respuestas recibidas con el bot apagado (desde `estado-bot.json`, máx. 48 h) y las aplica con la hora real del mensaje. El scheduler no corre hasta terminar.
- Sin `SUPABASE_SERVICE_ROLE_KEY` el bot **no arranca**. Despliegue: `webhook/DESPLIEGUE.md`.
- Incluye un watchdog de reconexión y limpieza de Chrome colgado (`limpieza.js`). La sesión se guarda en un volumen de Docker.

## 8. Historial de cambios (2026-10-09 / 10)

| Commit | Cambio |
|---|---|
| `d3ba327` | `/pagos` bloqueaba la compra a alumnos sin tokens. La gestión admin recalcula `sin_tokens`/`estado` al editar tokens |
| `c2e78bf` | Flow: los pagos confirmados sobre boletas anuladas generan membresía; el webhook repara o reintenta; recurrencia deshabilitada (era explotable) |
| `0d85652` | Se elimina `ahoraChile()`: las membresías se guardaban y vencían 3–4 h antes |
| `22c1979` | Auditoría fase 1 (seguridad): cancelación con fecha de la BD, `codigo_acceso` oculto, bot sin endpoints HTTP, `link-usuario` con Bearer, RLS de profesor, URLs de Bunny firmadas, acceso a cápsulas por vigencia |
| `6d4e048` | Auditoría fases 2 y 3: borrar clase sin reembolsos de más, borrar alumno con pagos → 409, asistencia del admin sin crear reservas, email sincronizado con auth, "Activo" reactiva la membresía, avatar sin SVG, alta de profesor robusta, `thumbnail` solo admin, migraciones de funciones y trigger kids/normal |

**Datos corregidos en producción:**
- Se cerraron 2 membresías manuales con 0 tokens.
- Se corrigieron +3/+4 h en 57 membresías.
- Se aplicaron las 5 migraciones `2026-10-auditoria-*`.

## 9. Pendientes

- **Bunny:** activar *Token Authentication* y configurar `BUNNY_TOKEN_KEY` en Vercel. Hasta entonces, los videos se sirven sin firma.
- **Supabase:** activar *Leaked password protection*.
- La **cápsula destacada** se guarda en el filesystem (`.data/`), que no persiste en Vercel.
- `devolver_token` devuelve el token a la membresía vigente, no a la que se usó en la reserva.
- Hay **21 errores de tipos preexistentes** en archivos de prueba (`npx tsc --noEmit`), sin efecto en el build.
- Archivos grandes: `pagos-client.tsx` (~1400 líneas) y `misclases-client.tsx` (~890).
- Eliminar los esquemas `mock` y `backup_20261005` tras ~30 días de estabilidad.
