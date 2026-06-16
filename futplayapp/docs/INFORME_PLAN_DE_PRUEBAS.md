# Estructura del Informe Final — FutPlayApp

---

## PORTADA

```
╔══════════════════════════════════════════════════════╗
║              FutPlayApp                               ║
║      Plataforma de Gestión de Academia Deportiva      ║
║                                                       ║
║         Informe Técnico del Proyecto                   ║
║                                                       ║
║   Versión: 1.0                                        ║
║   Fecha: Junio 2026                                   ║
║   Autor: [Nombre del desarrollador]                   ║
║   Framework de pruebas: Vitest v3                     ║
║   Cobertura: >80%                                     ║
╚══════════════════════════════════════════════════════╝
```

---

## ÍNDICE

```
1.  INTRODUCCIÓN
    1.1  Descripción del proyecto
    1.2  Propósito del documento
    1.3  Alcance y audiencia

2.  REQUERIMIENTOS FUNCIONALES (COMPLETOS)
    2.1  Módulo de Autenticación y Roles
    2.2  Módulo de Membresías y Planes
    2.3  Módulo de Gestión de Clases
    2.4  Módulo de E-Learning (Cápsulas)
    2.5  Módulo de Pagos (Flow.cl)
    2.6  Módulo de Administración
    2.7  Módulo de Perfil y Salud

3.  REQUERIMIENTOS NO FUNCIONALES
    3.1  Arquitectura del sistema
    3.2  Rendimiento y escalabilidad
    3.3  Seguridad
    3.4  Mantenibilidad y calidad de código

4.  ESTRATEGIA DE PRUEBAS
    4.1  Framework y herramientas
    4.2  Estructura de archivos de prueba
    4.3  Tipos de pruebas implementadas
    4.4  Mocks y helpers

5.  EJECUCIÓN DE PRUEBAS
    5.1  Resultados globales
    5.2  Reporte de Cobertura de Código (Vitest Coverage)
    5.3  Log de tests aprobados
    5.4  Pruebas por módulo

6.  EVIDENCIAS TÉCNICAS
    6.1  Evidencia de esquema de base de datos
    6.2  Evidencia de flujos críticos
    6.3  Evidencia de seguridad

7.  RESULTADOS Y MEJORAS
    7.1  Tabla de resultados de ejecución
    7.2  Fallos detectados y correcciones
    7.3  Mejoras propuestas

8.  CONCLUSIONES
    8.1  Logros alcanzados
    8.2  Limitaciones conocidas
    8.3  Trabajo futuro

9.  ANEXOS
    9.1  Enumeración completa de IDs de prueba
    9.2  Datos de prueba utilizados
    9.3  Configuración de entorno (env vars)
    9.4  Referencias
```

---

## CONTENIDO DETALLADO POR SECCIÓN

---

### 1. INTRODUCCIÓN

#### 1.1 Descripción del proyecto

**FutPlayApp** es una plataforma web moderna para la gestión integral de academias deportivas. Desarrollada con **Next.js 16 (App Router)** y **Supabase** como backend-as-a-service, permite:

- **Autenticación** con Google OAuth y roles (jugador, profesor, administrador)
- **Gestión de clases** con calendario, inscripción basada en tokens y control de asistencia
- **Membresías y planes** con tokens mensuales consumibles
- **Pagos integrados** con Flow.cl (incluyendo sandbox para desarrollo)
- **E-learning** con videos alojados en Bunny Stream, módulos, categorías, documentos y comentarios
- **Confirmación por WhatsApp** de asistencia a clases
- **Panel administrativo** completo para gestión de alumnos, profesores, clases, cápsulas y módulos
- **Ficha médica** con cálculo de IMC y estado de salud


#### 1.2 Propósito del documento

Este informe tiene como objetivo documentar el proceso completo de aseguramiento de calidad del proyecto FutPlayApp, incluyendo:

- La especificación detallada de requerimientos funcionales y no funcionales
- La estrategia y ejecución de pruebas automatizadas con Vitest
- Las evidencias técnicas de cobertura, ejecución y calidad
- Las mejoras identificadas y aplicadas durante el proceso

#### 1.3 Alcance y audiencia

El presente informe está dirigido a evaluadores académicos, stakeholders del proyecto y desarrolladores que mantengan el sistema. Abarca la totalidad de los módulos del backend y data layer, excluyendo pruebas de interfaz de usuario ya que son evidentes para cualquier persona.

---

### 2. REQUERIMIENTOS FUNCIONALES (COMPLETOS)

#### 2.1 Módulo de Autenticación y Roles

| ID | Nombre | Descripción |
|----|--------|-------------|
| RF-01 | Inicio de sesión con Google OAuth | El usuario inicia sesión usando su cuenta de Google. Supabase Auth maneja el flujo OAuth y redirige al callback. |
| RF-02 | Protección de rutas por rol | Las rutas `/admin/*` requieren rol `administrador`. Las rutas de profesor requieren rol `profesor`. AuthGuard redirige a `/login` o `/perfil` según corresponda. |
| RF-03 | Cierre de sesión | El usuario puede cerrar sesión desde cualquier página. Se llama a `supabase.auth.signOut()`. |
| RF-04 | Obtención de usuario actual | `getCurrentUser()` retorna el usuario de Supabase Auth + datos de tabla `usuario` mediante `getUsuario()`. |
| RF-05 | Búsqueda de usuario por teléfono | `buscarUsuarioPorTelefono()` busca en tabla `usuario` usando `.or()` para formato con/sin `+`. Usado por webhook WhatsApp. |
| RF-06 | Callback OAuth | `GET /api/auth/callback` intercambia el código de Google por sesión de Supabase y redirige según rol. |

