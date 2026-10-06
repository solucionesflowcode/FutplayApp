# Plan de cambios de código (pendientes de aplicar)

> Origen: mensajes de auditoría del 2026-10-06. Decisiones tomadas: **webhook opción B** (chequeo de ítems + idempotencia) y **opción G** (un solo reloj UTC real, sin `ahoraChile()` para instantes).
> Este archivo queda como lista de trabajo; al terminar, marcar en `MIGRACION_SQL_v2.md` §0 los puntos 16-17.

## Base común

- Directorio de trabajo: `futplayapp/` → `npm test` (vitest) y `npm run lint` (eslint).
- Convención existente conservada: fallo de negocio → `200 { success:false, message }`; error de servidor → 4xx/5xx `{ error }`. Nombres de variables actuales intactos (`estado`, `existing`, `horas`, `esPartido`, `tokensDevueltos`).
- **Desviación necesaria del código reconstruido:** `clase_usuario.asistencia` es `enum | null` e incluye `confirmado_whatsapp` (lo escribe el bot de WhatsApp, `webhook/data.js:62`) y el botón Cancelar de la UI se muestra justo para `sin_confirmar | pendiente | confirmado_whatsapp` (`misclases-client.tsx:775`). Por eso el `.in` lleva también `confirmado_whatsapp`, y el DELETE filtra en JS (mismo comportamiento en mock y en Postgres ante `NULL`).

---

## Cambio 1 — `src/app/api/clases/cancelar/route.ts`

- **Hoy:** hora tomada del body del navegador (línea 71) → cancelable con hora falsificada; dos UPDATE sin condición de estado (líneas 85 y 116) → doble clic devuelve el token dos veces.
- **Cambio (desde la línea 61 hasta el final):**
  1. Leer `tipo_evento, fecha_hora` de `clase` y guardar `fechaClase`.
  2. Si no hay `fechaClase` ni `fechaHora` → 400 `"Faltan parámetros"`;
     `horas = (parseClaseFechaHora(fechaClase ?? fechaHora).getTime() - Date.now()) / 36e5`.
  3. Se mantienen, en el mismo orden y con texto idéntico: la guarda de estados terminales (líneas 56-59), `< 0` → `"La clase ya ha pasado."`, `< 1` → `"La confirmación/cancelación se cerró. Faltan menos de 1 hora para la clase."`.
  4. **Un solo UPDATE condicionado**, que es a la vez candado de concurrencia:

     ```ts
     const conReembolso = horas >= 3;
     const { data: filas, error: updError } = await admin
         .from("clase_usuario")
         .update({ asistencia: conReembolso ? "cancelado" : "cancelado_sin_reembolso" })
         .eq("id", inscripcionId)
         .eq("usuario_id", user.id)
         .in("asistencia", ["sin_confirmar", "pendiente", "confirmado_whatsapp"])
         .select("id");
     ```

     - `updError` → `"Error al cancelar la clase."`
     - 0 filas (normalizando `filas` a array) → `"Esta inscripción ya no puede cancelarse."`
  5. Después, en orden: partido → `"Partido cancelado."`; `!conReembolso` → `"Clase cancelada. Como faltan menos de 3h, no se devuelve el token."`; recién ahí `rpc("devolver_token")` con los dos mensajes existentes.
- **Validación de params:** pasa a exigir solo `inscripcionId`; `fechaHora` queda como fallback (se valida después de leer la BD).
- **Cierra:** cancelar con hora falsificada; doble reembolso por doble clic.
- **Tests (`cancelar.test.ts`):**
  - Añadir `asistencia: "sin_confirmar"` a los fixtures de `clase_usuario` en CAN-005, 006, 007, 008, 009, **014 (hoy `null`)**, 018, 019.
  - CAN-010/011/012/015/016/020 no cambian (salen por la guarda de estados terminales).
  - Nuevos: **CAN-021** BD con `fecha_hora` pasada + `fechaHora` futuro en el body → `"La clase ya ha pasado."`; **CAN-022** `confirmado_whatsapp` cancela con token; **CAN-023** segunda llamada tras cancelar → `success:false` sin token.

