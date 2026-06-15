# Plan de Pruebas de Software — FutPlayApp

## Framework: Vitest v3

---

## Estructura de Archivos de Prueba (Organización)

```
src/tests/
├── setup.ts                          # Config global (silencia console, importa jest-dom)
├── mocks/
│   ├── supabase.ts                   # Mock chain builder + test helpers
│   └── flow.ts                       # MSW handlers para Flow API
├── helpers/
│   └── flow.ts                       # mockPaymentStatus() factory
│
├── lib/
│   ├── flow.test.ts                  # ✅ Existente (22 tests)
│   └── bunny.test.ts                 # 📝 Nueva suite
│
├── data/
│   ├── membresia.test.ts             # ✅ Existente (12 tests)
│   ├── fichaMedica.test.ts           # ✅ Existente (10 tests)
│   ├── plans.test.ts                 # ✅ Existente (6 tests)
│   ├── pagos.test.ts                 # ✅ Existente (8 tests)
│   ├── auth.test.ts                  # 📝 Nueva suite
│   ├── clases.test.ts                # 📝 Nueva suite
│   ├── clase_usuario.test.ts         # 📝 Nueva suite
│   ├── profesor-clases.test.ts       # 📝 Nueva suite
│   ├── misclases-calendario.test.ts  # 📝 Nueva suite
│   ├── capsulas.test.ts              # 📝 Nueva suite
│   ├── capsulas-admin.test.ts        # 📝 Nueva suite
│   ├── modulos.test.ts               # 📝 Nueva suite
│   ├── profesores.test.ts            # 📝 Nueva suite
│   ├── documentos.test.ts            # 📝 Nueva suite
│   └── comentarios.test.ts           # 📝 Nueva suite
│
├── api/
│   ├── flow/
│   │   ├── create-order.test.ts      # ✅ Existente (16 tests)
│   │   ├── confirm.test.ts           # ✅ Existente (11 tests)
│   │   ├── cancel.test.ts            # ✅ Existente (7 tests)
│   │   └── webhook.test.ts           # ✅ Existente (13 tests)
│   ├── clases/
│   │   └── inscribir.test.ts         # 📝 Nueva suite
│   ├── admin/
│   │   ├── clases.test.ts            # 📝 Nueva suite
│   │   ├── capsulas.test.ts          # 📝 Nueva suite
│   │   ├── profesores.test.ts        # 📝 Nueva suite
│   │   ├── modulos.test.ts           # 📝 Nueva suite
│   │   ├── students.test.ts          # 📝 Nueva suite
│   │   ├── status.test.ts            # 📝 Nueva suite
│   │   └── upload.test.ts            # 📝 Nueva suite
│   ├── bunny/
│   │   ├── create.test.ts            # 📝 Nueva suite
│   │   ├── upload.test.ts            # 📝 Nueva suite
│   │   └── delete.test.ts            # 📝 Nueva suite
│   └── auth/
│       └── callback.test.ts          # 📝 Nueva suite
│
└── webhook/
    └── handlers.test.ts              # ✅ Existente (18 tests)
```

**Resumen**: 10 suites existentes (~157 tests) + 21 suites nuevas (~154 tests) = **~311 tests total**

---

## 1. Plan de Pruebas Detallado con Vitest

### 1.1 Pruebas de Desarrollo — Data Layer (Unitarias)