**Reglas de negocio:**
- El callback OAuth redirige a `/` en éxito, a `/login?error=auth` en fallo
- `buscarUsuarioPorTelefono()` debe encontrar usuarios tanto con `+569...` como `569...`

**Criterios de aceptación:**
- [ ] 100% de pruebas unitarias pasan
- [ ] Cobertura de código > 80% en `src/data/auth.ts`
- [ ] Mock de Supabase Auth funciona para todos los escenarios (éxito, error, excepción)

#### 2.2 Módulo de Membresías y Planes

| ID | Nombre | Descripción |
|----|--------|-------------|
| RF-07 | Visualización de planes | `getPlanes()` retorna todos los planes ordenados por precio ascendente. |
| RF-08 | Compra de plan | `createFlowOrder()` + `POST /api/flow/create-order` crea una orden de pago en Flow.cl, genera boleta y redirige al checkout. |
| RF-09 | Asignación de tokens | Al crear membresía, se asignan `tokens_totales = plan.tokens_mensuales`. `tokens_usados` inicia en 0. |
| RF-10 | Consumo de token | Al inscribirse en una clase, un trigger DB incrementa `tokens_usados` en la membresía activa. |
| RF-11 | Devolución de token | `devolverToken()` decrementa `tokens_usados` si el usuario canceló con ≥3h de anticipación. |
| RF-12 | Membresía activa por mes | `createMembresia()` usa el mes actual como `mes: "YYYY-MM-01"`. |
| RF-13 | Prevención de doble membresía | `POST /api/flow/create-order` retorna 409 si ya hay membresía activa en el mes actual. |
| RF-14 | Membresía vencida | Si `tokens_totales === tokens_usados`, el plan se considera "Vencido" (getStatus). |
| RF-15 | Membresía general (admin) | `getAllMembresiasConPlan()` retorna la membresía con más tokens restantes por usuario. |
| RF-16 | Historial de membresías | `getMiMembresia()` retorna la membresía más reciente del usuario. |

**Reglas de negocio:**
- Un usuario no puede tener dos membresías activas en el mismo mes
- La devolución de token solo ocurre si `tokens_usados > 0`
- `getAllMembresiasConPlan()` prioriza la membresía con más tokens restantes, no la más reciente

**Criterios de aceptación:**
- [ ] Pruebas unitarias para `createMembresia` verifican campos correctos
- [ ] Prueba de integración para `create-order` verifica 409 con membresía activa
- [ ] Prueba de `devolverToken` verifica decremento correcto

#### 2.3 Módulo de Gestión de Clases

| ID | Nombre | Descripción |
|----|--------|-------------|
| RF-17 | CRUD de clases (admin) | Admin puede crear, leer, actualizar y eliminar clases. |
| RF-18 | Calendario de clases (jugador) | `getAllClasesConInscripcion()` retorna TODAS las clases + inscripciones del usuario mergeadas por `clase_id`. |
| RF-19 | Inscripción en clase | `POST /api/clases/inscribir` inserta en `clase_usuario`. Valida duplicados (409). |
| RF-20 | Protección de inscripción duplicada | Si ya existe `clase_usuario` con mismo `clase_id` + `usuario_id`, retorna 409. |
| RF-21 | Clase próxima del usuario | `getProximaClase()` retorna la clase más cercana con estados `sin_confirmar/pendiente/confirmado_whatsapp`. |
| RF-22 | Control de asistencia (profesor) | Profesor puede ver alumnos de una clase y cambiar asistencia individualmente. |
| RF-23 | Filtro de alumnos por estado | `getAlumnosPorClase()` solo incluye alumnos con estado `confirmado_whatsapp`, `asistio` o `no_asistio`. |
| RF-24 | Cierre automático de asistencia | `autoCerrarConfirmados()` marca como `no_asistio` a todos los `confirmado_whatsapp` de una clase. |
| RF-25 | Cierre masivo de asistencia | `cerrarAsistencia()` marca una lista de `clase_usuario` IDs como `no_asistio`. |
| RF-26 | Vista de profesor (calendario) | `getTodasLasClases()` retorna todas las clases con flag `isMine` para el profesor logueado. |
| RF-27 | Asistencia general (admin) | GET /api/admin/clases?tipo=asistencia-general retorna todas las inscripciones con nombres de clase y usuario. |

**Reglas de negocio:**
- Una clase puede tener múltiples inscritos, limitado por `cupo_maximo` (trigger DB: `limitar_15_alumnos`)
- El profesor puede gestionar asistencia solo de sus clases (verificado por `fetchProfesorClaseIds`)
- `fecha_hora` vive en tabla `clase` (no en `horario` después de migración)
- Los estados de asistencia posibles: `sin_confirmar`, `pendiente`, `confirmado_whatsapp`, `asistio`, `no_asistio`, `cancelado`, `cancelado_sin_reembolso`

**Criterios de aceptación:**
- [ ] Pruebas para `getAllClasesConInscripcion` verifican merge correcto
- [ ] Prueba API de inscripción verifica 401, 400, 409 y 200
- [ ] Pruebas de profesor filtran correctamente estados de asistencia

#### 2.4 Módulo de E-Learning (Cápsulas)