## Cambio 2 — `src/app/api/admin/clases/route.ts` (DELETE)

- **Hoy:** reembolsa a todos los no cancelados (líneas 223-238), incluso a los que asistieron y a clases pasadas.
- **Cambio (líneas 218-238):**
  1. `select("tipo_evento, fecha_hora")` → `esPartido` y `esFutura = !fecha_hora || new Date(fecha_hora).getTime() > Date.now()`.
  2. `select("usuario_id, asistencia").eq("clase_id", id)` y **filtro en JS**:

     ```ts
     const SIN_REEMBOLSO = new Set([
       "cancelado", "cancelado_sin_reembolso", "asistio", "no_asistio", "presente", "ausente",
     ]);
     // asistencia ?? "" => NULL cuenta como reembolsable
     ```

  3. Reembolso solo si `!esPartido && esFutura`; sigue contando solo `ok === true` del RPC; respuesta idéntica `{ success: true, tokens_devueltos }`.
- **Cierra:** tokens regalados al borrar clases pasadas o con alumnos que ya asistieron.
- **Tests (`admin/clases.test.ts`):** DEL-001/002/003 siguen pasando sin tocar fixtures. Nuevos: **DEL-004** clase pasada → 0; **DEL-005** alumnos con `asistio` → 0; **DEL-006** mixto → cuenta solo los pendientes.

## Cambio 3 — `src/app/api/admin/clases/route.ts` (PATCH `registrar-asistencia`)

- **Hoy:** descarta el resultado de `update`/`insert` (líneas 274-278) y siempre devuelve `success: true`; se puede revivir una inscripción cancelada.
- **Cambio (conservando `estado` y `existing`):**
  1. `select("id, asistencia")` en vez de solo `id`.
  2. Si `existing.asistencia ∈ {cancelado, cancelado_sin_reembolso}` → `409 { error: "La inscripción está cancelada" }`.
  3. Capturar el `error` del `update`/`insert` → `400 { error: traducirError(error.message) }`; solo sin error → `{ success: true }`.
  4. El `insert` sigue intacto (dispara los triggers que consumen el token).
- **Cierra:** `success:true` aunque falle; token consumido en silencio; reabrir canceladas.
- **Tests:** nuevos **PATCH-004** (cancelada → 409) y **PATCH-005** (fixture con `error` → 400).

## Cambio 4 — `src/app/api/clases/inscribir/route.ts`

- **Hoy:** `TRIGGER_ERROR_MESSAGES[message]` con match exacto; el trigger lanza `Clase llena (15) / cupo 15` → el usuario ve el texto crudo.
- **Cambio** en `traducirErrorInscripcion`:

  ```ts
  const clave = message.startsWith("Clase llena") ? "Clase llena" : message;
  return TRIGGER_ERROR_MESSAGES[clave] ?? message;
  ```

  Sin tocar el trigger.
- **Test:** nuevo **INS-015** con `"Clase llena (15) / cupo 15"` → `"Esta clase ya está llena"`.

## Cambio 5 — `src/app/api/flow/webhook/route.ts` (opción B: chequeo + idempotencia)

Rama de cobro recurrente (líneas 92-166), en 5 pasos:

1. **Reutilizar boleta pendiente:** `from("boleta").select("id").eq("recurrencia_id", boleta.recurrencia_id).eq("estado","pendiente").order("created_at").limit(1).maybeSingle()`; si no hay, insertar la nueva **capturando el error** (hoy se ignora).
2. **Ítem con verificación:** si aún no existe (`select("id").eq("boleta_id", …)`), insertarlo capturando el error; si falla → `console.error` con el id de la boleta y `return 500` (Flow reintenta y, como la boleta se reutiliza, no se duplican filas).
3. **TOCTOU** de recurrencia: se mantiene igual (si se desactivó → anular la boleta → `OK`).
4. **Marcar pagado** con el `.eq("estado","pendiente")` actual; si hay `error` → `500` (hoy solo loguea).
5. **Membresía con guard** `existingForBoleta` sobre `newBoleta.id` (mismo patrón de la ruta principal, línea 208).