| ID | Funcionalidad Vital | Acción / Paso con Vitest | Resultado Esperado |
|-----|-------------------|--------------------------|-------------------|
| **AUTH-001** | `getCurrentUser()` — Obtener usuario autenticado | Mock `createClient()` → mock `auth.getUser()` retorna `{ user: {...} }`. Llamar `getCurrentUser()`. | `expect(result.user).not.toBeNull()`, `expect(result.error).toBeNull()` |
| **AUTH-002** | `getCurrentUser()` — Manejo de excepción | Mock `auth.getUser()` lanza error. Llamar `getCurrentUser()`. | `expect(result.user).toBeNull()`, `expect(result.error).toContain("inesperado")` |
| **AUTH-003** | `getUsuario()` — Obtener datos de tabla `usuario` por ID | `__setTableData("usuario", { id, nombre, rol })`. Llamar `getUsuario(id)`. | `expect(result).toEqual({ id, nombre, rol })` |
| **AUTH-004** | `getUsuario()` — Retorna null si no existe | `__setTableData("usuario", null, { message: "No rows" })`. | `expect(result).toBeNull()` |
| **AUTH-005** | `getUsuario()` — Manejo de excepción inesperada | Mock `supabase.from` lanza error. | `expect(result).toBeNull()` |
| **AUTH-006** | `buscarUsuarioPorTelefono()` — Búsqueda por teléfono sin `+` | `__setTableData("usuario", { id, nombre, rol })`. Llamar `buscarUsuarioPorTelefono("56912345678")`. | `expect(result).not.toBeNull()`. Verificar `.or()` con ambos formatos |
| **AUTH-007** | `buscarUsuarioPorTelefono()` — Retorna null si no existe | `__setTableData("usuario", null)`. | `expect(result).toBeNull()` |
| **AUTH-008** | `signInWithGoogle()` — Inicia OAuth con redirectTo correcto | Mock `supabase.auth.signInWithOAuth`. Llamar `signInWithGoogle()`. | `expect(options.redirectTo).toContain("/api/auth/callback")` |
| **AUTH-009** | `signInWithGoogle()` — Retorna error si falla OAuth | Mock error. | `expect(result.error).not.toBeNull()` |
| **AUTH-010** | `signOut()` — Llama a Supabase signOut | Mock `supabase.auth.signOut`. Llamar `signOut()`. | `expect(signOut).toHaveBeenCalled()` |
| **AUTH-011** | `onAuthStateChange()` — Callback se ejecuta al cambiar sesión | Mock `supabase.auth.onAuthStateChange`. Llamar `onAuthStateChange(callback)`. | `expect(subscription.unsubscribe).toBeDefined()` |
| **CLASES-001** | `getProximaClase()` — Filtra clases futuras con estados activos | `__setTableData("clase_usuario", [...] )`, anidar `clase` y `sede`. Llamar `getProximaClase(userId)`. | Verificar `.gte("clase.fecha_hora")` con ISO string, `.in("asistencia", sin_confirmar,pendiente,confirmado_whatsapp)` |
| **CLASES-002** | `getProximaClase()` — Retorna `[]` si error | `__setTableData("clase_usuario", null, { message: "Error" })`. | `expect(result).toEqual([])` |
| **CLASES-003** | `getProximaClase()` — Retorna `[]` si no hay datos | `__setTableData("clase_usuario", [])`. | `expect(result).toEqual([])` |
| **CLASES-004** | `getAllClasesConInscripcion()` — Mergea clases con inscripciones vía mapa de `clase_id` | `__setTableData("clase", [c1, c2])`, `__setTableData("clase_usuario", [{ clase_id: c1.id, asistencia: "pendiente" }])`. Llamar `getAllClasesConInscripcion(userId)`. | `expect(result[0].inscripcionId).not.toBeNull()`, `expect(result[1].inscripcionId).toBeNull()` |
| **CLASES-005** | `getAllClasesConInscripcion()` — Retorna `[]` si error en clases | `__setTableData("clase", null, { message: "Error" })`. | `expect(result).toEqual([])` |
| **CLASES-006** | `getAllClasesConInscripcion()` — Sin inscripciones retorna null en todos | `__setTableData("clase", [c1])`, `__setTableData("clase_usuario", null)`. | Cada `inscripcionId` es `null` |
| **CLASES-007** | `getAllClasesConInscripcion()` — Orden descendente por fecha_hora | Mock data con 2 fechas. Verificar orden. | `expect(result[0].fecha_hora >= result[1].fecha_hora)` |
| **CLASE_USU-001** | `confirmarAsistencia()` — Update a `confirmado_whatsapp` | `__setTableData("clase_usuario", { id: "cu-1" })`. Llamar `confirmarAsistencia("cu-1")`. | `expect(result).toBe(true)`. `.update({ asistencia: "confirmado_whatsapp" })` |
| **CLASE_USU-002** | `confirmarAsistencia()` — Retorna false si error | `__setTableData("clase_usuario", null, { message: "Error" })`. | `expect(result).toBe(false)` |
| **CLASE_USU-003** | `actualizarAsistencia()` — Cada estado del enum | Probar: `"cancelado"`, `"cancelado_sin_reembolso"`, `"asistio"`, `"no_asistio"`, `"sin_confirmar"`, `"pendiente"`. | `expect(result).toBe(true)` para cada uno |
| **CLASE_USU-004** | `actualizarAsistencia()` — Retorna false si error | Mock error. | `expect(result).toBe(false)` |
| **CLASE_USU-005** | `actualizarAsistenciaPorHorario()` — Usa `horario_id` en update | `__setTableData("clase_usuario", null)`. Llamar `actualizarAsistenciaPorHorario("h1", "sin_confirmar", "pendiente")`. | Verificar `.eq("horario_id", "h1")` y `.eq("asistencia", "sin_confirmar")`. ⚠️ Si `horario` fue eliminado, esta prueba falla indicando que la función debe eliminarse. |
| **PROF-001** | `getTodasLasClases()` — Marca `isMine=true` si profesor asociado | `__setTableData("clase", [c1(profesor_id=pid), c2(profesor_id=null)])`, `__setTableData("clase_usuario", [{ clase_id: c1.id }])`. Llamar `getTodasLasClases(pid)`. | `expect(result.find(c => c.claseId === c1.id)!.isMine).toBe(true)` |
| **PROF-002** | `getTodasLasClases()` — Filtra clases sin `fecha_hora` | `__setTableData("clase", [{ id, fecha_hora: null }])`. | `expect(result).toHaveLength(0)` |
| **PROF-003** | `getAlumnosPorClase()` — Filtra por estados de asistencia específicos | `__setTableData("clase_usuario", [cu1(asistencia:"asistio"), cu2(asistencia:"no_asistio"), cu3(asistencia:"pendiente")])`. Llamar `getAlumnosPorClase(claseId)`. | Verificar que solo incluye `asistio`, `no_asistio`, `confirmado_whatsapp`. `pendiente` debe ser excluido. |
| **PROF-004** | `getAlumnosPorClase()` — Resuelve nombres desde tabla usuario | `__setTableData("clase_usuario", [cu1])`, `__setTableData("usuario", [{ id: uid, nombre: "Juan" }])`. | `expect(result[0].nombre).toBe("Juan")` |
| **PROF-005** | `getAlumnosPorClase()` — Retorna `[]` si error en alumnos | `__setTableData("clase_usuario", null, { message: "Error" })`. | `expect(result).toEqual([])` |
| **PROF-006** | `updateAsistencia()` — Actualiza estado individual | `__setTableData("clase_usuario", { id: "cu-1" })`. Llamar `updateAsistencia("cu-1", "asistio")`. | `expect(result).toBe(true)` |
| **PROF-007** | `autoCerrarConfirmados()` — Cambia `confirmado_whatsapp` a `no_asistio` masivamente | `__setTableData("clase_usuario", null)`. Llamar `autoCerrarConfirmados(claseId)`. | Verificar `.eq("clase_id", claseId).eq("asistencia", "confirmado_whatsapp")` |
| **PROF-008** | `cerrarAsistencia()` — Lista vacía retorna true sin consulta | Llamar `cerrarAsistencia("c1", [])`. | `expect(result).toBe(true)`. Sin llamadas a DB |
| **PROF-009** | `cerrarAsistencia()` — Marca alumnos específicos como `no_asistio` | `__setTableData("clase_usuario", null)`. Llamar `cerrarAsistencia("c1", ["id1", "id2"])`. | Verificar `.in("id", [...])` y `update({ asistencia: "no_asistio" })` |
| **MEMBRESIA-001** | `getAllMembresiasConPlan()` — Retorna la membresía con más tokens_restantes por usuario | `__setTableData("membresia", [m1(tokens_usados:15), m2(tokens_usados:0)])`. `__setTableData("plan", [p1])`. | `expect(result).toHaveLength(1)`. Verificar que usa m2 (más restantes) |
| **MEMBRESIA-002** | `getAllMembresiasConPlan()` — Retorna `[]` sin membresías | `__setTableData("membresia", [])`. | `expect(result).toEqual([])` |
| **MEMBRESIA-003** | `getAdminMembresias()` — Fetch a API + parseo | Mock `globalThis.fetch` OK. Llamar `getAdminMembresias()`. | `expect(result).toHaveLength(...)` |
| **MEMBRESIA-004** | `getAdminMembresias()` — Retorna `[]` si fetch falla | Mock `res.ok = false`. | `expect(result).toEqual([])` |
| **MEMBRESIA-005** | `getAdminMembresias()` — Retorna `[]` si hay excepción | Mock `fetch` lanza Error. | `expect(result).toEqual([])` |
| **PLANS-001** | `getUsers()` — Combina usuarios + membresías, calcula status y tokens | `__setTableData("usuario", [u1])`. Mock `getAdminMembresias` retorna membresía con `tokens_restantes=10`. | `expect(result[0].tokens).toBe(10)`, `expect(result[0].status).toBe("Activo")` |
| **PLANS-002** | `getUsers()` — Mapeo de roles correcto | Mismos mocks. Verificar `jugador→Alumno`, `profesor→Profesor`, `administrador→Admin`. | `expect(result[0].role).toBe("Alumno")` |
| **PLANS-003** | `getStatus()` — Sin membresía → "Inactivo" | Llamar `getStatus(undefined)` directo. | `expect(result).toBe("Inactivo")` |
| **PLANS-004** | `getStatus()` — Tokens agotados → "Vencido" | `{ tokens_totales: 10, tokens_usados: 10 }`. | `expect(result).toBe("Vencido")` |
| **PLANS-005** | `getUsers()` — Retorna `[]` si error en usuarios | `__setTableData("usuario", null, { message: "Error" })`. | `expect(result).toEqual([])` |
| **PAGOS-001** | `getMisBoletas()` — boleta_item null se mapea a `[]` | `__setTableData("boleta", [{ id, boleta_item: null }])`. | `expect(result[0].items).toEqual([])` |
| **PAGOS-002** | `getMisBoletas()` — Orden descendente por created_at | 2 boletas. | `expect(result[0].created_at >= result[1].created_at)` |
| **FICHA-001** | `calcularEdad()` — Edad exacta en cumpleaños | `vi.setSystemTime("2026-06-15")`. `calcularEdad("2000-06-15")`. | `expect(result).toBe(26)` |
| **FICHA-002** | `calcularEdad()` — Resta 1 si aún no es cumpleaños | `vi.setSystemTime("2026-06-14")`. `calcularEdad("2000-06-15")`. | `expect(result).toBe(25)` |
| **FICHA-003** | `calcularEdad()` — Borde: 29 febrero | `vi.setSystemTime("2026-03-01")`. `calcularEdad("2000-02-29")`. | `expect(result).toBe(25)` (aún no cumple) |
| **FICHA-004** | `updateUserProfile()` — Actualiza rut y telefono | `__setTableData("usuario", { id })`. Llamar `updateUserProfile(userId, { rut: "12.345.678-9", telefono: "56912345678" })`. | `expect(result).toBe(true)`. Verificar campos en update. |
| **FICHA-005** | `getFichaMedicaByUser()` — Retorna datos completos | `__setTableData("ficha_medica", { usuario_id, peso_kg: 70, ... })`. | `expect(result).toHaveProperty("peso_kg", 70)` |
| **FICHA-006** | `getFichaMedicaByUser()` — Retorna null si no existe | `__setTableData("ficha_medica", null)`. | `expect(result).toBeNull()` |
| **CAPS-001** | `getCapsulas()` — Resuelve categoría vía módulo → categoría | Mock 3 consultas anidadas. | `expect(result[0].categoria).toBe("Defensa")` |
| **CAPS-002** | `getCapsulas()` — Módulo sin categoría → categoria="" | Mock con `categoria_id: null`. | `expect(result[0].categoria).toBe("")` |
| **CAPS-003** | `getCapsulas()` — Retorna `[]` si error en consulta principal | Mock error. | `expect(result).toEqual([])` |
| **CAPS-004** | `getCapsulas()` — coach se mapea desde `creado` | Mock data. | `expect(result[0].coach).toBe(item.creado)` |
| **CAPS-005** | `getCapsulaById()` — Retorna null si no existe | Mock `single()` con error. | `expect(result).toBeNull()` |
| **CAPS-006** | `getCapsulaById()` — Resuelve categoría correctamente | Mock cadena consultas. | `expect(result!.categoria).toBe("Ataque")` |
| **CAPS-007** | `formatDuration()` — Parseo completo | `"01:30:00"` → `"1h 30min"`, `"00:45:00"` → `"45 min"`, `null` → `"0 min"`, `"invalido"` → `"0 min"`. | Verificar cada caso |
| **CAPS_ADMIN-001** | `getCapsulasAdmin()` — Fallback si columna profesor_id no existe | Mock primer error (profesor_id), segunda query sin profesor_id. | `expect(result).toHaveLength(...)`, sin crash |
| **CAPS_ADMIN-002** | `getModulosOptions()` — Fetch a endpoint correcto | Mock `fetch`. Llamar `getModulosOptions()`. | `expect(fetch).toHaveBeenCalledWith(expect.stringContaining("?tipo=modulos"))` |
| **CAPS_ADMIN-003** | `getCapsulasAdmin()` — Mapea modulo_nombre y profesor_nombre | Mock joins. | `expect(result[0].modulo_nombre).toBe("Táctica")`, `profesor_nombre` |
| **COM-001** | `getComentariosByCapsulaId()` — Orden descendente + join usuario | `__setTableData("comentario", [c1, c2])`. Llamar función. | Verificar `.order("created_at", { ascending: false })` |
| **COM-002** | `createComentario()` — Inserta y retorna con join | `__setTableData("comentario", { id: "c1" })`. Llamar `createComentario(capsulaId, userId, "texto")`. | `expect(result).not.toBeNull()`, `expect(result!.id).toBe("c1")` |
| **COM-003** | `createComentario()` — Retorna null si error | `__setTableData("comentario", null, { message: "Error" })`. | `expect(result).toBeNull()` |
| **DOC-001** | `getDocumentosByCapsulaId()` — Retorna documentos ordenados | `__setTableData("documento", [d1, d2])`. Llamar `getDocumentosByCapsulaId(capsulaId)`. | `expect(result).toHaveLength(2)`. Orden ascendente. |
| **PROF_DATA-001** | `searchUsuarioPorEmail()` — Fetch con email codificado | Mock `fetch`. Llamar `searchUsuarioPorEmail("test@test.com")`. | URL contiene `email=test%40test.com` |
| **PROF_DATA-002** | `searchUsuarioPorEmail()` — Lanza error si fetch falla | Mock `!res.ok`. | `expect(...).rejects.toThrow()` |
| **PROF_DATA-003** | `cambiarRolAProfesor()` — PUT con rol profesor | Mock `fetch`. Llamar `cambiarRolAProfesor(id)`. | Body `{ id, rol: "profesor" }` |
| **PROF_DATA-004** | `createProfesor()` — Retorna tempPassword | Mock fetch OK con `{ tempPassword }`. | `expect(result.tempPassword).toBeDefined()` |
| **PROF_DATA-005** | `deleteProfesor()` — Retorna clases_asociadas en conflicto | Mock status 409 con `{ clases_asociadas: 3 }`. | `expect(result.clases_asociadas).toBe(3)` |
| **MOD-001** | `getModulos()` — Cuenta cápsulas por módulo | Mock fetch. Verificar lógica de conteo en respuesta. | `expect(result[0].total_capsulas).toBe(5)` |
| **MOD-002** | `deleteModulo()` — 409 si hay cápsulas asociadas | Mock fetch 409. | `expect(result.success).toBe(false)`, error contiene "cápsula" |
| **MOD-003** | `createModulo()` — Error si falta nombre | Llamar `createModulo({ nombre: "" })`. | `expect(result.success).toBe(false)` |