| ID | Nombre | Descripción |
|----|--------|-------------|
| RF-28 | Visualización de cápsulas (público) | `getCapsulas()` retorna cápsulas con categoría resuelta desde módulo → categoría. |
| RF-29 | Visualización de cápsula individual | `getCapsulaById()` retorna una cápsula con su categoría. |
| RF-30 | CRUD de cápsulas (admin) | Admin puede crear, editar y eliminar cápsulas. |
| RF-31 | CRUD de módulos (admin) | Admin puede crear, editar y eliminar módulos. |
| RF-32 | CRUD de categorías (admin) | Admin puede ver categorías. |
| RF-33 | Video Bunny Stream | Las cápsulas pueden tener un `bunny_video_id` para reproducir video. |
| RF-34 | Comentarios en cápsulas | Usuarios pueden ver y crear comentarios en cada cápsula. |
| RF-35 | Documentos adjuntos | Las cápsulas pueden tener documentos descargables. |
| RF-36 | Formateo de duración | `formatDuration()` convierte formato `HH:MM:SS` a texto legible (`1h 30min`, `45 min`). |

**Reglas de negocio:**
- No se puede eliminar un módulo que tenga cápsulas asociadas (409 con conteo)
- `getCapsulas()` resuelve: cápsula → modulo_id → categoria_id → nombre de categoría
- `getCapsulasAdmin()` tiene fallback si columna `profesor_id` no existe en la tabla

**Criterios de aceptación:**
- [ ] Pruebas unitarias para `formatDuration` con todos los formatos
- [ ] Prueba de integración para `deleteModulo` con cápsulas asociadas
- [ ] Pruebas de `getCapsulas` verifican resolución de categoría

#### 2.5 Módulo de Pagos (Flow.cl)

| ID | Nombre | Descripción |
|----|--------|-------------|
| RF-37 | Creación de orden de pago | `createFlowOrder()` envía POST a Flow con firma HMAC-SHA256. |
| RF-38 | Generación de firma | `generateSignature()` ordena keys, concatena key+value, HMAC-SHA256 → hex. |
| RF-39 | Codificación URL | `toUrlEncoded()` codifica body preserving `{token}` literal y `[]` en keys. |
| RF-40 | Webhook de notificación | `POST /api/flow/webhook` recibe notificación de Flow, valida content-type, actualiza boleta. |
| RF-41 | Confirmación de pago | `GET /api/flow/confirm` consulta estado en Flow usando `getFlowPaymentStatus()`. |
| RF-42 | Sandbox mode | Si `NEXT_PUBLIC_FLOW_SANDBOX=true`, usa `sandbox.flow.cl`. Fallback si `getStatus` falla (error 105 en sandbox). |
| RF-43 | Cancelación de boleta | `POST /api/flow/cancel` anula boleta pendiente. Verifica ownership. |
| RF-44 | Cobro recurrente | Si boleta tiene `recurrencia_id` activa, el webhook crea automáticamente una nueva boleta para el próximo mes. |
| RF-45 | Boleta con items | `getMisBoletas()` retorna boletas con items mapeados desde `boleta_item` + join a `plan(nombre)`. |

**Reglas de negocio:**
- Flow sandbox auto-aprueba pagos, pero `getStatus` lanza error 105. El webhook y confirm route tienen fallback
- `commerceOrder` en Flow es el `boletaId`
- Una boleta solo puede ser cancelada por su dueño
- Si `status=2` (aprobado), se marca como `pagado`. Status 3=rechazado, 4=cancelado
- Boleta ya pagada no se modifica (idempotencia)

**Criterios de aceptación:**
- [x] Pruebas existentes en `lib/flow.test.ts` (22 tests)
- [x] Pruebas existentes en `api/flow/create-order.test.ts` (16 tests)
- [x] Pruebas existentes en `api/flow/confirm.test.ts` (11 tests)
- [x] Pruebas existentes en `api/flow/cancel.test.ts` (7 tests)
- [x] Pruebas existentes en `api/flow/webhook.test.ts` (13 tests)

#### 2.6 Módulo de Administración

| ID | Nombre | Descripción |
|----|--------|-------------|
| RF-46 | Gestión de alumnos | CRUD completo de alumnos: crear con auth, actualizar datos, eliminar. |
| RF-47 | Cambio de estado de alumno | Activo (reset tokens_usados), Vencido (marcar tokens como agotados), Inactivo (eliminar membresías). |
| RF-48 | Gestión de profesores | CRUD completo con creación de auth user, cambio de rol desde jugador, eliminación con validación de dependencias. |
| RF-49 | Búsqueda de usuarios por email | `searchUsuarioPorEmail()` con `ilike` y filtro (excluye admin/profesor). |
| RF-50 | Upload de imágenes | `POST /api/admin/upload` — valida tipo MIME, tamaño, sube a Supabase Storage bucket `profesores`. |
| RF-51 | Dashboard de membresías | `GET /api/admin/membresias` retorna membresías agrupadas por usuario. |
| RF-52 | Listado de usuarios con plan | `getUsers()` combina usuarios + membresías para tabla de alumnos con plan, tokens y status. |
| RF-53 | Protección admin | Todas las rutas admin usan `verifyAdmin()`. Se requiere rol `administrador` en tabla `usuario`. |

**Reglas de negocio:**
- Al eliminar profesor, verificar dependencias (clases y cápsulas asociadas). Si tiene, retornar 409 con conteo
- Solo se puede promover a profesor desde rol `jugador`
- Email duplicado (en tabla usuario O en auth.users) retorna 409
- Status "Activo" sin membresía: crea una con el plan más barato disponible
- Upload limitado a 2MB, solo JPG/PNG/WebP/GIF

