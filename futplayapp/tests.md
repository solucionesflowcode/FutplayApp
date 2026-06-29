# Tests — FutplayApp

**Total: 351 tests · 29 archivos · Todos pasan**

<<<<<<< HEAD
---

## Tabla de contenidos

1. [lib/fechas.test.ts](#libfechastestts)
2. [lib/flow.test.ts](#libflowtestts)
3. [lib/rate-limit.test.ts](#librate-limittestts)
4. [data/auth.test.ts](#dataauthtestts)
5. [data/clases.test.ts](#dataclasestestts)
6. [data/fichaMedica.test.ts](#datafichamedicatestts)
7. [data/membresia.test.ts](#datamembresiatestts)
8. [data/misclases-calendario.test.ts](#datamisclases-calendariotestts)
9. [data/pagos.test.ts](#datapagostestts)
10. [data/plans.test.ts](#dataplanstestts)
11. [webhook/data.test.ts](#webhookdatatestts)
12. [webhook/handlers.test.ts](#webhookhandlerstestts)
13. [api/clases/cancelar.test.ts](#apiclasescancelartestts)
14. [api/clases/inscribir.test.ts](#apiclasisinscribirtestts)
15. [api/flow/cancel-recurrence.test.ts](#apiflowcancel-recurrencetestts)
16. [api/flow/cancel.test.ts](#apiflowcanceltestts)
17. [api/flow/confirm.test.ts](#apiflowconfirmtestts)
18. [api/flow/create-order.test.ts](#apiflowcreate-ordertestts)
19. [api/flow/webhook.test.ts](#apiflowwebhooktestts)
20. [api/admin/capsulas.test.ts](#apiadmincapsulastestts)
21. [api/admin/clases.test.ts](#apiadminclasestestts)
22. [api/admin/documentos.test.ts](#apiadmindocumentostestts)
23. [api/admin/membresias.test.ts](#apiadminmembrasiastestts)
24. [api/admin/modulos.test.ts](#apiadminmodulostestts)
25. [api/admin/planes.test.ts](#apiadminplanestestts)
26. [api/admin/profesores.test.ts](#apiadminprofesorestestts)
27. [api/admin/students.test.ts](#apiadminstudentstestts)
28. [api/admin/upload.test.ts](#apiadminuploadtestts)
29. [e2e/flow-sandbox.test.ts](#e2eflow-sandboxtestts)

---

## 1. `lib/fechas.test.ts` — 12 tests

### `calcularVencimiento`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | suma 30 días a una fecha | `calcularVencimiento("2026-01-01")` → `2026-01-31` |
| 2 | cruza frontera de mes | `calcularVencimiento("2026-01-15")` → `2026-02-14` |
| 3 | cruza frontera de año | `calcularVencimiento("2026-12-15")` → `2027-01-14` |
| 4 | maneja año bisiesto | `calcularVencimiento("2024-02-01")` → `2024-03-02` (febrero 2024 tiene 29 días) |
| 5 | maneja febrero no bisiesto | `calcularVencimiento("2025-02-01")` → `2025-03-03` (febrero 2025 tiene 28 días) |
| 6 | maneja 31 de enero | `calcularVencimiento("2026-01-31")` → `2026-03-02` (enero 31 + 30 = marzo 2 por febrero con 28) |

### `membresiaActiva`

| # | Test | Qué prueba |
|---|------|------------|
| 7 | true si la membresía está vigente | Fecha actual dentro del rango de vencimiento |
| 8 | false si venció hace 1 día | Membresía del 1 de enero, hoy es 1 de febrero > vencimiento (31 enero) |
| 9 | true si vence hoy exactamente | Hoy es 31 de enero, membresía del 1 de enero (vence hoy) |
| 10 | false si venció ayer exactamente | Ayer fue el último día de vigencia |
| 11 | true justo antes del vencimiento | 30 enero 23:59:59.999 — un milisegundo antes de vencer |
| 12 | false justo después del vencimiento | 31 enero 00:00:01 — un segundo después de vencer |

---

## 2. `lib/flow.test.ts` — 15 tests

### `createFlowOrder`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | llama a Flow sandbox /payment/create con method POST y content-type correcto | Verifica que la URL sea `sandbox.flow.cl/api/payment/create`, method POST, content-type `application/x-www-form-urlencoded` |
| 2 | incluye apiKey, commerceOrder, amount, email y firma s en el body | El body form-urlencoded contiene todos los campos requeridos por Flow |
| 3 | codifica espacios como + (no %20) | El subject "Plan Básico" se codifica como `Plan+B%C3%A1sico`, no usa `%20` |
| 4 | no escapa brackets [] en keys del body | Verifica que `[` y `]` literales no se escapen como `%5B` / `%5D` |
| 5 | incluye recurrence como flat param cuando se especifica | Si se pasa `{ period: 30 }`, el body contiene `recurrence=30` |
| 6 | no incluye recurrence si no se especifica | Si no se pasa recurrence, el body no contiene la palabra "recurrence" |
| 7 | incluye paymentMethod y timeout si se pasan | Si se pasan opciones extra, aparecen en el body |
| 8 | retorna url, token y flowOrder desde la respuesta | La función parsea correctamente la respuesta JSON de Flow |
| 9 | lanza error si Flow responde con HTTP error | Status 400 → se lanza `Flow createOrder failed: 400` |

### `getFlowPaymentStatus`

| # | Test | Qué prueba |
|---|------|------------|
| 10 | llama a Flow sandbox /payment/getStatus con token y apiKey | URL correcta, method POST, body contiene apiKey + token + firma |
| 11 | retorna el estado del pago | Parsea status, flowOrder, commerceOrder de la respuesta |
| 12 | lanza error si Flow responde con HTTP error | Status 500 → `Flow getStatus failed: 500` |

### `toUrlEncoded`

| # | Test | Qué prueba |
|---|------|------------|
| 13 | FLOW-ENCODE-001: codifica caracteres especiales & = # en valores | `"Plan & Precio = $20,000 #promo"` → `Plan+%26+Precio+%3D+%2420%2C000+%23promo` |
| 14 | FLOW-ENCODE-002: preserva brackets [] en keys | No se escapan `[` `]` en los keys del form-urlencoded |

### `generateSignature`

| # | Test | Qué prueba |
|---|------|------------|
| 15 | la firma s tiene formato hexadecimal de 64 caracteres | La firma HMAC-SHA256 tiene exactamente 64 caracteres hex |

---

## 3. `lib/rate-limit.test.ts` — 7 tests

| # | Test | Qué prueba |
|---|------|------------|
| 1 | permite la primera solicitud | `rateLimit("user-1", 5, 60000)` → `allowed: true, remaining: 4` |
| 2 | reduce remaining en cada llamada | 3 llamadas seguidas: remaining 4 → 3 → 2 |
| 3 | bloquea cuando se excede el límite | 6 llamadas con límite 5: la 6ª → `allowed: false, remaining: 0` |
| 4 | reinicia la ventana después del tiempo configurado | Después de 60s + 1ms, el contador se reinicia |
| 5 | usa keys distintas para diferentes usuarios | user-1 bloqueado no afecta a user-2 |
| 6 | respeta límites distintos por key | user-1 con límite 2, user-2 con límite 10 |
| 7 | remaining nunca es negativo | Después de exceder el límite muchas veces, remaining es 0 (no negativo) |

---

## 4. `data/auth.test.ts` — 13 tests

### `getCurrentUser`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | DATA-AUTH-GCU-001 | Usuario autenticado: retorna `{ user: { id, email }, error: null }` |
| 2 | DATA-AUTH-GCU-002 | No autenticado: retorna `{ user: null, error: null }` |
| 3 | DATA-AUTH-GCU-003 | Error en `auth.getUser()`: retorna `{ user: null, error: "Auth error" }` |
| 4 | DATA-AUTH-GCU-004 | Excepción inesperada: captura el error y retorna mensaje genérico |

### `getUsuario`

| # | Código | Qué prueba |
|---|--------|------------|
| 5 | DATA-AUTH-GU-001 | Usuario existe en tabla `usuario`: retorna datos completos |
| 6 | DATA-AUTH-GU-002 | Error en consulta: retorna `null` |
| 7 | DATA-AUTH-GU-003 | Excepción inesperada: retorna `null` |

### `signInWithGoogle`

| # | Código | Qué prueba |
|---|--------|------------|
| 8 | DATA-AUTH-SIG-001 | Inicio de sesión exitoso: `error: null` |
| 9 | DATA-AUTH-SIG-002 | Error de OAuth: retorna mensaje de error |
| 10 | DATA-AUTH-SIG-003 | Excepción inesperada: retorna "Error al iniciar sesión con Google" |

### `buscarUsuarioPorTelefono`

| # | Código | Qué prueba |
|---|--------|------------|
| 11 | DATA-AUTH-BUS-001 | Encuentra usuario por teléfono: retorna datos |
| 12 | DATA-AUTH-BUS-002 | No encuentra: retorna `null` |

### `onAuthStateChange`

| # | Código | Qué prueba |
|---|--------|------------|
| 13 | DATA-AUTH-OASC-001 | Registra callback correctamente: devuelve objeto con `unsubscribe` |

---

## 5. `data/clases.test.ts` — 9 tests

### `getProximaClase`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | DATA-CLASES-GPC-001 | Retorna la próxima clase del usuario con título, sede y tipo_evento |
| 2 | DATA-CLASES-GPC-002 | Clase tipo partido con título personalizado |
| 3 | DATA-CLASES-GPC-003 | No hay clases futuras: retorna `[]` |
| 4 | DATA-CLASES-GPC-004 | Error en la consulta: retorna `[]` |
| 5 | DATA-CLASES-GPC-005 | Multiple clases: retorna solo la más próxima (la que tiene fecha más cercana) |
| 6 | DATA-CLASES-GPC-006 | Sede es `null`: se mapea a string vacío `""` |
| 7 | DATA-CLASES-GPC-007 | Entrenamiento sin título (`null`): se filtra (no se incluye en el resultado) |
| 8 | DATA-CLASES-GPC-008 | Partido con título `null`: se muestra como `"Partido"` |
| 9 | DATA-CLASES-GPC-009 | Partido sin título ni sede: título = "Partido", sede = "" |

---

## 6. `data/fichaMedica.test.ts` — 12 tests

### `calculateIMC`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | calcula IMC correctamente (70kg, 175cm) | `70 / (1.75)^2 = 22.857...` → redondeado a 22.9 |
| 2 | returns 0 para valores extremos | Peso 0 → IMC 0 (evita división por cero) |
| 3 | redondea a 1 decimal | 22.857 → 22.9 |

### `getIMCStatus`

| # | Test | Qué prueba |
|---|------|------------|
| 4 | Bajo peso para IMC < 18.5 | IMC 16 → `{ label: "Bajo peso", color: "text-blue-500" }` |
| 5 | Normal para IMC entre 18.5 y 24.9 | IMC 18.5, 22, 24.9 → Normal |
| 6 | Sobrepeso para IMC entre 25 y 29.9 | IMC 25, 27.5 → Sobrepeso |
| 7 | Obesidad para IMC >= 30 | IMC 30, 35 → Obesidad |

### `userHasFichaMedica`

| # | Test | Qué prueba |
|---|------|------------|
| 8 | true cuando existe ficha médica | Hay registro en `ficha_medica` |
| 9 | false cuando no existe ficha médica | No hay registro |
| 10 | false cuando hay error en la consulta | Error de BD → false |

### `createFichaMedica`

| # | Test | Qué prueba |
|---|------|------------|
| 11 | true cuando la inserción es exitosa | Se inserta correctamente |
| 12 | false cuando hay error en la inserción | Error de BD → false |

---

## 7. `data/membresia.test.ts` — 28 tests

### `userHasMembresia`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | true si hay membresía activa | Membresía con `estado: true` → true |
| 2 | false si existe pero no activa | `estado: false` → false (filtra por estado) |
| 3 | false si no hay membresías | Array vacío → false |
| 4 | false si hay error | Error de consulta → false |

### `getMembresiaByUser`

| # | Test | Qué prueba |
|---|------|------------|
| 5 | retorna membresía activa con plan | Solo `estado: true`, datos completos con plan_nombre, tokens_restantes, precio |
| 6 | retorna null si existe pero no activa | `estado: false` → null (filtra por estado) |
| 7 | retorna null si no hay membresía | Sin datos → null |
| 8 | retorna null si hay error en membresía | Error → null |

### `createMembresia`

| # | Test | Qué prueba |
|---|------|------------|
| 9 | true si inserción exitosa (inserta con estado=true) | Inserción ok → true, verifica `estado: true` en insert |
| 10 | false si hay error | Error → false |
| 11-13 | asigna tokens según plan + estado=true | Plan Amateur → 4, Plan Pro → 6, Plan Selección → 12. Verifica tokens_totales, tokens_usados=0, `estado: true`, plan_id, usuario_id |

### `devolverToken`

| # | Test | Qué prueba |
|---|------|------------|
| 14 | true si membresía activa tiene tokens usados | `estado: true`, tokens_usados > 0 → se reduce en 1 |
| 15 | false si membresía existe pero no activa | `estado: false` → false (filtra por estado) |
| 16 | false si no hay membresía | No hay membresía → false |
| 17 | MB-009: false si activa tiene 0 usados aunque vieja inactiva tenga >0 | Activa `tokens_usados=0`, inactiva `tokens_usados=5` → false |

### `getMembresiaByUser` — múltiples membresías

| # | Test | Qué prueba |
|---|------|------------|
| 18 | MB-007: elige la activa más reciente | Activa junio, inactiva mayo → elige la activa (junio) |
| 19 | MB-008: usa activa nueva aunque vieja inactiva tenga más tokens | Activa con 30 restantes, inactiva con 20 → elige activa |
| 20 | retorna null si todas están inactivas | Dos inactivas → null (ninguna activa) |

### `createMembresia` — duplicados

| # | Test | Qué prueba |
|---|------|------------|
| 21 | MB-010: crea membresía activa aunque exista una inactiva del mes pasado | Inactiva no bloquea creación de una nueva activa |

### `getAllMembresiasConPlan`

| # | Código | Qué prueba |
|---|--------|------------|
| 22 | DATA-MEMB-TODAS-001 | Agrupa por usuario, solo activas, elige la de más tokens restantes |
| 23 | DATA-MEMB-TODAS-002 | Solo membresías inactivas → `[]` (filtra por estado) |
| 24 | DATA-MEMB-TODAS-003 | Error → `[]` |
| 25 | DATA-MEMB-TODAS-004 | Plan no existe → plan_nombre = "Sin plan", precio = 0, tokens_mensuales = 0 |

### `getAdminMembresias`

| # | Código | Qué prueba |
|---|--------|------------|
| 26 | DATA-MEMB-ADMIN-001 | Fetch exitoso → lista de membresías |
| 27 | DATA-MEMB-ADMIN-002 | Fetch falla con status 403 → `[]` |
| 28 | DATA-MEMB-ADMIN-003 | Fetch lanza error de red → `[]` |

---

## 8. `data/misclases-calendario.test.ts` — 4 tests

### `getAllClasesConInscripcion`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | DATA-CAL-001 | Retorna clases con inscripción del usuario: clase inscrita tiene `inscripcionId` y `asistencia`, la no inscrita tiene `null` |
| 2 | DATA-CAL-002 | Sin clases → `[]` |
| 3 | DATA-CAL-003 | Error en consulta clases → `[]` |
| 4 | DATA-CAL-004 | Maneja tipos de asistencia variados: asistio, cancelado, y una clase sin inscripción |

---

## 9. `data/pagos.test.ts` — 9 tests

### `getMisBoletas`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | boletas con items mapeados correctamente | Mapea estado, total, items con plan_nombre y precio |
| 2 | array vacío si hay error | Error → `[]` |
| 3 | array vacío si no hay boletas | Sin datos → `[]` |
| 4 | maneja boleta sin items | `boleta_item` null → items = `[]` |
| 5 | PAGOS-BOLETA-NULL-001 | Item sin plan: plan_nombre es `null`, plan_id es `null` |

### `getMiMembresia`

| # | Test | Qué prueba |
|---|------|------------|
| 6 | membresía con datos del plan | Retorna todos los campos incluyendo plan_nombre, tokens_restantes, precio |
| 7 | null si no hay membresía | No hay datos → null |
| 8 | null si hay error en la consulta | Error → null |
| 9 | PAGOS-MEMB-NULL-001 | Plan es null: plan_nombre = "Sin plan", precio = 0, tokens_mensuales = 0 |

---

## 10. `data/plans.test.ts` — 20 tests

### `getPlanes`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | retorna lista de planes | 3 planes con nombre, tokens, precio |
| 2 | array vacío si hay error | Error → `[]` |
| 3 | array vacío si no hay datos | Sin datos → `[]` |

### `getPlanesLimit`

| # | Test | Qué prueba |
|---|------|------------|
| 4 | retorna N planes | Pide 2, recibe 3 (no hay limit real en el mock, solo verifica que retorna) |
| 5 | array vacío si hay error | Error → `[]` |

### `getPlanesAdmin`

| # | Código | Qué prueba |
|---|--------|------------|
| 6 | DATA-PLANES-ADMIN-001 | Fetch exitoso → `{ planes: [...], error: undefined }` |
| 7 | DATA-PLANES-ADMIN-002 | Fetch 403 → `{ planes: [], error: "No autorizado" }` |
| 8 | DATA-PLANES-ADMIN-003 | Fetch 500 sin cuerpo → `{ planes: [], error: "Error de conexión" }` |

### `createPlanAdmin`

| # | Código | Qué prueba |
|---|--------|------------|
| 9 | DATA-PLANES-CREATE-001 | Creación exitosa → `{ success: true }` |
| 10 | DATA-PLANES-CREATE-002 | Error 400 → `{ success: false, error: "..." }` |

### `updatePlanAdmin`

| # | Código | Qué prueba |
|---|--------|------------|
| 11 | DATA-PLANES-UPDATE-001 | Actualización exitosa → `{ success: true }` |
| 12 | DATA-PLANES-UPDATE-002 | Error 404 → `{ success: false, error: "..." }` |

### `deletePlanAdmin`

| # | Código | Qué prueba |
|---|--------|------------|
| 13 | DATA-PLANES-DEL-001 | Eliminación exitosa → `{ success: true }` |
| 14 | DATA-PLANES-DEL-002 | Error 404 → `{ success: false, error: "..." }` |

### `getUsers`

| # | Código | Qué prueba |
|---|--------|------------|
| 15 | DATA-GETUSERS-001 | Retorna estudiantes con membresía combinada: Alice tiene plan "Básico" con 7 tokens, Bob es "Sin plan" con 0 tokens |
| 16 | DATA-GETUSERS-002 | Sin usuarios → `[]` |
| 17 | DATA-GETUSERS-003 | Error Supabase → `[]` |
| 18 | DATA-GETUSERS-004 | Status "Activo" cuando tokens_restantes > 0, "Vencido" cuando = 0 |
| 19 | DATA-GETUSERS-005 | Mapeo de roles: jugador → "Alumno", profesor → "Profesor", administrador → "Admin" |
| 20 | DATA-GETUSERS-006 | null/undefined en rut y phone se convierten a string vacío |

---

## 11. `webhook/data.test.ts` — 18 tests

### `getHorarios24h`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | SCH-DATA-001 | Devuelve clases en ventana 24h: retorna clases con id, fecha_hora, clase_id |
| 2 | SCH-DATA-002 | Sin clases → `[]` |
| 3 | SCH-DATA-003 | Tabla sin datos → `[]` |

### `getHorariosPasados`

| # | Código | Qué prueba |
|---|--------|------------|
| 4 | SCH-DATA-004 | Devuelve clases pasadas (fecha_hora < ahora) |
| 5 | SCH-DATA-005 | Sin clases pasadas → `[]` |

### `getHorariosPasados1h`

| # | Código | Qué prueba |
|---|--------|------------|
| 6 | SCH-DATA-006 | Devuelve clases hace más de 1h |
| 7 | SCH-DATA-007 | Sin clases → `[]` |

### `getInscripcionesSinConfirmar`

| # | Código | Qué prueba |
|---|--------|------------|
| 8 | SCH-DATA-008 | Devuelve inscripciones sin confirmar para una clase |
| 9 | SCH-DATA-009 | Sin inscripciones → `[]` |

### `setPendiente`

| # | Código | Qué prueba |
|---|--------|------------|
| 10 | SCH-DATA-010 | True si actualizó correctamente (row devuelta por select) |
| 11 | SCH-DATA-011 | False si no actualizó (select devuelve null) |
| 12 | SCH-DATA-012 | False si ya no está sin_confirmar (select devuelve null porque el update filtró) |

### `actualizarPorClaseYEstado`

| # | Código | Qué prueba |
|---|--------|------------|
| 13 | SCH-DATA-013 | Actualiza pendiente → cancelado_sin_reembolso sin errores |
| 14 | SCH-DATA-014 | Actualiza confirmado_whatsapp → no_asistio sin errores |

### `getClase`

| # | Código | Qué prueba |
|---|--------|------------|
| 15 | SCH-DATA-015 | Retorna título de la clase |
| 16 | SCH-DATA-016 | Clase no existe → null |

### `getUsuario`

| # | Código | Qué prueba |
|---|--------|------------|
| 17 | SCH-DATA-017 | Retorna nombre y teléfono del usuario |
| 18 | SCH-DATA-018 | Usuario no existe → null |

---

## 12. `webhook/handlers.test.ts` — 33 tests

### `horasHasta`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | horas positivas para fecha futura | 3 horas en el futuro → 3 |
| 2 | horas negativas para fecha pasada | 3 horas en el pasado → -3 |
| 3 | 0 para el mismo instante | Misma fecha → 0 |
| 4 | fracción para minutos | 30 minutos → 0.5 |

### `confirmarAsistencia`

| # | Test | Qué prueba |
|---|------|------------|
| 5 | mensaje si no hay próximas clases | `getProximaClaseUsuario` devuelve null → "No tienes clases próximas agendadas." |
| 6 | mensaje si falta menos de 1 hora | 0.5h → "Ya no alcanzas a confirmar, la clase empieza en menos de 1 hora." |
| 7 | permite confirmar con exactamente 1 hora (borde) | 1h exacta → permite confirmar |
| 8 | éxito si confirma correctamente | "✅ Asistencia confirmada! Nos vemos en \"Entrenamiento Funcional\"." |
| 9 | error si confirmarAsistencia falla | `confirmarAsistencia` retorna false → "Error al confirmar. Intentalo de nuevo." |
| 10 | rechaza si falta 0.999 horas (borde inferior) | 0.999h < 1h → no permite confirmar |

### `cancelarAsistencia`

| # | Test | Qué prueba |
|---|------|------------|
| 11 | mensaje si no hay próximas clases | "No tenés clases próximas agendadas." |
| 12 | cancela con reembolso si faltan >= 3 horas | 5h → cancelado + devolución de token |
| 13 | cancela con reembolso si faltan exactamente 3 horas (borde) | 3h exactas → cancelado + devolución |
| 14 | cancela sin reembolso si faltan menos de 3 horas | 1h → cancelado_sin_reembolso, sin devolución |
| 15 | responde igual aunque updateAsistencia falle silenciosamente | update false + devolverToken true → mensaje de éxito igual |
| 16 | responde distinto si devolverToken falla | update true + devolverToken false → "No se pudo devolver el token" |
| 17 | cancela sin reembolso si faltan 2.999 horas (borde inferior) | 2.999h < 3h → sin reembolso |
| 18 | intenta devolverToken aunque updateAsistencia falle (>= 3h) | update false + devolverToken true → igual intenta devolver |
| 19 | avisa si update y devolverToken fallan ambos | Ambos false → "No se pudo devolver el token" |

### `procesarMensajeWhatsApp`

| # | Código | Qué prueba |
|---|--------|------------|
| 20 | retorna null si usuario no registrado | Silencio total: no busca clases, no procesa nada |
| 21 | confirma asistencia con '1' | Mensaje "1" → confirma |
| 22 | cancela asistencia con '2' | Mensaje "2" → cancela |
| 23 | retorna null para mensaje desconocido | "HOLA" → null (sin respuesta) |
| 24 | busca usuario con teléfono sin + | Teléfono sin prefijo + |
| 25 | tolera espacios alrededor del texto | "  1  " → reconoce como "1" |
| 26 | tolera minúsculas | "1" en minúscula funciona igual |
| 27 | BOT-RESP-006: si manda otro texto teniendo clase pendiente, recuerda opciones | Texto no-1/2 con clase pendiente → "Para confirmar... responde *1*, para cancelar... *2*" |
| 28 | BOT-RESP-007: si manda otro texto sin clase pendiente, no responde | Texto no-1/2 sin clase → null |
| 29 | BOT-RESP-001: retorna null si no hay clases pendientes ni actionadas | "1" o "2" sin clases → null |
| 30 | BOT-RESP-002: avisa si la clase ya fue cancelada desde la web | "Ya cancelaste 'Spinning' desde la página web" |
| 31 | BOT-RESP-003: avisa si la clase ya fue confirmada desde la web | "Ya confirmaste 'Yoga' desde la página web. Nos vemos allí." |
| 32 | BOT-RESP-004: detecta cancelado_sin_reembolso como cancelación previa | Asistencia "cancelado_sin_reembolso" → "Ya cancelaste" |
| 33 | BOT-RESP-005: flujo normal sigue funcionando si hay clase pendiente | No llama a getProximaClaseUsuarioActioned si hay clase pendiente |

---

## 13. `api/clases/cancelar.test.ts` — 17 tests

### `POST /api/clases/cancelar`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | API-CLASES-CAN-001 | 401 si no está autenticado |
| 2 | API-CLASES-CAN-002 | 400 si faltan parámetros (inscripcionId, fechaHora) |
| 3 | API-CLASES-CAN-003 | 500 si falta SUPABASE_SERVICE_ROLE_KEY |
| 4 | API-CLASES-CAN-004 | Success false si la clase ya pasó (fecha pasada) |
| 5 | API-CLASES-CAN-005 | Cancela con >= 3h y devuelve token (entrenamiento) |
| 6 | API-CLASES-CAN-006 | Cancela con >= 3h sin devolver token (partido) |
| 7 | API-CLASES-CAN-007 | Cancela con >= 3h pero RPC falla (mensaje informativo igual) |
| 8 | API-CLASES-CAN-008 | Cancela con < 3h sin reembolso |
| 9 | API-CLASES-CAN-009 | Cancela partido con < 3h |
| 10 | API-CLASES-CAN-010 | Rechaza si ya está cancelado |
| 11 | API-CLASES-CAN-011 | Rechaza si ya está presente |
| 12 | API-CLASES-CAN-012 | Rechaza si ya está ausente |
| 13 | API-CLASES-CAN-013 | 404 si la inscripción no existe |
| 14 | API-CLASES-CAN-014 | Error al actualizar inscripción retorna success igual (update falla silenciosamente) |
| 15 | API-CLASES-CAN-015 | Rechaza si ya está cancelado_sin_reembolso |
| 16 | API-CLASES-CAN-016 | Rechaza si ya asistio |
| 17 | API-CLASES-CAN-017 | Rechaza si ya no_asistio |

---

## 14. `api/clases/inscribir.test.ts` — 14 tests

### `POST /api/clases/inscribir`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | API-CLASES-INS-001 | 401 si no está autenticado |
| 2 | API-CLASES-INS-002 | 400 si falta claseId |
| 3 | API-CLASES-INS-003 | 404 si clase no existe |
| 4 | API-CLASES-INS-004 | 500 si falta SUPABASE_SERVICE_ROLE_KEY |
| 5 | API-CLASES-INS-005 | 400 si la clase está llena (cupos excedidos) |
| 6 | API-CLASES-INS-006 | Inscribe a partido correctamente (no requiere token) |
| 7 | API-CLASES-INS-007 | Inscribe a entrenamiento primera vez (requiere membresía) |
| 8 | API-CLASES-INS-008 | 409 si ya está inscrito (error 23505) |
| 9 | API-CLASES-INS-009 | 400 si hay error genérico en inserción |
| 10 | API-CLASES-INS-010 | Re-inscripción a partido cancelado exitosa (UPDATE en lugar de INSERT) |
| 11 | API-CLASES-INS-011 | Re-inscripción a partido cancelado_sin_reembolso exitosa |
| 12 | API-CLASES-INS-012 | Re-inscripción a entrenamiento con membresía válida |
| 13 | API-CLASES-INS-013 | Re-inscripción a entrenamiento sin membresía activa → 400 |
| 14 | API-CLASES-INS-014 | Re-inscripción a entrenamiento sin tokens disponibles → 400 |

---

## 15. `api/flow/cancel-recurrence.test.ts` — 3 tests

### `POST /api/flow/cancel-recurrence`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | 401 si no hay usuario autenticado | No hay sesión → 401 |
| 2 | 200 si no hay suscripción activa | `recurrencia` no existe → "No tienes una suscripción activa" |
| 3 | cancela suscripción activa exitosamente | `activa: true` → se desactiva → "Suscripción cancelada" |

---

## 16. `api/flow/cancel.test.ts` — 7 tests

### `POST /api/flow/cancel`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | 400 si falta boletaId | Body vacío → "boletaId requerido" |
| 2 | 404 si la boleta no existe | No hay registro → "Boleta no encontrada" |
| 3 | 403 si la boleta no pertenece al usuario | `usuario_id` distinto → "No autorizado" |
| 4 | 200 con estado anulado si estaba pendiente | pendiente → se anula |
| 5 | no modifica boleta ya pagada | pagado → mensaje "No requiere cancelación" |
| 6 | no modifica boleta ya anulada | anulado → mensaje "No requiere cancelación" |
| 7 | 500 si la actualización falla | Error en update → mensaje de error |

---

## 17. `api/flow/confirm.test.ts` — 17 tests

### `GET /api/flow/confirm`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | — | 400 si falta boletaId |
| 2 | — | 404 si la boleta no existe |
| 3 | — | Estado pagado si Flow aprueba (status=2) y boleta estaba pendiente |
| 4 | — | Estado rechazado si Flow no aprueba (status !== 2) |
| 5 | — | 403 si commerceOrder no coincide con boletaId |
| 6 | — | Pendiente si getFlowPaymentStatus lanza error (sandbox fallback) |
| 7 | — | Pagado si la boleta ya estaba pagada en Supabase |
| 8 | — | Pagado cuando token es literal `{token}` pero boleta ya está pagada |
| 9 | — | Pendiente cuando token es `{token}` y boleta no está pagada |
| 10 | — | Llama a getFlowPaymentStatus con el token real |
| 11 | — | Actualiza boleta a pagado cuando Flow confirma |
| 12 | — | Pagado sin llamar a Flow si token es `{token}` y boleta ya pagada |
| 13 | CONFIRM-024 | Rechazado si boleta está rechazada en Supabase (sin token real) |
| 14 | CONFIRM-025 | Anulado si boleta está anulada en Supabase (sin token real) |
| 15 | CONFIRM-026 | Rechazado en fallback tras error de Flow API si boleta está rechazada |
| 16 | CONFIRM-027 | Anulado en fallback tras error de Flow API si boleta está anulada |
| 17 | CONFIRM-023 | Atomic guard: update con `estado=pendiente` no afecta si otro request ya pagó la boleta |

---

## 18. `api/flow/create-order.test.ts` — 16 tests

### `POST /api/flow/create-order`

**Validaciones de entrada:**

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | — | 401 si no hay usuario autenticado |
| 2 | — | 400 si falta planId |
| 3 | — | 404 si el usuario no existe en tabla usuario |
| 4 | — | 404 si el plan no existe |
| 5 | — | 409 si el usuario ya tiene membresía activa en el mes actual |
| 6 | API-FLOW-CREATE-022 | 409 aunque la membresía activa sea de distinto plan |
| 7 | — | Permite comprar si la membresía anterior está vencida |

**Flujo exitoso:**

| # | Test | Qué prueba |
|---|------|------------|
| 8 | 200 con url, token y boletaId en éxito sin recurrencia | Respuesta completa |
| 9 | Llama a createFlowOrder con parámetros correctos | commerceOrder, subject, amount, email, paymentMethod |
| 10 | 200 y crea recurrencia si se solicita | `recurrencia: true` → recurrence: { period: 30 } |

**Verificación de URLs:**

| # | Test | Qué prueba |
|---|------|------------|
| 11 | urlReturn apunta a dashboard | `http://localhost:3000/dashboard?flowSuccess=1` |
| 12 | urlConfirmation incluye BASE_URL y boletaId | Contiene NEXT_PUBLIC_BASE_URL y `/api/flow/webhook?boletaId=...` |

**flow_confirmada:**

| # | Test | Qué prueba |
|---|------|------------|
| 13 | Se crea boleta con flow_confirmada=false inicialmente | Valor por defecto |

**Rate limiting:**

| # | Test | Qué prueba |
|---|------|------------|
| 14 | Se reestablece después de la ventana de tiempo | Reset entre tests |

**Manejo de errores:**

| # | Test | Qué prueba |
|---|------|------------|
| 15 | 502 si Flow falla y hace rollback | Elimina boleta y boleta_item |
| 16 | 502 y hace rollback si flowOrder falla con recurrencia | Elimina boleta, item y recurrencia |

---

## 19. `api/flow/webhook.test.ts` — 25 tests

### `POST /api/flow/webhook`

**Validaciones:**

| # | Test | Qué prueba |
|---|------|------------|
| 1 | 400 si falta token | `token` requerido |
| 2 | 400 si content-type no es soportado | Solo JSON y form-urlencoded |

**Procesamiento de pago:**

| # | Test | Qué prueba |
|---|------|------------|
| 3 | Marca boleta pagada si status=2 (form-urlencoded) | Content-Type form-urlencoded |
| 4 | Marca boleta pagada si status=2 (JSON) | Content-Type JSON |
| 5 | 404 si la boleta no existe | BoletaId no encontrado |
| 6 | Procesa boleta pendiente con datos completos | Todos los campos mapeados |
| 7 | Marca rechazada si status=3 | Flow rechazó el pago |
| 8 | Marca rechazada si status=4 | Flow rechazó el pago (otro código) |

**Recurrencia:**

| # | Test | Qué prueba |
|---|------|------------|
| 9 | Crea nueva boleta para cobro recurrente si recurrencia activa | Recurrencia activa → nueva boleta + item |
| 10 | No crea nueva boleta si recurrencia no está activa | recurrencia.activa = false |

**Fallback sandbox:**

| # | Test | Qué prueba |
|---|------|------------|
| 11 | Usa datos del POST body como fallback si getFlowPaymentStatus falla | Cae en try/catch y usa datos del body |
| 12 | OK sin procesar si falla getFlowPaymentStatus y faltan datos POST | No hay suficientes datos en el body |

**Creación de membresía:**

| # | Test | Qué prueba |
|---|------|------------|
| 13 | Crea membresía automáticamente si plan tiene tokens | Pago exitoso + plan con tokens → createMembresia |
| 14 | No crea membresía si tokens_mensuales es 0 | Plan sin tokens → no createMembresia |
| 15 | No rompe el webhook si falla la creación de membresía | Error en createMembresia → el webhook sigue respondiendo OK |
| 16 | WEB-020: Salta creación si ya existe membresía para esta boleta (pago normal) | Idempotencia en pago normal |
| 17 | WEB-021: Salta creación si ya existe membresía para esta boleta (cobro recurrente) | Idempotencia en cobro recurrente |
| 18 | WEB-022: No rompe el webhook si el usuario ya tiene membresía activa (distinta boleta) | Usuario con membresía activa previa → webhook responde OK (constraint DB evita duplicados) |

**Rechazo de recurrencia:**

| # | Test | Qué prueba |
|---|------|------------|
| 19 | Desactiva recurrencia cuando pago recurrente es rechazado (status 3) | `activa: false` |
| 20 | Desactiva recurrencia cuando pago recurrente es rechazado (status 4) | `activa: false` |

**Fallback sandbox (URL):**

| # | Test | Qué prueba |
|---|------|------------|
| 21 | Usa boletaId desde la URL como fallback | Sandbox: si getFlowPaymentStatus falla, usa boletaId de query param |

**Error en producción:**

| # | Test | Qué prueba |
|---|------|------------|
| 22 | 502 si getFlowPaymentStatus falla en producción | En producción (no sandbox) → error 502 |

**Race conditions:**

| # | Código | Qué prueba |
|---|--------|------------|
| 23 | WEBHOOK-RACE-001 | Segundo webhook status=2: boleta ya pagada → retorna "Ya procesado" sin duplicar |
| 24 | WEBHOOK-RACE-002 | TOCTOU con makeSeqChain: recurrencia se desactiva durante procesamiento → anula la nueva boleta creada |
| 25 | WEBHOOK-RACE-003 | TOCTOU: makeSeqChain con datos estables para ambas lecturas → cobro recurrente exitoso |

---

## 20. `api/admin/capsulas.test.ts` — 7 tests

### `GET /api/admin/capsulas`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | Lista de cápsulas con modulo_nombre y profesor_nombre | Joins con módulo y usuario |
| 2 | `?tipo=modulos` retorna módulos para dropdown | Lista de módulos |

### `POST /api/admin/capsulas`

| # | Test | Qué prueba |
|---|------|------------|
| 3 | 400 si falta título | Validación de campo requerido |
| 4 | Crea cápsula exitosamente | Retorna id |

### `PUT /api/admin/capsulas`

| # | Test | Qué prueba |
|---|------|------------|
| 5 | 400 si falta id | Validación de campo requerido |
| 6 | Actualiza cápsula exitosamente | 200 OK |

### `DELETE /api/admin/capsulas`

| # | Test | Qué prueba |
|---|------|------------|
| 7 | Elimina cápsula exitosamente | `success: true` |

---

## 21. `api/admin/clases.test.ts` — 15 tests

### `GET /api/admin/clases`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | API-ADM-CLASES-GET-001 | 403 si no es admin (verifyAdmin null) |
| 2 | API-ADM-CLASES-GET-002 | Lista completa con joins (sede_nombre, inscritos) |
| 3 | API-ADM-CLASES-GET-003 | `?tipo=sedes` retorna lista de sedes |
| 4 | API-ADM-CLASES-GET-004 | `?tipo=asistencia-general` retorna con clase_titulo y usuario_nombre |
| 5 | API-ADM-CLASES-GET-005 | `?tipo=asistencia` sin clase_id → 400 |
| 6 | API-ADM-CLASES-GET-005 | `?tipo=asistencia` con clase_id → 200 con clase e inscripciones |

### `POST /api/admin/clases`

| # | Código | Qué prueba |
|---|--------|------------|
| 7 | API-ADM-CLASES-POST-001 | 400 si faltan campos requeridos (sede_id) |
| 8 | API-ADM-CLASES-POST-002 | Crea clase exitosamente |
| 9 | API-ADM-CLASES-POST-003 | Usa horarios[0] como fecha_hora si se provee (backward compat) |

### `PUT /api/admin/clases`

| # | Código | Qué prueba |
|---|--------|------------|
| 10 | API-ADM-CLASES-PUT-001 | 400 si falta id |
| 11 | API-ADM-CLASES-PUT-002 | Actualiza campos enviados |

### `DELETE /api/admin/clases`

| # | Código | Qué prueba |
|---|--------|------------|
| 12 | API-ADM-CLASES-DEL-001 | Elimina clase y retorna tokens_devueltos (cuenta inscripciones) |

### `PATCH /api/admin/clases`

| # | Código | Qué prueba |
|---|--------|------------|
| 13 | API-ADM-CLASES-PATCH-001 | registrar-asistencia upsert crea si no existe |
| 14 | API-ADM-CLASES-PATCH-002 | 400 para acción inválida |
| 15 | API-ADM-CLASES-PATCH-003 | 400 si faltan clase_id o usuario_id |

---

## 22. `api/admin/documentos.test.ts` — 6 tests

### `GET /api/admin/documentos`

| # | Test | Qué prueba |
|---|------|------------|
| 1 | 400 si falta capsula_id | Validación |
| 2 | Documentos por capsula_id | Lista filtrada |

### `POST /api/admin/documentos`

| # | Test | Qué prueba |
|---|------|------------|
| 3 | 400 si faltan campos requeridos | Validación |
| 4 | Crea documento exitosamente | Retorna id |

### `DELETE /api/admin/documentos`

| # | Test | Qué prueba |
|---|------|------------|
| 5 | 400 si falta id | Validación |
| 6 | Elimina documento exitosamente | `success: true` |

---

## 23. `api/admin/membresias.test.ts` — 3 tests

### `GET /api/admin/membresias`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | API-ADM-MEMBRESIAS-GET-001 | Retorna lista de membresías |
| 2 | API-ADM-MEMBRESIAS-GET-002 | 401 si no está autenticado |
| 3 | API-ADM-MEMBRESIAS-GET-003 | 403 si no es admin/profesor (rol jugador) |

---

## 24. `api/admin/modulos.test.ts` — 7 tests

### `GET /api/admin/modulos`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | API-ADM-MODULOS-GET-001 | Lista de módulos |

### `POST /api/admin/modulos`

| # | Código | Qué prueba |
|---|--------|------------|
| 2 | API-ADM-MODULOS-POST-001 | Crea módulo exitosamente |
| 3 | API-ADM-MODULOS-POST-002 | 400 si falta título |

### `PUT /api/admin/modulos`

| # | Código | Qué prueba |
|---|--------|------------|
| 4 | API-ADM-MODULOS-PUT-001 | Actualiza módulo exitosamente |
| 5 | API-ADM-MODULOS-PUT-002 | 400 si falta id |

### `DELETE /api/admin/modulos`

| # | Código | Qué prueba |
|---|--------|------------|
| 6 | API-ADM-MODULOS-DEL-001 | Elimina módulo exitosamente |
| 7 | API-ADM-MODULOS-DEL-002 | 400 si falta id |

---

## 25. `api/admin/planes.test.ts` — 20 tests

### `GET /api/admin/planes`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | API-ADM-PLANES-GET-001 | Lista de planes |
| 2 | API-ADM-PLANES-GET-002 | 403 si no hay usuario autenticado |
| 3 | API-ADM-PLANES-GET-003 | 403 si el usuario no es administrador |
| 4 | API-ADM-PLANES-GET-004 | 500 si hay error de base de datos |
| 5 | API-ADM-PLANES-GET-005 | Array vacío si no hay planes |

### `POST /api/admin/planes`

| # | Código | Qué prueba |
|---|--------|------------|
| 6 | API-ADM-PLANES-POST-001 | Crea plan exitosamente |
| 7 | API-ADM-PLANES-POST-002 | 400 si falta nombre |
| 8 | API-ADM-PLANES-POST-003 | 400 si falta precio |
| 9 | API-ADM-PLANES-POST-004 | 403 si no está autenticado |
| 10 | API-ADM-PLANES-POST-005 | tokens_mensuales=1 por defecto si no se envía |
| 11 | API-ADM-PLANES-POST-006 | 403 si no es administrador |

### `PUT /api/admin/planes`

| # | Código | Qué prueba |
|---|--------|------------|
| 12 | API-ADM-PLANES-PUT-001 | Actualiza plan exitosamente |
| 13 | API-ADM-PLANES-PUT-002 | 400 si falta id |
| 14 | API-ADM-PLANES-PUT-003 | 403 si no está autenticado |
| 15 | API-ADM-PLANES-PUT-004 | Actualiza solo los campos enviados |
| 16 | API-ADM-PLANES-PUT-005 | 403 si no es administrador |

### `DELETE /api/admin/planes`

| # | Código | Qué prueba |
|---|--------|------------|
| 17 | API-ADM-PLANES-DEL-001 | Elimina plan exitosamente |
| 18 | API-ADM-PLANES-DEL-002 | 400 si falta id |
| 19 | API-ADM-PLANES-DEL-003 | 403 si no está autenticado |
| 20 | API-ADM-PLANES-DEL-004 | 403 si no es administrador |

---

## 26. `api/admin/profesores.test.ts` — 9 tests

### `GET /api/admin/profesores`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | API-ADM-PROFESORES-GET-001 | Lista de profesores con joins (usuario + profesor) |

### `POST /api/admin/profesores`

| # | Código | Qué prueba |
|---|--------|------------|
| 2 | API-ADM-PROFESORES-POST-001 | 400 si falta email |
| 3 | API-ADM-PROFESORES-POST-002 | Crea profesor exitosamente (usuario + profesor) |
| 4 | API-ADM-PROFESORES-POST-003 | 409 si el usuario ya existe como profesor |

### `PUT /api/admin/profesores`

| # | Código | Qué prueba |
|---|--------|------------|
| 5 | API-ADM-PROFESORES-PUT-001 | Actualiza profesor exitosamente |
| 6 | API-ADM-PROFESORES-PUT-002 | 400 si falta id |

### `DELETE /api/admin/profesores`

| # | Código | Qué prueba |
|---|--------|------------|
| 7 | API-ADM-PROFESORES-DEL-001 | Elimina profesor y su usuario |
| 8 | API-ADM-PROFESORES-DEL-002 | 400 si falta id |
| 9 | API-ADM-PROFESORES-DEL-003 | 404 si profesor no existe |

---

## 27. `api/admin/students.test.ts` — 3 tests

### `POST /api/admin/students`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | API-ADM-STUDENTS-POST-001 | Crea estudiante exitosamente (Auth + BD) |
| 2 | API-ADM-STUDENTS-POST-002 | 400 si faltan campos requeridos (nombre) |
| 3 | API-ADM-STUDENTS-POST-003 | 400 si rol es inválido (no acepta "administrador") |

---

## 28. `api/admin/upload.test.ts` — 3 tests

### `POST /api/admin/upload`

| # | Código | Qué prueba |
|---|--------|------------|
| 1 | API-ADM-UPLOAD-001 | Sube archivo exitosamente (JPEG) |
| 2 | API-ADM-UPLOAD-002 | 400 si no se envía archivo |
| 3 | API-ADM-UPLOAD-003 | 400 si formato no permitido (PDF no está en los permitidos) |

---

## 29. `e2e/flow-sandbox.test.ts` — 5 tests

### Flow Sandbox E2E — Library

| # | Test | Qué prueba |
|---|------|------------|
| 1 | createFlowOrder crea orden en sandbox real sin recurrencia | Llama a sandbox.flow.cl real, verifica url, token, flowOrder |
| 2 | createFlowOrder con recurrencia crea orden exitosamente | Con recurrence: { period: 30 }, verifica que también funciona |

### Flow Sandbox E2E — getPaymentStatus

| # | Test | Qué prueba |
|---|------|------------|
| 3 | getFlowPaymentStatus obtiene estado del token pendiente | Usa token de test 1, verifica status=1 (pendiente) |

### Flow Sandbox E2E — API Routes

| # | Test | Qué prueba |
|---|------|------------|
| 4 | POST /api/flow/create-order con Flow sandbox real | Ruta completa: autenticación, plan, createFlowOrder, respuesta con url |
| 5 | POST /api/flow/webhook con token real de sandbox (status=1) | Envía webhook con status=1 (pendiente), verifica que no marca pagado |

> Nota: Estos tests se ejecutan solo si existen `FLOW_API_KEY` y `FLOW_SECRET_KEY` en el entorno.

---

## Resumen por tipo

| Tipo | Archivos | Tests |
|------|----------|------:|
| **Unitarios (librerías)** | 3 | 34 |
| **Unitarios (data layer)** | 7 | 91 |
| **Webhook (scheduler + WhatsApp)** | 2 | 51 |
| **API Routes (clases)** | 2 | 31 |
| **API Routes (Flow)** | 5 | 66 |
| **API Routes (admin)** | 9 | 73 |
| **E2E** | 1 | 5 |
| **Total** | **29** | **351** |
=======
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
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