### 1.2 Pruebas de Desarrollo — API Routes (Integración)

| ID | Funcionalidad Vital | Acción / Paso con Vitest | Resultado Esperado |
|-----|-------------------|--------------------------|-------------------|
| **API-CLASES-INSC-001** | POST /api/clases/inscribir — Sin auth | `__setAuthUser(null)`. | `expect(res.status).toBe(401)` |
| **API-CLASES-INSC-002** | POST /api/clases/inscribir — Sin claseId | `__setAuthUser({ id: "u1" })`. Body `{}`. | `expect(res.status).toBe(400)` |
| **API-CLASES-INSC-003** | POST /api/clases/inscribir — Ya inscrito (409) | `__setTableData("clase_usuario", { id: "cu-1" })`. | `expect(res.status).toBe(409)`, `json.error` incluye "Ya estás inscrito" |
| **API-CLASES-INSC-004** | POST /api/clases/inscribir — Éxito | `__setAuthUser({ id: "u1" })`, `__setTableData("clase_usuario", { id: "new-ins" })`. | `expect(res.status).toBe(200)`, `json.inscripcionId` definido |
| **API-CLASES-INSC-005** | POST /api/clases/inscribir — Error DB retorna 400 | `__setAuthUser({ id: "u1" })`, mock insert error. | `expect(res.status).toBe(400)`, `json.error` definido |
| **API-ADM-CLASES-GET-001** | GET /api/admin/clases — 403 sin admin | Mock `verifyAdmin` → null. | `expect(res.status).toBe(403)` |
| **API-ADM-CLASES-GET-002** | GET /api/admin/clases — Retorna lista completa | Mock queries con joins. | `expect(result[0].sede_nombre).toBeDefined()`, `inscritos` ≥ 0 |
| **API-ADM-CLASES-GET-003** | GET /api/admin/clases?tipo=sedes | Mock query. | `expect(res.status).toBe(200)`, array de sedes |
| **API-ADM-CLASES-GET-004** | GET /api/admin/clases?tipo=asistencia-general | Mock queries. | `expect(result[0].clase_titulo).toBeDefined()`, `usuario_nombre` |
| **API-ADM-CLASES-GET-005** | GET /api/admin/clases?tipo=asistencia&clase_id=X | Sin clase_id → 400. Con clase_id → 200. | Ambos caminos |
| **API-ADM-CLASES-POST-001** | POST /api/admin/clases — Faltan campos | Body sin `titulo` o `sede_id`. | `expect(res.status).toBe(400)` |
| **API-ADM-CLASES-POST-002** | POST /api/admin/clases — Creación exitosa | Body completo. | `expect(res.status).toBe(200)` |
| **API-ADM-CLASES-POST-003** | POST /api/admin/clases — soporte legacy `horarios[0]` | Body con `horarios: ["2026-01-01T12:00"]` (sin `fecha_hora`). | `fecha_hora` se setea desde horarios[0] |
| **API-ADM-CLASES-PUT-001** | PUT /api/admin/clases — Sin id → 400 | Body `{}`. | `expect(res.status).toBe(400)` |
| **API-ADM-CLASES-PUT-002** | PUT /api/admin/clases — Actualización parcial | Body `{ id, titulo: "nuevo" }`. | Solo actualiza titulo. |
| **API-ADM-CLASES-DEL-001** | DELETE /api/admin/clases?id=X — Elimina dependencias + clase | Mocks OK. | Verificar delete `clase_usuario` + `clase` |
| **API-ADM-CLASES-PATCH-001** | PATCH /api/admin/clases — Registrar asistencia upsert | Si existe: update. Si no: insert. | Ambos caminos |
| **API-ADM-CLASES-PATCH-002** | PATCH /api/admin/clases — Acción inválida | Body `{ accion: "otra" }`. | `expect(res.status).toBe(400)` |
| **API-ADM-CLASES-PATCH-003** | PATCH /api/admin/clases — Faltan campos en registrar-asistencia | Body `{ accion: "registrar-asistencia" }` sin `clase_id`/`usuario_id`. | `expect(res.status).toBe(400)` |
| **API-ADM-PROF-GET-001** | GET /api/admin/profesores — Cuenta clases + cápsulas | Mock joins. | `expect(result[0].total_clases).toBe(2)`, `total_capsulas` |
| **API-ADM-PROF-GET-002** | GET /api/admin/profesores?tipo=buscar&email=X — Filtra y excluye admin/profesor | Mock 3 usuarios: jugador, profesor, admin. | `expect(result).toHaveLength(1)` (solo jugador) |
| **API-ADM-PROF-GET-003** | GET /api/admin/profesores?tipo=buscar — email < 3 chars | `email: "ab"`. | `expect(res.status).toBe(400)` |
| **API-ADM-PROF-GET-004** | GET /api/admin/profesores?tipo=dropdown — Solo rol profesor | Mock query. | `expect(res.status).toBe(200)` |
| **API-ADM-PROF-POST-001** | POST /api/admin/profesores — Email duplicado en usuario → 409 | `__setTableData("usuario", { email })`. | `expect(res.status).toBe(409)` |
| **API-ADM-PROF-POST-002** | POST /api/admin/profesores — Email duplicado en auth.users → 409 | Mock `listUsers` con match. | `expect(res.status).toBe(409)` |
| **API-ADM-PROF-POST-003** | POST /api/admin/profesores — Creación exitosa con tempPassword | Mock todas OK. | `expect(res.status).toBe(200)`, `json.tempPassword` definido |
| **API-ADM-PROF-POST-004** | POST /api/admin/profesores — Rollback: deleteUser si falla insert usuario | Mock insert error. Verificar `admin.deleteUser` llamado. | Limpieza de auth user huérfano |
| **API-ADM-PROF-POST-005** | POST /api/admin/profesores — minuscula+trim en email | Body con `email: "  TEST@TEST.COM  "`. | `expect(email insertado).toBe("test@test.com")` |
| **API-ADM-PROF-PUT-001** | PUT /api/admin/profesores — Cambiar rol jugador→profesor | `__setTableData("usuario", { rol: "jugador" })`. Body `{ id, rol: "profesor" }`. | `expect(res.status).toBe(200)` |
| **API-ADM-PROF-PUT-002** | PUT /api/admin/profesores — Rechazar si no es jugador | `__setTableData("usuario", { rol: "profesor" })`. | `expect(res.status).toBe(400)`, "Solo se puede cambiar a profesor desde el rol jugador" |
| **API-ADM-PROF-PUT-003** | PUT /api/admin/profesores — Sin campos → 400 | Body `{ id }`. | `expect(res.status).toBe(400)` |
| **API-ADM-PROF-PUT-004** | PUT /api/admin/profesores — Rol inválido | Body `{ id, rol: "admin" }`. | `expect(res.status).toBe(400)` |
| **API-ADM-PROF-DEL-001** | DELETE /api/admin/profesores?id=X — 409 si tiene dependencias | Mock count > 0. | `expect(res.status).toBe(409)`, `json.clases_asociadas` |
| **API-ADM-PROF-DEL-002** | DELETE /api/admin/profesores?id=X — Éxito sin dependencias | Mock count = 0. | `expect(res.status).toBe(200)` |
| **API-ADM-MOD-GET-001** | GET /api/admin/modulos — 403 sin admin | Mock `verifyAdmin` → null. | `expect(res.status).toBe(403)` |
| **API-ADM-MOD-GET-002** | GET /api/admin/modulos — Retorna módulos con cápsulas count | Mock queries. | `expect(result[0].total_capsulas).toBe(3)` |
| **API-ADM-MOD-GET-003** | GET /api/admin/modulos?tipo=categorias | Mock query. | `expect(res.status).toBe(200)` |
| **API-ADM-MOD-POST-001** | POST /api/admin/modulos — Sin nombre → 400 | Body `{}`. | `expect(res.status).toBe(400)` |
| **API-ADM-MOD-POST-002** | POST /api/admin/modulos — Creación exitosa | Body `{ nombre: "Táctica" }`. | `expect(res.status).toBe(200)` |
| **API-ADM-MOD-DEL-001** | DELETE /api/admin/modulos?id=X — 409 si tiene cápsulas | Mock count 5. | `expect(res.status).toBe(409)`, error contiene "cápsula" |
| **API-ADM-STU-POST-001** | POST /api/admin/students — Faltan campos | Body vacío. | `expect(res.status).toBe(400)` |
| **API-ADM-STU-POST-002** | POST /api/admin/students — Rol inválido | Body con `rol: "administrador"`. | `expect(res.status).toBe(400)` |
| **API-ADM-STU-POST-003** | POST /api/admin/students — Creación exitosa sin plan_id | Mocks OK. | `json.user` definido, `membresia: null` |
| **API-ADM-STU-POST-004** | POST /api/admin/students — Creación con plan_id (membresía automática) | Mock plan existe. | `json.membresia` definido |
| **API-ADM-STU-POST-005** | POST /api/admin/students — Rollback en falla insert usuario | Mock insert error. | Verificar deleteUser |
| **API-ADM-STU-PUT-001** | PUT /api/admin/students — Sin id → 400 | Body `{}`. | `expect(res.status).toBe(400)` |
| **API-ADM-STU-PUT-002** | PUT /api/admin/students — Sin campos → 400 | Body `{ id: "u1" }`. | `expect(res.status).toBe(400)` |
| **API-ADM-STU-DEL-001** | DELETE /api/admin/students?id=X — Éxito | Mocks OK. | Verificar delete usuario y deleteUser |
| **API-ADM-STATUS-001** | POST /api/admin/students/status — Sin auth | `__setAuthUser(null)`. | `expect(res.status).toBe(401)` |
| **API-ADM-STATUS-002** | POST /api/admin/students/status — Sin admin | `__setAuthUser({ id: "u1" })`, `__setTableData("usuario", { rol: "jugador" })`. | `expect(res.status).toBe(403)` |
| **API-ADM-STATUS-003** | POST /api/admin/students/status — Status inválido | Body `{ userId: "u1", status: "SuperActivo" }`. | `expect(res.status).toBe(400)` |
| **API-ADM-STATUS-004** | POST /api/admin/students/status — "Activo" sin membresía: crea nueva con plan más barato | `__setTableData("membresia", null)`, `__setTableData("plan", [p1])`. | Verificar insert membresía |
| **API-ADM-STATUS-005** | POST /api/admin/students/status — "Activo" sin plan disponible → 400 | `__setTableData("plan", [])`. | `expect(res.status).toBe(400)` |
| **API-ADM-STATUS-006** | POST /api/admin/students/status — "Activo": resetea tokens_usados | `__setTableData("membresia", [{ id: "m1", tokens_usados: 10, tokens_totales: 20 }])`. | Update `{ tokens_usados: 0 }` |
| **API-ADM-STATUS-007** | POST /api/admin/students/status — "Vencido": marca todos los tokens como usados | Membresía `{ tokens_totales: 20, tokens_usados: 5 }`. | Update `{ tokens_usados: 20 }` |
| **API-ADM-STATUS-008** | POST /api/admin/students/status — "Vencido" sin membresía: no hace nada | `__setTableData("membresia", [])`. | Solo 200, sin update |
| **API-ADM-STATUS-009** | POST /api/admin/students/status — "Inactivo": elimina todas las membresías | 2 membresías. | Verificar delete por usuario_id |
| **API-ADM-STATUS-010** | POST /api/admin/students/status — "Inactivo" sin membresías: no hace nada | `__setTableData("membresia", [])`. | Solo 200 |
| **API-ADM-UPLOAD-001** | POST /api/admin/upload — 403 sin admin | Mock `verifyAdmin` → null. | `expect(res.status).toBe(403)` |
| **API-ADM-UPLOAD-002** | POST /api/admin/upload — Sin archivo | FormData vacío. | `expect(res.status).toBe(400)` |
| **API-ADM-UPLOAD-003** | POST /api/admin/upload — MIME inválido | File `type: "image/svg+xml"`. | `expect(res.status).toBe(400)` |
| **API-ADM-UPLOAD-004** | POST /api/admin/upload — Archivo > 2MB | File > 2MB. | `expect(res.status).toBe(400)` |
| **API-ADM-UPLOAD-005** | POST /api/admin/upload — Crea bucket si no existe | Mock `getBucket` error, `createBucket` OK. | Verificar createBucket |
| **API-ADM-UPLOAD-006** | POST /api/admin/upload — Error al crear bucket | Mock `createBucket` error. | `expect(res.status).toBe(500)` |
| **API-ADM-UPLOAD-007** | POST /api/admin/upload — Subida exitosa + URL pública | Mocks OK. | `json.url` definido |
| **API-BUNNY-CREATE-001** | POST /api/bunny/create — Sin título | Body `{}`. | `expect(res.status).toBe(400)` |
| **API-BUNNY-CREATE-002** | POST /api/bunny/create — Error en createVideo | Mock `createVideo` lanza Error. | `expect(res.status).toBe(500)`, `json.error` |
| **API-BUNNY-CREATE-003** | POST /api/bunny/create — Éxito | Mock `createVideo({ guid: "abc-123" })`. | `expect(json.videoId).toBe("abc-123")` |
| **API-BUNNY-UPLOAD-001** | PUT /api/bunny/upload — Sin videoId | Request sin query params. | `expect(res.status).toBe(400)` |
| **API-BUNNY-UPLOAD-002** | PUT /api/bunny/upload — Error en uploadVideo | Mock `uploadVideo` lanza Error. | `expect(res.status).toBe(500)` |
| **API-BUNNY-UPLOAD-003** | PUT /api/bunny/upload — Result.success=false | Mock `uploadVideo` retorna `{ success: false, message: "err" }`. | `expect(res.status).toBe(500)` |
| **API-BUNNY-DELETE-001** | DELETE /api/bunny/delete — Sin videoId | Sin query params. | `expect(res.status).toBe(400)` |
| **API-BUNNY-DELETE-002** | DELETE /api/bunny/delete — Error en deleteVideo | Mock `deleteVideo` lanza Error. | `expect(res.status).toBe(500)` |
| **API-BUNNY-DELETE-003** | DELETE /api/bunny/delete — Éxito | Mock `deleteVideo` OK. | `expect(json.success).toBe(true)` |
| **API-AUTH-CB-001** | GET /api/auth/callback — Intercambio exitoso redirige a `/` | Request `?code=valid`. Mock `exchangeCodeForSession` sin error. | `expect(res.status).toBe(307)`, redirect a `${origin}/` |
| **API-AUTH-CB-002** | GET /api/auth/callback — Error redirige a `/login?error=auth` | Mock con error. | Redirect a `${origin}/login?error=auth` |
| **API-AUTH-CB-003** | GET /api/auth/callback — Sin code redirige a error | Request sin `?code=`. | Redirect a `${origin}/login?error=auth` |
| **API-AUTH-CB-004** | GET /api/auth/callback — Múltiples query params no rompen | Request `?code=valid&extra=1`. | Redirect a `/` |
| **API-ADM-MEMBRESIAS-001** | GET /api/admin/membresias — 401 sin auth | `__setAuthUser(null)`. | `expect(res.status).toBe(401)` |
| **API-ADM-MEMBRESIAS-002** | GET /api/admin/membresias — 403 si no es admin/profesor | `__setAuthUser({ id: "u1" })`, `__setTableData("usuario", { rol: "jugador" })`. | `expect(res.status).toBe(403)` |
| **API-ADM-MEMBRESIAS-003** | GET /api/admin/membresias — Agrupa por usuario con mayor tokens_restantes | Mock membresías duplicadas. | Verificar lógica de agrupación |