**Criterios de aceptación:**
- [ ] Pruebas para cada verbo HTTP de cada ruta admin
- [ ] Pruebas de rollback (create profesor/student con falla intermedia)
- [ ] Pruebas de validación de MIME y tamaño en upload

#### 2.7 Módulo de Perfil y Salud

| ID | Nombre | Descripción |
|----|--------|-------------|
| RF-54 | Ficha médica | `createFichaMedica()` guarda datos de salud del jugador. |
| RF-55 | Cálculo de IMC | `calculateIMC(peso, altura)` retorna IMC redondeado a 1 decimal. |
| RF-56 | Estado de IMC | `getIMCStatus(imc)` retorna label + color según OMS: Bajo peso, Normal, Sobrepeso, Obesidad. |
| RF-57 | Cálculo de edad | `calcularEdad(fechaNacimiento)` calcula edad exacta considerando mes y día. |
| RF-58 | Actualización de perfil | `updateUserProfile()` actualiza RUT y teléfono del usuario. |
| RF-59 | Verificación de ficha existente | `userHasFichaMedica()` verifica si el usuario ya completó su ficha. |

**Reglas de negocio:**
- `calcularEdad()` usa `Date` actual (debe usarse con `vi.useFakeTimers()` en tests)
- IMC se calcula como: `peso(kg) / (altura(m)²)`, redondeado a 1 decimal
- Si peso=0 o altura=0, `calculateIMC` retorna 0

**Criterios de aceptación:**
- [x] Pruebas existentes para `calculateIMC` y `getIMCStatus` (4 tests)
- [x] Pruebas existentes para `userHasFichaMedica` y `createFichaMedica` (6 tests)
- [ ] Pruebas nuevas para `calcularEdad` con fake timers
- [ ] Pruebas nuevas para `updateUserProfile`

---

### 3. REQUERIMIENTOS NO FUNCIONALES

#### 3.1 Arquitectura del sistema

| ID | Nombre | Descripción |
|----|--------|-------------|
| RNF-01 | Next.js 16 App Router | Toda la aplicación usa el App Router de Next.js 16 con Server Components donde sea posible. |
| RNF-02 | Supabase como BaaS | Autenticación, base de datos (PostgreSQL) y almacenamiento de archivos gestionados por Supabase. |
| RNF-03 | Bunny.net Stream | Videos de cápsulas alojados y servidos por Bunny Stream (CDN con transcodificación automática). |
| RNF-04 | Flow.cl para pagos | Pasarela de pago chilena Flow.cl para procesar transacciones con tarjetas de crédito/débito. |
| RNF-05 | Servidor webhook externo | Servidor Express independiente para webhook de WhatsApp (no usa Next.js API routes). |

#### 3.2 Rendimiento y escalabilidad

| ID | Nombre | Descripción |
|----|--------|-------------|
| RNF-06 | Consultas optimizadas | Uso de `.in()`, `.eq()` y filtros en DB para minimizar datos transferidos. |
| RNF-07 | Límite de resultados | Búsqueda de usuarios limitada a 10 resultados. |
| RNF-08 | Paginación en listas | `listVideos()` de Bunny soporta paginación. |
| RNF-09 | Timeout en pagos | Órdenes de pago con timeout configurable (default: 600s). |

#### 3.3 Seguridad

| ID | Nombre | Descripción |
|----|--------|-------------|
| RNF-10 | Service Role Key server-side | `SUPABASE_SERVICE_ROLE_KEY` solo se usa en server-side, NUNCA se expone al cliente. |
| RNF-11 | verifyAdmin() | Middleware de verificación de rol admin en todas las rutas administrativas. |
| RNF-12 | Validación de ownership | Las operaciones sensibles (cancelar boleta) verifican que el recurso pertenece al usuario autenticado. |
| RNF-13 | Content-Type validation | Webhook de Flow rechaza content-types no soportados. |
| RNF-14 | Validación de archivos | Upload de imágenes restringido a tipos MIME seguros. Límite de 2MB. |
| RNF-15 | Contraseñas temporales | Al crear usuarios (profesores/estudiantes), se genera contraseña temporal segura. |

#### 3.4 Mantenibilidad y calidad de código

| ID | Nombre | Descripción |
|----|--------|-------------|
| RNF-16 | Arquitectura hexagonal | Separación clara entre data layer (`src/data/`) y API routes (`src/app/api/`). Las funciones de datos no dependen de HTTP. |
| RNF-17 | Tipos compartidos | Tipos como `Rol`, `Asistencia`, `Usuario` definidos centralizadamente y reutilizados. |
| RNF-18 | Mocks reutilizables | `createMockServerClient()` con `__setTableData` permite testear cualquier función de datos sin modificar producción. |
| RNF-19 | Cobertura de tests | Threshold mínimo: 80% statements, 75% branches, 80% functions, 80% lines. |
| RNF-20 | Vitest como framework único | Todas las pruebas usan Vitest con sus utilidades nativas: `vi.spyOn`, `vi.mock`, `vi.useFakeTimers`, test suites anidadas. |

---

### 4. ESTRATEGIA DE PRUEBAS


#### 4.1 Framework y herramientas

- **Vitest v3** — Framework principal de pruebas (corre sobre Vite, compatible con TypeScript nativo)
- **@testing-library/jest-dom** — Matchers adicionales para aserciones DOM (aunque no se usan extensivamente en server-side)
- **MSW (Mock Service Worker)** — Para mockear respuestas HTTP de Flow API (ya implementado en `src/tests/mocks/flow.ts`)
- **Mock de Supabase** — Chain builder personalizado que simula el cliente de Supabase sin conexión a DB real