Además, en la ruta normal, un `console.error` cuando `!boletaItem` tras marcar pagada (solo log, sin cambio de flujo).

- **Riesgos que cierra:** boleta pagada sin ítems; boleta/membresía duplicada por reintento.
- **Tests (`webhook.test.ts`):** los existentes siguen verdes. Nuevos: **WEB-030** `boleta_item` con error → `500` y la boleta no queda `pagado`; **WEB-031** ya existe boleta pendiente de la recurrencia → no se crea otra.

## Cambio 6 — Un solo reloj UTC real (opción G)

`ahoraChile()` queda solo para mostrar (el formateo ya lleva `timeZone`). Producción (15 sitios):

| Tipo | Archivo:línea | Cambio |
|---|---|---|
| escritura | `flow/webhook:141`, `flow/webhook:215`, `flow/confirm:41` | `new Date().toISOString()` |
| escritura | `data/membresia.ts:215`, `:342` | ídem |
| escritura | `admin/students/route.ts:74`, `students/status/route.ts:64` | ídem |
| escritura | `admin/membresias/page.tsx:167` | `const ahora = new Date()` |
| escritura | `admin/membresias/freeze/route.ts:49` | `const now = new Date()` (mueve también `fecha_congelamiento` y el `deltaMs` de reactivación) |
| lectura | `lib/fechas.ts:2` (`membresiaActiva`) | `>= new Date()` |
| lectura | `data/membresia.ts:51` (`userHasMembresia`) | `new Date().toISOString()` |
| lectura | `admin/membresias/route.ts:102` | `>= new Date()` |
| lectura | `MiAsistencia.tsx:19` | `new Date().toISOString()` (quita el dynamic import) |
| lectura | `ProximaRenovacion.tsx:128` | `const now = new Date()` |

- Al final: eliminar los imports de `ahoraChile` que queden sin uso (lo detecta `lint`), sin borrar la función.
- **Efecto esperado y documentado:** las membresías creadas antes del cambio vencen 3 h antes *en la app* también (hoy es así solo en la BD/cron); las congeladas antes del cambio suman ~3 h extra al reactivarse. Filas viejas **no** se tocan.
- **Tests:** `membresias.freeze.test.ts` — reemplazar `ahoraChile()` por `new Date()` en las 4 fixtures (líneas 3, 36, 118, 150, 179); sin eso **FRZ-010** falla (el shift quedaría en 5 días + 3 h). El resto de los fixtures usan escalas de días/meses → sin cambios.

---

## Orden de ejecución

1. Cambios 1-4 (cancelar, DELETE, PATCH, inscribir) + sus fixtures/tests.
2. Cambio 5 (webhook) + tests nuevos.
3. Cambio 6 (reloj) + fixtures de `freeze.test.ts`.
4. `npm run lint` → `npm test`.

## Verificación final

- Suite completa en verde; lint sin errores.
- Checklist de entorno (sin código): doble clic cancelar → `tokens_usados` baja 1 vez; body con hora futura sobre clase pasada → `"La clase ya ha pasado."`; borrar clase pasada con asistentes → `tokens_devueltos: 0`; asistencia a alumno no inscrito → error visible en panel; RLS (comentarios, documentos, cobro recurrente, registro nuevo); `docker exec <contenedor> sh -c 'test -n "$SUPABASE_SERVICE_ROLE_KEY" && echo definida'`; consulta de `MIGRACION_SQL_v2.md` §4 → `clase_backup_en_public = 0`.
- **Opcional:** al cerrar, marcar en `docs/MIGRACION_SQL_v2.md` §0 los puntos 16-17 como ✅ y actualizar §3.