### 1.3 Pruebas de la Librería Bunny Stream

| ID | Funcionalidad Vital | Acción / Paso con Vitest | Resultado Esperado |
|-----|-------------------|--------------------------|-------------------|
| **BUNNY-001** | `createVideo()` — POST con AccessKey header | `vi.spyOn(globalThis, "fetch")`. Llamar `createVideo("Test")`. | URL `library/${id}/videos`, method POST, header `AccessKey`, body `{ title }` |
| **BUNNY-002** | `createVideo()` — Error 401 lanza excepción | Mock fetch status 401. | `expect(...).rejects.toThrow("Bunny createVideo failed: 401")` |
| **BUNNY-003** | `createVideo()` — Error 500 con mensaje | Mock fetch status 500, body "Server Error". | `expect(...).rejects.toThrow("Server Error")` |
| **BUNNY-004** | `uploadVideo()` — PUT con body binario | Mock fetch OK. Llamar `uploadVideo(videoId, buffer)`. | Method PUT, `AccessKey` header, body es ArrayBuffer |
| **BUNNY-005** | `uploadVideo()` — Error en subida | Mock fetch 400. | `expect(...).rejects.toThrow("Bunny uploadVideo failed: 400")` |
| **BUNNY-006** | `getVideo()` — Retorna BunnyVideo | Mock fetch con datos completos. | `expect(result.guid).toBe(videoId)`, `result.status` |
| **BUNNY-007** | `getVideo()` — Error 404 | Mock 404. | `expect(...).rejects.toThrow("Bunny getVideo failed: 404")` |
| **BUNNY-008** | `listVideos()` — Query params correctos | Mock fetch. Llamar `listVideos({ page: 2, search: "test" })`. | URL contiene `page=2&search=test` |
| **BUNNY-009** | `listVideos()` — Sin params: no query string | Llamar sin params. | URL no tiene `?` |
| **BUNNY-010** | `deleteVideo()` — DELETE sin body | Mock fetch OK. Llamar `deleteVideo(id)`. | method DELETE, sin excepción |
| **BUNNY-011** | `getEmbedUrl()` — URL de player | Llamar con env mock. | `expect(url).toContain("player.mediadelivery.net")` |
| **BUNNY-012** | `getConfig()` — Error si falta BUNNY_API_KEY | `vi.stubEnv("BUNNY_API_KEY", undefined)`. | `expect(createVideo(...)).rejects.toThrow("Missing BUNNY")` |
| **BUNNY-013** | `getConfig()` — Error si falta BUNNY_LIBRARY_ID | `vi.stubEnv("BUNNY_LIBRARY_ID", undefined)`. | `expect(createVideo(...)).rejects.toThrow("Missing BUNNY")` |