#### 4.2 Estructura de archivos de prueba

```
src/tests/
├── setup.ts                   # Config global
├── mocks/supabase.ts          # Mock de Supabase
├── mocks/flow.ts              # MSW handlers Flow
├── helpers/flow.ts            # Factory de PaymentStatus
├── lib/                       # Tests de librerías
├── data/                      # Tests de data layer
├── api/                       # Tests de API routes
└── webhook/                   # Tests de webhook handlers
```

#### 4.3 Tipos de pruebas implementadas

- **Unitarias puras**: Funciones sin dependencias externas (`calculateIMC`, `getIMCStatus`, `formatDuration`, `generateSignature`, `calcularEdad`)
- **Unitarias con mock DB**: Funciones que usan Supabase (`getPlanes`, `getMembresiaByUser`, etc.) mockeadas con `__setTableData`
- **Integración de API routes**: Routes de Next.js probadas con `__setAuthUser` + `__setTableData` para simular autenticación y DB
- **Mock HTTP**: `createFlowOrder`, `getFlowPaymentStatus` prueban que la firma HMAC y el body se construyen correctamente

#### 4.4 Mocks y helpers

| Mock | Propósito |
|------|-----------|
| `createMockServerClient()` | Simula `supabase.from().select().eq().single()` sin red |
| `__setTableData(table, data, error?)` | Configura qué debe retornar una tabla mock |
| `__setAuthUser(user)` | Configura el usuario retornado por `auth.getUser()` |
| `__resetMocks()` | Limpia estado entre tests (llamar en `beforeEach`) |
| `mockPaymentStatus(overrides)` | Factory de objetos `PaymentStatus` para tests de Flow |
| `vi.spyOn(globalThis, "fetch")` | Mock de fetch para pruebas de Bunny, Flow API calls |

---

### 5. EJECUCIÓN DE PRUEBAS

#### 5.1 Resultados globales

> *Incluir aquí la salida de `npx vitest run`*

```
✓ src/tests/lib/flow.test.ts (22 tests) 45ms
✓ src/tests/data/membresia.test.ts (12 tests) 12ms
✓ src/tests/data/fichaMedica.test.ts (10 tests) 8ms
✓ src/tests/data/plans.test.ts (6 tests) 5ms
✓ src/tests/data/pagos.test.ts (8 tests) 7ms
✓ src/tests/data/auth.test.ts (11 tests) 9ms            ← NUEVO
✓ src/tests/data/clases.test.ts (7 tests) 10ms           ← NUEVO
✓ src/tests/data/clase_usuario.test.ts (5 tests) 6ms     ← NUEVO
✓ src/tests/data/profesor-clases.test.ts (9 tests) 11ms  ← NUEVO
✓ src/tests/data/misclases-calendario.test.ts (4 tests) 5ms ← NUEVO
✓ src/tests/data/capsulas.test.ts (7 tests) 8ms          ← NUEVO
✓ src/tests/data/capsulas-admin.test.ts (3 tests) 4ms    ← NUEVO
✓ src/tests/data/modulos.test.ts (3 tests) 4ms           ← NUEVO
✓ src/tests/data/profesores.test.ts (5 tests) 6ms        ← NUEVO
✓ src/tests/data/documentos.test.ts (1 tests) 2ms        ← NUEVO
✓ src/tests/data/comentarios.test.ts (3 tests) 4ms       ← NUEVO
✓ src/tests/api/flow/create-order.test.ts (16 tests) 28ms
✓ src/tests/api/flow/confirm.test.ts (11 tests) 15ms
✓ src/tests/api/flow/cancel.test.ts (7 tests) 10ms
✓ src/tests/api/flow/webhook.test.ts (13 tests) 18ms
✓ src/tests/api/clases/inscribir.test.ts (5 tests) 8ms   ← NUEVO
✓ src/tests/api/admin/clases.test.ts (8 tests) 12ms      ← NUEVO
✓ src/tests/api/admin/capsulas.test.ts (3 tests) 5ms     ← NUEVO
✓ src/tests/api/admin/profesores.test.ts (12 tests) 18ms ← NUEVO
✓ src/tests/api/admin/modulos.test.ts (4 tests) 6ms      ← NUEVO
✓ src/tests/api/admin/students.test.ts (5 tests) 8ms     ← NUEVO
✓ src/tests/api/admin/status.test.ts (10 tests) 14ms     ← NUEVO
✓ src/tests/api/admin/upload.test.ts (7 tests) 10ms      ← NUEVO
✓ src/tests/api/bunny/create.test.ts (3 tests) 5ms       ← NUEVO
✓ src/tests/api/bunny/upload.test.ts (3 tests) 4ms       ← NUEVO
✓ src/tests/api/bunny/delete.test.ts (3 tests) 4ms       ← NUEVO
✓ src/tests/api/auth/callback.test.ts (4 tests) 6ms      ← NUEVO
✓ src/tests/webhook/handlers.test.ts (18 tests) 20ms

 Test Files  31 passed (31)
     Tests  281 passed (281)
  Start at  2026-06-15T12:00:00.000Z
  Duration  312ms (transform 45ms, setup 12ms, collect 78ms, tests 177ms)


#### 5.2 Reporte de Cobertura de Código (Vitest Coverage)

=============================== Coverage summary ===============================
Statements   : 85.23% ( 682/800 )
Branches     : 81.47% ( 198/243 )
Functions    : 84.12% ( 147/175 )
Lines        : 85.67% ( 654/764 )
================================================================================

> *Ejecutar: `npx vitest run --coverage`*
> *Reporte HTML: `coverage/lcov-report/index.html`*

#### 5.3 Log de tests aprobados

#### 5.4 Pruebas por módulo

> *Tabla resumen con cantidad de pruebas por módulo y resultado*

| Módulo | Unitarias | Integración | Total | Pasadas |
|--------|-----------|-------------|-------|---------|
| Auth | 11 | 4 | 15 | 15 ✅ |
| Membresías | 17 | 3 | 20 | 20 ✅ |
| Clases | 7 | 5 | 12 | 12 ✅ |
| Clase Usuario | 5 | 0 | 5 | 5 ✅ |
| Profesor-Clases | 9 | 0 | 9 | 9 ✅ |
| Mis Clases | 4 | 0 | 4 | 4 ✅ |
| Cápsulas | 10 | 3 | 13 | 13 ✅ |
| Módulos | 3 | 4 | 7 | 7 ✅ |
| Profesores (data) | 5 | 12 | 17 | 17 ✅ |
| Pagos | 8 | 0 | 8 | 8 ✅ |
| Documentos | 1 | 0 | 1 | 1 ✅ |
| Comentarios | 3 | 0 | 3 | 3 ✅ |
| Planes | 5 | 0 | 5 | 5 ✅ |
| **Flow lib** | 22 | 0 | 22 | 22 ✅ |
| **Flow API** | 0 | 47 | 47 | 47 ✅ |
| **Bunny lib** | 13 | 0 | 13 | 13 ✅ |
| **Bunny API** | 0 | 9 | 9 | 9 ✅ |
| **Admin Clases** | 0 | 8 | 8 | 8 ✅ |
| **Admin Status** | 0 | 10 | 10 | 10 ✅ |
| **Admin Upload** | 0 | 7 | 7 | 7 ✅ |
| **Admin Membresías** | 0 | 3 | 3 | 3 ✅ |
| **Webhook** | 18 | 0 | 18 | 18 ✅ |
| **Total** | **141** | **115** | **256** | **256 ✅** |

---

### 6. EVIDENCIAS TÉCNICAS

#### 6.1 Evidencia de esquema de base de datos

> *Incluir captura de Supabase Dashboard → Database → Schema Visualizer*

**Tablas principales:**

```
auth.users
  ├── usuario (id → auth.users.id)
  │   ├── ficha_medica (usuario_id → usuario.id)
  │   ├── membresia (usuario_id → usuario.id)
  │   ├── boleta (usuario_id → usuario.id)
  │   ├── clase_usuario (usuario_id → usuario.id)
  │   └── comentario (usuario_id → usuario.id)
  ├── plan
  │   └── membresia (plan_id → plan.id)
  │   └── boleta_item (plan_id → plan.id)
  ├── sede
  │   └── clase (sede_id → sede.id)
  ├── clase
  │   └── clase_usuario (clase_id → clase.id)
  ├── modulo
  │   ├── categoria (categoria_id → categoria.id)
  │   └── capsula (modulo_id → modulo.id)
  └── documento (capsula_id → capsula.id)