---

## 2. Estrategia de Pruebas de Validación y Calidad

### 2.1 Cobertura de Código (Vitest Coverage)

**Configuración** (en `vitest.config.ts`):

```ts
test: {
  coverage: {
    provider: "v8",
    reporter: ["text", "lcov", "html"],
    include: ["src/**/*.ts", "src/**/*.tsx"],
    exclude: [
      "src/tests/**",
      "src/**/*.d.ts",
      "src/**/layout.tsx",
      "src/**/page.tsx",
    ],
    thresholds: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
}
```

**Ejecución**: `npx vitest run --coverage`

**Reportes generados**: `coverage/lcov-report/index.html` (abrir en navegador para vista interactiva).

### 2.2 Validaciones de Calidad de Datos

| Aspecto | Estrategia |
|---------|-----------|
| **Idempotencia** | Cada API idempotente (cancel, confirm, status) debe probarse con llamadas múltiples: resultado idéntico |
| **Transaccionalidad** | Rutas que crean + fallan (create profesor, create student) deben verificar rollback de auth user |
| **Enums** | Cada función que recibe enum debe probar todos los valores válidos + rechazar inválidos (tipado TS ayuda, pero runtime puede recibir cualquier string) |
| **Null safety** | Cada función que recibe datos nullable de Supabase (`.maybeSingle()`) debe manejarlo sin crash. Verificar `data ?? []` en todos los mapeos |
| **Formatos de fecha** | `calcularEdad` con fake timers, `createMembresia` genera `mes` correcto (YYYY-MM-01), `formatDuration` con null/inválido |

### 2.3 Validaciones de Seguridad

| Aspecto | Pruebas Específicas |
|---------|--------------------|
| **Auth gate** | Cada route admin: 401 sin auth, 403 con rol no-admin |
| **Ownership** | Cancel route: boleta debe pertenecer al usuario autenticado. Clases: no permitir modificar inscripción de otro usuario |
| **Input validation** | Strings vacíos, `null`, tipos incorrectos en body JSON. Verificar que se rechazan antes de llegar a DB |
| **Content-Type** | Webhook route: rechazar `text/plain` |
| **File upload** | MIME types permitidos (JPG, PNG, WebP, GIF). Límite 2MB. Rechazar SVG (XSS vector) |
| **SQL Injection** | Verificar que todos los parámetros van como bind params. Los mocks de Supabase validan que se usen `.eq()`, `.in()`, etc. |

---

## 3. Tabla de Resultados, Ajustes y Mejoras (Simulación)

| ID Prueba | Resultado | Observación / Fallo Crítico | Ajuste/Mejora Técnica |
|-----------|-----------|-----------------------------|----------------------|
| **CLASE_USU-005** | ❌ Failed | `actualizarAsistenciaPorHorario()` usa campo `horario_id` que ya no existe en tabla `clase_usuario` (migración eliminó tabla `horario`) | **Eliminar función del codebase** o migrar a `clase_id`. Si no se usa en producción, marcarla como deprecada y remover en próxima iteración |
| **PROF-001** | ⚠️ Partial | `fetchProfesorClaseIds` busca en `clase_usuario` + `clase.profesor_id`. Si el profesor nunca se inscribió como alumno pero es `profesor_id` en clase, igual se marca como `isMine=true` | Ya implementado correctamente. Sin ajuste necesario |
| **PROF-003** | ✅ Passed | Filtra correctamente solo estados `asistio`, `no_asistio`, `confirmado_whatsapp` | — |
| **API-ADM-PROF-DEL-001** | ✅ Passed | 409 con conteo de clases y cápsulas asociadas | — |
| **API-ADM-STATUS-005** | ⚠️ Partial | Status "Activo" sin membresía: selecciona plan más barato. Si no hay planes, retorna 400 | **Añadir plan por defecto** "Gratuito" con 0 tokens para evitar bloqueo administrativo |
| **API-ADM-STATUS-009** | ❌ Failed | "Inactivo" elimina membresías con `.delete().eq("usuario_id", userId)`. Se pierden registros históricos de membresías | **Implementar soft-delete**: agregar columna `activa BOOLEAN DEFAULT true` en `membresia`. "Inactivo" = `UPDATE membresia SET activa = false`. "Activo" = crear nueva o reactivar |
| **API-ADM-UPLOAD-003** | ✅ Passed | Rechaza tipo SVG (previene XSS por SVG con JS malicioso) | — |
| **MEMBRESIA-001** | ✅ Passed | Retorna membresía con más tokens restantes (no la más reciente) | Comportamiento correcto: prioriza la membresía con más beneficio disponible |
| **CAPS-007** | ✅ Passed | `formatDuration` parsea todos los formatos correctamente | — |
| **PLANS-002** | ✅ Passed | Mapeo de roles correcto: `jugador→Alumno`, `profesor→Profesor` | — |
| **FICHA-003** | ✅ Passed | Borde 29 febrero manejado correctamente | — |
| **AUTH-011** | ✅ Passed | `onAuthStateChange` retorna `{ unsubscribe }` correctamente | — |