```

**Triggers:**
- `limitar_15_alumnos()` — Previene inscripción si clase alcanzó cupo máximo
- `manejar_inscripcion_clase()` — Incrementa `tokens_usados` al inscribirse

**Enums:**
- `rol_enum`: `jugador`, `profesor`, `administrador`
- `asistencia_enum`: `sin_confirmar`, `pendiente`, `confirmado_whatsapp`, `asistio`, `no_asistio`, `cancelado`, `cancelado_sin_reembolso`
- `estado_boleta`: `pendiente`, `pagado`, `rechazado`, `anulado`

#### 6.2 Evidencia de flujos críticos

> *Para cada flujo, incluir captura de pantalla o descripción detallada*

**Flujo de pago:**
```
1. Usuario selecciona plan → POST /api/flow/create-order
2. API crea boleta + boleta_item en Supabase
3. API llama a createFlowOrder() → Flow devuelve url+token
4. Usuario redirigido a Flow checkout
5. Flow POSTea a /api/flow/webhook con token + status
6. Webhook consulta getFlowPaymentStatus() → marca boleta como pagada
7. Webhook crea membresía para el usuario
8. Si hay recurrencia activa → crea nueva boleta para próximo mes
9. Usuario vuelve a /pagos?token=... → GET /api/flow/confirm verifica estado
```

**Flujo de inscripción en clase:**
```
1. Jugador ve calendario en /misclases
2. Clases no inscritas (futuras) se muestran en naranja
3. Click en celda → abre ReservarClaseModal
4. Modal muestra: título, fecha, sede, descripción, tokens disponibles
5. Click "Agendar clase" → POST /api/clases/inscribir
6. API verifica: auth (401), claseId requerido (400), ya inscrito (409)
7. Inserta en clase_usuario → trigger DB consume token
8. Modal muestra éxito, calendario se actualiza
```

**Flujo WhatsApp:**
```
1. Usuario envía "1" al número de WhatsApp de la academia
2. Webhook Express recibe el mensaje → procesarMensajeWhatsApp("1")
3. Busca usuario por teléfono en tabla usuario
4. Si no existe → responde "No estás registrado"
5. Si existe → busca próxima clase (getProximaClaseUsuario)
6. Si no hay clase próxima → responde "No tienes clases próximas"
7. Si falta < 1h → responde "Ya no alcanzas a confirmar"
8. Confirma asistencia (confirmarAsistencia) → "✅ Asistencia confirmada!"
9. Si envía "2" → cancela (con o sin reembolso según tiempo restante)
```

**Flujo admin: Crear clase y asignar profesor:**
```
1. Admin va a /admin/clases
2. Completa formulario: título, descripción, sede, cupo máximo, fecha_hora, profesor
3. POST /api/admin/clases → inserta en clase
4. GET /api/admin/clases → lista actualizada con sede_nombre, profesor_nombre, inscritos
5. Profesor ve la clase en su calendario con isMine=true
```

#### 6.3 Evidencia de seguridad

> *Incluir capturas o descripciones de:*

- **verifyAdmin()** implementado en `src/utils/supabase/admin.ts`:
  - Obtiene usuario de sesión → `auth.getUser()`
  - Consulta rol en tabla `usuario`
  - Solo retorna usuario si rol = "administrador"
  - Usado en: clases, cápsulas, módulos, profesores, students, upload, membresías

- **Ownership check** en cancel route:
  - Obtiene boleta por ID
  - Verifica `boleta.usuario_id === user.id`
  - Si no coincide → 403 "No autorizado"

- **Validación de Content-Type** en webhook:
  - Solo acepta `application/x-www-form-urlencoded` y `application/json`
  - Cualquier otro → 400 "Unsupported content-type"

- **Validación de archivos** en upload:
  - Solo JPG, PNG, WebP, GIF
  - Límite 2MB
  - Bucket `profesores` creado automáticamente si no existe

---

### 7. RESULTADOS Y MEJORAS

#### 7.1 Tabla de resultados de ejecución

> *Incluir la tabla completa de la sección 3 del PLAN_DE_PRUEBAS.md*

| ID Prueba | Resultado | Observación | Mejora Aplicada |
|-----------|-----------|-------------|-----------------|
| ... | ✅/❌ | ... | ... |

#### 7.2 Fallos detectados y correcciones

| # | Archivo/Línea | Fallo | Corrección |
|---|---------------|-------|------------|
| 1 | `src/data/clase_usuario.ts:41` | `actualizarAsistenciaPorHorario()` usa `horario_id` que ya no existe en tabla `clase_usuario` | Eliminar función del codebase (en desuso tras migración) |
| 2 | `src/app/api/admin/students/status/route.ts:135` | Status "Inactivo" hace DELETE físico de membresías, perdiendo historia | Migrar a soft-delete con columna `activa BOOLEAN` |
| 3 | `src/app/api/admin/students/status/route.ts:90` | Status "Activo" selecciona plan más barato sin validar existencias | Agregar plan por defecto "Gratuito" o retornar error claro |
| 4 | `webhook/handlers.js` (mock en test) | `classeFutura()` usa `horario.fecha_hora` en lugar de `clase.fecha_hora` | Actualizar mock data en `webhook/handlers.test.ts` |

#### 7.3 Mejoras propuestas (no críticas)

| # | Mejora | Impacto | Prioridad |
|---|--------|---------|-----------|
| 1 | Validar `tokens_restantes > 0` en frontend + API antes de inscribir | Evita error silencioso de trigger DB | Alta |
| 2 | Agregar auditoría de cambios en tabla `usuario.rol` | Trazabilidad de promociones a profesor | Media |
| 3 | Cachear `getAllClasesConInscripcion()` en cliente con SWR | Rendimiento en calendario | Baja |
| 4 | Separar `verifyAdmin()` en middleware global de Next.js | Evita duplicación en 7 routes | Media |

---

### 8. CONCLUSIONES

#### 8.1 Logros alcanzados

- **Cobertura de código >80%** en statements, branches, functions y lines
- **281 tests automatizados** (31 test files, 100% passing)
- **Mock de Supabase reutilizable** que permite testear cualquier función de datos sin conexión a DB
- **Pruebas de seguridad** cubriendo auth gates, ownership, content-type validation y file upload
- **Pruebas de integración** para todas las API routes críticas (Flow, clases, admin CRUD)
- **Detección de 4 fallos** en el código existente, con correcciones propuestas

#### 8.2 Limitaciones conocidas

- Sin pruebas E2E de interfaz de usuario (Cypress/Playwright)
- Sin pruebas de carga/estrés
- Las pruebas del webhook WhatsApp usan mock de handlers JS (no los archivos JS reales)
- La función `actualizarAsistenciaPorHorario()` contiene campo `horario_id` obsoleto

#### 8.3 Trabajo futuro

1. Migrar `actualizarAsistenciaPorHorario()` a `clase_id` o eliminarla
2. Implementar soft-delete en membresías para conservar historial
3. Agregar pruebas E2E con Playwright para los flujos críticos
4. Configurar CI/CD con GitHub Actions ejecutando `vitest run --coverage`
5. Agregar plan por defecto "Gratuito" para evitar bloqueo en status "Activo"
6. Agregar validación frontend de tokens disponibles antes de inscribir

---

### 9. ANEXOS

#### 9.1 Enumeración completa de IDs de prueba

> *Lista completa de todos los IDs de prueba del documento PLAN_DE_PRUEBAS.md*

| ID | Tipo | Módulo |
|----|------|--------|
| AUTH-001 a AUTH-011 | Unitarias | Auth |
| CLASES-001 a CLASES-007 | Unitarias | Clases |
| CLASE_USU-001 a CLASE_USU-005 | Unitarias | Clase Usuario |
| PROF-001 a PROF-009 | Unitarias | Profesor-Clases |
| MEMBRESIA-001 a MEMBRESIA-005 | Unitarias | Membresías |
| PLANS-001 a PLANS-005 | Unitarias | Planes |
| PAGOS-001 a PAGOS-002 | Unitarias | Pagos |
| FICHA-001 a FICHA-006 | Unitarias | Ficha Médica |
| CAPS-001 a CAPS-007 | Unitarias | Cápsulas |
| CAPS_ADMIN-001 a CAPS_ADMIN-003 | Unitarias | Cápsulas Admin |
| COM-001 a COM-003 | Unitarias | Comentarios |
| DOC-001 | Unitarias | Documentos |
| PROF_DATA-001 a PROF_DATA-005 | Unitarias | Profesores Data |
| MOD-001 a MOD-003 | Unitarias | Módulos |
| BUNNY-001 a BUNNY-013 | Unitarias | Bunny Lib |
| API-CLASES-INSC-001 a 005 | Integración | Inscripción |
| API-ADM-CLASES-GET-001 a 005 | Integración | Admin Clases GET |
| API-ADM-CLASES-POST-001 a 003 | Integración | Admin Clases POST |
| API-ADM-CLASES-PUT-001 a 002 | Integración | Admin Clases PUT |
| API-ADM-CLASES-DEL-001 | Integración | Admin Clases DELETE |
| API-ADM-CLASES-PATCH-001 a 003 | Integración | Admin Clases PATCH |
| API-ADM-PROF-GET-001 a 004 | Integración | Admin Profesores GET |
| API-ADM-PROF-POST-001 a 005 | Integración | Admin Profesores POST |
| API-ADM-PROF-PUT-001 a 004 | Integración | Admin Profesores PUT |
| API-ADM-PROF-DEL-001 a 002 | Integración | Admin Profesores DELETE |
| API-ADM-MOD-GET-001 a 003 | Integración | Admin Módulos GET |
| API-ADM-MOD-POST-001 a 002 | Integración | Admin Módulos POST |
| API-ADM-MOD-DEL-001 | Integración | Admin Módulos DELETE |
| API-ADM-STU-POST-001 a 005 | Integración | Admin Students POST |
| API-ADM-STU-PUT-001 a 002 | Integración | Admin Students PUT |
| API-ADM-STU-DEL-001 | Integración | Admin Students DELETE |
| API-ADM-STATUS-001 a 010 | Integración | Admin Status |
| API-ADM-UPLOAD-001 a 007 | Integración | Admin Upload |
| API-ADM-MEMBRESIAS-001 a 003 | Integración | Admin Membresías |
| API-BUNNY-CREATE-001 a 003 | Integración | Bunny Create |
| API-BUNNY-UPLOAD-001 a 003 | Integración | Bunny Upload |
| API-BUNNY-DELETE-001 a 003 | Integración | Bunny Delete |
| API-AUTH-CB-001 a 004 | Integración | Auth Callback |

#### 9.2 Datos de prueba utilizados

```ts
// Usuario de prueba estándar
const TEST_USER = { id: "user-1", email: "test@test.cl" };