### Análisis de Mejoras por Estándar de Industria

| Estándar | Problema | Mejora |
|----------|----------|--------|
| **Usabilidad** | Modal de inscripción muestra tokens pero no valida si hay suficientes antes de enviar request | Validar `tokens_restantes > 0` en frontend Y en API antes de insertar en `clase_usuario` |
| **Seguridad** | `verifyAdmin()` confía en `auth.getUser()` + consulta a `usuario.rol`. Un atacante con JWT válido pero rol modificado en DB podría escalar | Agregar validación de claims del JWT en server-side (verificar `user_role` claim si está presente) |
| **Completitud** | `actualizarAsistenciaPorHorario()` tiene field `horario_id` que ya no existe en DB | Eliminar función y todas sus referencias. No hay调用 en producción |
| **Corrección** | `API-ADM-STATUS-004`: crear membresía con plan más barato sin verificar que `tokens_mensuales` > 0 | Validar que `plan.tokens_mensuales > 0` antes de crear membresía. Si es 0, retornar error |
| **Pertinencia** | Mocks de webhook handlers usan `horario.fecha_hora` (estructura antigua) | Actualizar `classeFutura()` en `webhook/handlers.test.ts` para reflejar `clase.fecha_hora`. Sin embargo, los handlers JS reales en `webhook/` probablemente ya usan la estructura correcta |

---

## 4. Configuración Requerida

### 4.1 Env vars para tests

```bash
# .env.test (usar vi.stubEnv en cada test)
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
FLOW_API_KEY=TEST_FLOW_API_KEY
FLOW_SECRET_KEY=TEST_FLOW_SECRET_KEY
NEXT_PUBLIC_FLOW_SANDBOX=true
NEXT_PUBLIC_BASE_URL=http://localhost:3000
BUNNY_LIBRARY_ID=123456
BUNNY_API_KEY=test-bunny-api-key
```

### 4.2 Scripts npm

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:verbose": "vitest run --reporter=verbose"
}
```

### 4.3 Mock de Supabase (existente en `src/tests/mocks/supabase.ts`)

El mock usa un **chain builder** que permite:

```ts
// En test:
__setTableData("usuario", { id: "u1", nombre: "Juan", rol: "jugador" });
__setAuthUser({ id: "u1", email: "juan@test.cl" });

// La función bajo test hace:
const { data } = await supabase.from("usuario").select("*").eq("id", userId).single();
// data = { id: "u1", nombre: "Juan", rol: "jugador" } (lo que se seteó arriba)
```

**API pública del mock:**
- `createMockServerClient()` — crea mock de Supabase
- `__resetMocks()` — resetea estado entre tests
- `__setAuthUser(user)` — setea usuario retornado por `auth.getUser()`
- `__setTableData(table, data, error?)` — setea datos mock para una tabla

---

## 5. Resumen de Cobertura

| Tipo | Suites Existentes | Tests Existentes | Suites Nuevas | Tests Nuevos | Total Tests |
|------|------------------|-----------------|---------------|-------------|-------------|
| **lib/** | 1 | 22 | 1 | 13 | 35 |
| **data/** | 4 | 36 | 10 | ~80 | ~116 |
| **api/** | 4 | 47 | 10 | ~65 | ~112 |
| **webhook/** | 1 | 18 | 0 | 0 | 18 |
| **Total** | **10** | **~123** | **21** | **~158** | **~281** |

**Cobertura estimada actual**: ~35% de líneas de código negocio
**Cobertura estimada final**: ~85% (threshold: 80% statements, 75% branches, 80% functions, 80% lines)

---

## 6. Glosario

| Término | Definición |
|---------|-----------|
| **Bollo/Ficha médica** | Registro de salud del jugador (peso, altura, IMC, grupo sanguíneo, etc.) |
| **Boleta** | Comprobante de pago generado por Flow.cl |
| **Cápsula** | Video educativo dentro del módulo e-learning, alojado en Bunny Stream |
| **Membresía** | Asignación mensual de tokens a un usuario según su plan |
| **Módulo** | Agrupación temática de cápsulas, con categoría asociada |
| **Token** | Unidad de consumo para inscribirse en una clase. Se obtienen vía plan |
| **Sede** | Lugar físico donde se imparten las clases |
| **ROL** | Jugador, Profesor o Administrador |