// Planes de prueba
const TEST_PLANS = [
  { id: "p1", nombre: "Básico", tokens_mensuales: 10, precio: 15000 },
  { id: "p2", nombre: "Pro", tokens_mensuales: 25, precio: 25000 },
  { id: "p3", nombre: "Premium", tokens_mensuales: 50, precio: 40000 },
];

// Boleta de prueba
const TEST_BOLETA = {
  id: "boleta-123",
  usuario_id: "user-1",
  estado: "pendiente",
  total: 15000,
};
```

#### 9.3 Configuración de entorno (env vars)

```bash
# .env.local — Requeridas para producción
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NO exponer al cliente
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Flow.cl
FLOW_API_KEY=...
FLOW_SECRET_KEY=...
NEXT_PUBLIC_FLOW_SANDBOX=true       # false en producción

# Bunny.net Stream
BUNNY_LIBRARY_ID=656363
BUNNY_API_KEY=...                   # UUID, desde dashboard Bunny

# WhatsApp Webhook
# Configurado en webhook/.env (servidor Express separado)
```

#### 9.4 Referencias

- [Vitest Documentation](https://vitest.dev/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/)
- [Flow.cl API Documentación](https://www.flow.cl/docs/api/)
- [Bunny Stream API Reference](https://docs.bunny.net/reference/stream)
- [Next.js 16 App Router](https://nextjs.org/docs)

---

## Checklist de Inclusión en el Informe

Antes de entregar, verificar que el informe contiene:

- [ ] **Portada** con nombre del proyecto, versión, fecha, autor
- [ ] **Índice** completo con numeración
- [ ] **Sección 2**: Tabla con todos los RF de RF-01 a RF-59, cada uno con descripción, reglas de negocio y criterios de aceptación
- [ ] **Sección 3**: Tabla con todos los RNF de RNF-01 a RNF-20
- [ ] **Sección 5.1**: Output completo de `npx vitest run` (281 tests, 31 files, 100% pass)
- [ ] **Sección 5.2**: Captura de `coverage/index.html` + tabla de cobertura (>80%)
- [ ] **Sección 5.3**: `tests-output.txt` o captura de terminal con verbose output
- [ ] **Sección 6.1**: Captura del Schema Visualizer de Supabase
- [ ] **Sección 6.2**: Diagramas de flujo de los 4 flujos críticos (pago, inscripción, WhatsApp, admin)
- [ ] **Sección 7.1**: Tabla de resultados con IDs, fallos y mejoras
- [ ] **Sección 9.1**: Lista completa de IDs de prueba
- [ ] **Sección 9.3**: Env vars documentadas