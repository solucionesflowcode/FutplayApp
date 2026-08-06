# FutPlay App — Project Overview

> Generado: 2026-06-28. Auditoría completa del código fuente.

---

## Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| Next.js | 16.2.2 | App Router, RSC, API Routes |
| React | 19.2.4 | UI |
| TypeScript | ^5 | Tipado estático |
| Supabase JS | ^2.103.2 | Cliente base de datos + Auth |
| Supabase SSR | ^0.10.3 | Manejo de sesión server-side |
| Tailwind CSS | v4 | Estilos (`@tailwindcss/postcss`) |
| Bunny.net Stream | — | Video streaming (cápsulas e-learning) |
| Lucide React | ^1.8.0 | Iconos |
| Flow.cl | — | Pasarela de pagos (Chile) |
| whatsapp-web.js | ^1.34.7 | Bot WhatsApp para asistencia |
| Express | ^4.21.2 | Servidor webhook (WhatsApp) |
| Vitest | ^3.2.6 | Tests unitarios |

---

## Estructura del Proyecto

```
futplayapp/
├── context-ai/                    # Documentación DB para IA
│   ├── enums.md                   # Enums de PostgreSQL
│   ├── foreignkey-reltions.md     # Relaciones FK
│   ├── funciones.md               # Funciones SQL
│   ├── policies.md                # Políticas RLS
│   ├── triggers.md                # Triggers SQL
│   ├── tables.md                  # Listado de tablas
│   ├── columns-types.md           # (vacío/incompleto)
│   └── old-context/               # Version anterior de docs
│
├── docs/
│   ├── COURSE_SYSTEM.md           # Documentación del sistema de cursos
│   ├── PLAN_DE_PRUEBAS.md         # Plan de pruebas
│   └── INFORME_PLAN_DE_PRUEBAS.md # Informe de plan de pruebas
│
├── public/                        # Assets estáticos
│   ├── futplay-logo.svg, futplay-logo-original.svg
│   ├── login-background.svg, login-image-player.svg
│   └── file.svg, globe.svg, next.svg, vercel.svg, window.svg
│
├── src/
│   ├── @types/
│   │   └── lucide-react.d.ts      # Tipos de lucide-react
│   │
│   ├── proxy.ts                   # Proxy Supabase (Next.js 16, reemplaza middleware.ts)
│   │
│   ├── app/
│   │   ├── layout.tsx             # Root layout (AuthProvider)
│   │   ├── page.tsx               # Redirector por rol (useClient)
│   │   ├── globals.css            # Tailwind v4 + variables CSS + animación fadeIn
│   │   │
│   │   ├── (public)/              # Grupo de rutas públicas
│   │   │   ├── home/
│   │   │   │   ├── layout.tsx     # TopNavBar + pt-20
│   │   │   │   └── page.tsx       # Landing page (Hero, Benefits, About, Elearning, Bento, Footer)
│   │   │   └── login/
│   │   │       └── page.tsx       # Login con Google OAuth
│   │   │
│   │   ├── (dashboard)/           # Grupo de rutas dashboard (jugador)
│   │   │   ├── layout.tsx         # AuthGuard + SidebarUsuarioNuevo
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx       # Server component → DashboardClient
│   │   │   │   └── dashboard-client.tsx  # Dashboard layout con widgets
│   │   │   ├── capsules/
│   │   │   │   ├── page.tsx       # Server component (getCapsulas) → CapsulesPage
│   │   │   │   ├── capsules-client.tsx   # Catálogo de cápsulas con búsqueda/filtros
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # Reproductor de video + progreso + comentarios
│   │   │   ├── planes/
│   │   │   │   └── page.tsx       # Planes de membresía + compra + ficha médica
│   │   │   ├── pagos/             # Página de pagos (historial + flow)
│   │   │   └── misclases/         # Calendario de clases del usuario
│   │   │
│   │   ├── (admin)/               # Grupo de rutas admin
│   │   │   └── admin/
│   │   │       ├── layout.tsx     # AuthGuard + Sidebar admin fijo
│   │   │       ├── page.tsx       # Alumnos: tabla + stats + CRUD
│   │   │       ├── analiticas/page.tsx    # Stats, gráficos, distribución
│   │   │       ├── clases/page.tsx        # CRUD clases + horarios + asistencia
│   │   │       ├── modulos/page.tsx       # CRUD módulos + categorías
│   │   │       ├── capsulas/page.tsx      # CRUD cápsulas + Bunny video
│   │   │       ├── profesores/page.tsx    # CRUD profesores
│   │   │       └── planes/page.tsx        # CRUD planes
│   │   │
│   │   ├── (profesor)/            # Grupo de rutas profesor
│   │   │   └── profesor/
│   │   │       ├── layout.tsx     # AuthGuard + SidebarProfesor
│   │   │       ├── page.tsx       # Calendario de clases + control de asistencia
│   │   │       ├── profesor-client.tsx    # Cliente del profesor
│   │   │       └── elearning/     # Vista de e-learning para profesor
│   │   │
│   │   └── api/
│   │       ├── auth/callback/route.ts     # OAuth Google callback
│   │       ├── clases/inscribir/route.ts  # Inscripción a clases
│   │       ├── download-documento/route.ts # Descarga documentos
│   │       ├── bunny/                     # API Bunny Stream (CRUD videos)
│   │       │   ├── create/route.ts        # POST - Crear video
│   │       │   ├── upload/route.ts        # PUT - Subir video
│   │       │   ├── delete/route.ts        # DELETE - Eliminar video
│   │       │   ├── get-video/route.ts     # GET - Metadata
│   │       │   └── get-videos/route.ts    # GET - Listar videos
│   │       ├── flow/                      # API Flow.cl (pagos)
│   │       │   ├── create-order/route.ts  # POST - Crear orden de pago
│   │       │   ├── confirm/route.ts       # GET - Confirmar pago
│   │       │   ├── webhook/route.ts       # POST - Webhook Flow
│   │       │   ├── cancel/route.ts        # Cancelar pago
│   │       │   └── cancel-recurrence/     # Cancelar recurrencia
│   │       └── admin/                     # Admin API (bypass RLS con service_role)
│   │           ├── membresias/route.ts    # GET - Membresías con plan
│   │           ├── students/route.ts      # CRUD estudiantes (POST, PUT, DELETE)
│   │           ├── clases/route.ts        # CRUD clases + horarios + asistencia
│   │           ├── modulos/route.ts       # CRUD módulos + categorías
│   │           ├── capsulas/route.ts      # CRUD cápsulas
│   │           ├── profesores/route.ts    # CRUD profesores
│   │           ├── planes/route.ts        # CRUD planes
│   │           ├── documentos/route.ts    # CRUD documentos
│   │           ├── analiticas/route.ts    # Datos para analíticas
│   │           ├── upload/route.ts        # Subida de archivos
│   │           ├── upload-documento/      # Subida de documentos
│   │           └── upload-miniatura/      # Subida de miniaturas
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminHeader.tsx            # Header con buscador, notificaciones, avatar
│   │   │   ├── Sidebar.tsx               # Sidebar admin colapsable (6 rutas)
│   │   │   ├── StatCard.tsx              # Card de estadística
│   │   │   ├── StudentsTable.tsx         # Tabla de alumnos paginada + ficha médica
│   │   │   ├── CreateStudentModal.tsx    # Modal registro alumno/apoderado
│   │   │   ├── EditStudentModal.tsx      # Modal editar alumno
│   │   │   ├── ViewStudentModal.tsx      # Modal ver alumno
│   │   │   └── ConfirmDialog.tsx         # Diálogo de confirmación
│   │   │
│   │   ├── checkout/
│   │   │   └── FichaMedicaModal.tsx      # Modal multi-step de ficha médica
│   │   │
│   │   ├── landingPage/                  # Componentes de landing page
│   │   │   ├── Hero.tsx                  # Hero con CTA
│   │   │   ├── Benefits.tsx              # Beneficios (3 columnas)
│   │   │   ├── About.tsx                 # Metodología
│   │   │   ├── Elearning.tsx             # CTA e-learning
│   │   │   ├── Bento.tsx                 # Grid sedes + profesores
│   │   │   └── Footer.tsx                # Footer
│   │   │
│   │   ├── Login/
│   │   │   └── login.tsx                 # Formulario login con Google
│   │   │
│   │   ├── navbars/
│   │   │   ├── TopNavBar.jsx             # Navbar landing page (pública)
│   │   │   ├── TopNavBarUser.tsx         # Top navbar dashboard
│   │   │   ├── SidebarProfesor.tsx       # Sidebar profesor (Clases + E-learning)
│   │   │   ├── SideBarUsuario.tsx        # Sidebar legacy (Kinetic, no usado)
│   │   │   └── SidebarUsuarioNuevo.tsx   # Sidebar dashboard actual
│   │   │
│   │   ├── profesor/
│   │   │   ├── CalendarioClases.tsx      # Calendario de clases del profesor
│   │   │   └── ControlAsistencia.tsx     # Control de asistencia
│   │   │
│   │   ├── userDashboard/
│   │   │   ├── ProximoEntrenamiento.tsx   # Próxima clase con countdown
│   │   │   ├── MiAsistencia.tsx          # Tokens restantes del mes
│   │   │   ├── ProximaRenovacion.tsx     # Próxima renovación
│   │   │   ├── MetricasCorporales.tsx    # Peso, IMC, grasa corporal
│   │   │   ├── PlanesRender.tsx          # Cards de planes
│   │   │   ├── Recordatorio.tsx          # Banner normativa cancelación
│   │   │   ├── CapsulasClient.tsx        # Fetch de cápsulas
│   │   │   ├── CapsulasRender.tsx        # Grid de cápsulas
│   │   │   └── CapsulaCard.tsx           # Card individual de cápsula
│   │   │
│   │   └── videoPlayer/
│   │       └── VideoPlayerView.tsx       # Reproductor Bunny Stream + comentarios
│   │
│   ├── context/
│   │   ├── AuthContext.tsx               # AuthProvider + useAuthUser hook
│   │   ├── AuthGuard.tsx                # Route guard por rol
│   │   └── index.ts                     # Barrel exports
│   │
│   ├── data/                            # Capa de datos (queries a Supabase/API)
│   │   ├── auth.ts                      # Auth queries (getCurrentUser, getUsuario, signOut, signInWithGoogle, onAuthStateChange, buscarUsuarioPorTelefono)
│   │   ├── plans.ts                     # Plan queries + getUsers() para admin
│   │   ├── membresia.ts                 # Membresía CRUD + getAdminMembresias()
│   │   ├── capsules.ts                  # Cápsulas server-side (con cookies SSR)
│   │   ├── capsules-client.ts           # Cápsulas client-side
│   │   ├── capsules-admin.ts            # Cápsulas admin (API)
│   │   ├── clases.ts                    # Clases CRUD + asistencia (vía API admin)
│   │   ├── horario.ts                   # Horarios (queries a tabla eliminada `horario`)
│   │   ├── clase_usuario.ts             # Confirmar/actualizar asistencia
│   │   ├── modulos.ts                   # Módulos CRUD (vía API admin)
│   │   ├── profesores.ts                # Profesores CRUD + búsqueda (vía API admin)
│   │   ├── profesor-clases.ts           # Clases del profesor + asistencia
│   │   ├── fichaMedica.ts               # Ficha médica CRUD + IMC calculator
│   │   ├── pagos.ts                     # Boletas + membresía del usuario
│   │   ├── documentos.ts                # Documentos server-side
│   │   ├── documentos-admin.ts          # Documentos admin (vía API)
│   │   ├── comentarios.ts               # Comentarios en cápsulas
│   │   └── misclases-calendario.ts      # Calendario de clases del usuario
│   │
│   ├── lib/
│   │   ├── bunny.ts                     # Bunny Stream API (create, upload, get, list, delete)
│   │   ├── flow.ts                      # Flow.cl API (createOrder, getPaymentStatus)
│   │   ├── fechas.ts                    # Utilidades de fechas
│   │   └── rate-limit.ts               # Rate limiter en memoria
│   │
│   ├── utils/supabase/
│   │   ├── client.ts                    # createBrowserClient (browser)
│   │   ├── server.ts                    # createServerClient (cookies SSR)
│   │   ├── middleware.ts                # createServerClient (NextRequest)
│   │   └── admin.ts                     # verifyAdmin() para API routes
│   │
│   └── tests/
│       ├── setup.ts                     # Setup de tests (silencia console)
│       ├── api/                         # Tests de API routes
│       ├── data/                        # Tests de data layer
│       ├── lib/                         # Tests de lib
│       ├── helpers/                     # Helpers de test
│       ├── mocks/                       # Mocks
│       ├── e2e/                         # Tests e2e
│       └── webhook/                     # Tests de webhook
│
├── webhook/                             # Bot WhatsApp + Express server
│   ├── server.js                        # Express + WhatsApp Client + Scheduler
│   ├── handlers.js                      # Manejadores de mensajes WhatsApp
│   ├── data.js                          # Queries a Supabase desde webhook
│   ├── test-funcs.js                    # Test de funciones SQL
│   ├── check-supabase.cjs               # Script verificación Supabase
│   ├── check-supabase2.cjs              # Script verificación alternativo
│   ├── get_rpc.cjs                      # Script obtener RPCs
│   └── package.json                     # Dependencias del webhook
│
├── scripts/                             # Scripts de utilidad
├── supabase/                            # Migraciones/seed de Supabase
│
├── test-flow.mjs                        # Test de integración con Flow.cl
├── start-all.bat                        # Script para iniciar dev + tunnel
├── vitest.config.ts                     # Configuración de Vitest
├── next.config.ts                       # Config Next.js
├── tsconfig.json                        # Config TypeScript
├── postcss.config.mjs                   # Config PostCSS (Tailwind v4)
├── eslint.config.mjs                    # Config ESLint
├── AGENTS.md                            # Instrucciones para agentes AI
├── CLAUDE.md                            # Instrucciones para Claude
├── CONTEXT.md                           # Contexto completo del proyecto
├── PROJECT.md                           # Este archivo
└── .env.local                           # Variables de entorno (gitignored)
```

---

## Base de Datos (Supabase PostgreSQL)

### Enums

| Enum | Valores |
|---|---|
| `rol_usuario` | `jugador`, `profesor`, `administrador` |
| `estado` | `pendiente`, `pagado`, `rechazado`, `anulado` |

### Tablas

| Tabla | Columnas principales |
|---|---|
| `usuario` | `id` (UUID PK, FK auth.users), `nombre`, `email`, `telefono`, `rol` (rol_usuario), `rut` |
| `plan` | `id`, `nombre`, `tokens_mensuales`, `precio`, `descripcion`, `tipo`, `tokens`, `dias_semana`, `duracion_semanas`, `activo` |
| `membresia` | `id`, `usuario_id` (FK), `plan_id` (FK), `tokens_totales`, `tokens_usados`, `estado` (bool?), `mes` (timestamp) |
| `clase` | `id`, `titulo`, `descripcion`, `sede_id` (FK), `cupo_maximo`, `profesor_id` (FK), `fecha_hora` |
| `clase_usuario` | `id`, `usuario_id` (FK), `clase_id` (FK), `asistencia` (string: sin_confirmar, pendiente, confirmado_whatsapp, asistio, no_asistio, cancelado, cancelado_sin_reembolso) |
| `ficha_medica` | `id`, `usuario_id` (FK), `fecha_nacimiento`, `peso_kg`, `estatura_cm`, `imc`, `grupo_sanguineo`, `enfermedades`, `alergias`, `medicamentos`, `observaciones` |
| `capsula` | `id`, `titulo`, `imagen`, `creado`, `duracion`, `modulo_id` (FK), `profesor_id` (FK), `bunny_video_id`, `order_index`, `descripcion` |
| `modulo` | `id`, `nombre`, `descripcion`, `categoria_id` (FK) |
| `categoria` | `id`, `nombre` |
| `boleta` | `id`, `usuario_id` (FK), `estado`, `total`, `recurrencia_id`, `flow_confirmada`, `transaccion_id` |
| `boleta_item` | `id`, `boleta_id` (FK), `plan_id` (FK), `cantidad`, `precio`, `total` |
| `recurrencia` | `id`, `usuario_id`, `plan_id`, `activa` |
| `sede` | `id`, `nombre` |
| `producto` | `id`, `nombre`, `precio` |
| `comentario` | `id`, `capsula_id` (FK), `usuario_id` (FK), `contenido` |
| `documento` | `id`, `capsula_id` (FK), `nombre`, `url_archivo` |

**Nota histórica:** La tabla `horario` fue eliminada. `fecha_hora` se movió a `clase`. `clase_usuario` ahora referencia `clase` directamente vía `clase_id`.

**Nota fecha_hora:** `clase.fecha_hora` es `timestamp without time zone` (hora local de Chile). NO parsear con `new Date(fechaHora)` a secas (depende de la TZ del servidor/browser; en servidores UTC rompe el cálculo de reembolso). Usar `parseClaseFechaHora()` (`src/lib/fechas.ts`, y su gemelo `parseFechaHoraChile` en `webhook/handlers.js`), que interpreta strings sin zona como wall-clock de `America/Santiago` y respeta strings con `Z`/offset. Aplicado en `POST /api/clases/cancelar`, `CancelarClaseModal` y `horasHasta` del bot.

**Nota cupo:** `clase.cupo_maximo` lo define el admin (default 15) también para partidos. Registros legacy con `null` se tratan como 15 en `POST /api/clases/inscribir`; `POST/PUT /api/admin/clases` ya no lo fuerzan a `null` para partidos. El conteo de inscritos (admin y jugador) excluye `cancelado`/`cancelado_sin_reembolso`.

**Nota cupos frontend jugador:** `GET /api/clases/cupos` (service role, sesión requerida) devuelve `cupo_maximo` + `inscritos` por clase. `getAllClasesConInscripcion()` lo mergea en `ClaseConInscripcion` (`cupo_maximo`, `inscritos`). El calendario de mis clases lo propaga a `ReservarClaseModal`, que muestra `inscritos/cupo` y deshabilita la reserva (botón → mensaje "Clase llena") cuando `inscritos >= cupo_maximo`. La validación de servidor (`POST /api/clases/inscribir` + trigger `limitar_15_alumnos()`) sigue siendo el control último.

### Funciones SQL

| Función | Tipo | Propósito |
|---|---|---|
| `check_is_staff()` | SECURITY DEFINER | Retorna true si usuario es admin o profesor |
| `check_membresia_activa()` | TRIGGER | Previene membresías duplicadas en el mismo mes |
| `get_proxima_clase(p_usuario_id)` | SQL | Retorna próxima clase del usuario |
| `handle_new_user()` | TRIGGER (SECURITY DEFINER) | Crea registro en `usuario` al registrarse en Auth |
| `inscribir_usuario_clase()` | SQL | Inscribe usuario en clase |
| `limitar_15_alumnos()` | TRIGGER | Controla cupo máximo (lee `clase.cupo_maximo`; `null` → 15) |
| `manejar_inscripcion_clase()` | TRIGGER | Valida membresía al inscribir (NO consume tokens) |
| `procesar_boleta_pagada()` | TRIGGER | Crea membresía y asigna tokens al pagar boleta |
| `devolver_token(p_usuario_id)` | RPC | Devuelve un token a la membresía |

### Triggers

| Tabla | Trigger | Evento | Función |
|---|---|---|---|
| `boleta` | `trigger_procesar_boleta` | AFTER UPDATE | `procesar_boleta_pagada()` |
| `clase_usuario` | `trigger_limite_15` | BEFORE INSERT | `limitar_15_alumnos()` |
| `clase_usuario` | `trigger_inscripcion` | BEFORE INSERT | `manejar_inscripcion_clase()` |
| `membresia` | `trigger_prevenir_doble_plan` | BEFORE INSERT | `check_membresia_activa()` |

### RLS Policies

- `usuario`: Lectura propia o staff; actualización solo propia
- `membresia`: Solo propias (sin policy para admin — se usa service_role)
- `plan`: Lectura authenticated; solo admin gestiona
- `capsula`: Lectura authenticated; staff gestiona; admin elimina
- `ficha_medica`: Dueño gestiona; staff lee
- `clase_usuario`: Jugador ve sus clases; profesor/admin ven inscritos
- `boleta`: Admin gestiona; usuarios ven sus boletas
- `categoria`, `clase`, `horario`, `modulo`, `producto`, `sede`: Lectura authenticated

---

## Sistema de Autenticación

### Flujo

```
1. Usuario → /login
2. Click "Iniciar sesión con Google"
3. Supabase → Google OAuth → redirect a /api/auth/callback?code=...
4. API Route: exchangeCodeForSession() → guarda cookies → redirect a /
5. AuthProvider (root layout) detecta sesión vía onAuthStateChange
6. AuthContext carga datos de usuario desde tabla usuario via getUsuario(userId)
7. Root page.tsx redirige según rol:
   - administrador → /admin
   - profesor → /profesor
   - jugador → /dashboard
   - No autenticado → /home
```

### AuthContext

- `AuthProvider` envuelve root layout
- Hook `useAuthUser()` devuelve: `{ user, usuario, loading, error, signOut, refreshUser }`
- Suscribe a `onAuthStateChange` para cambios en tiempo real
- BFCache recovery: `window.onpageshow` recarga si viene de bfcache

### AuthGuard

- `allowedRoles?: Rol[]` — protege rutas
- Muestra loader mientras carga
- Redirige a `/login` si no autenticado o sin rol requerido
- Soporta `fallback` personalizado

### Roles

```ts
type Rol = "jugador" | "profesor" | "administrador";
```

---

## Sistema de Rutas y Navegación

### Proxy (Next.js 16)

`src/proxy.ts` — Reemplaza el middleware tradicional de Next.js. Refresca cookies de sesión de Supabase en cada request. Previene caché del navegador.

### Landing Page (Público)

- `/home` — Hero, Benefits, About, Elearning, Bento, Footer
- `/login` — Login con Google OAuth
- Layout: `TopNavBar.jsx` + `pt-20`

### Dashboard (Jugador/Profesor)

- Layout: `AuthGuard` (jugador, profesor) + `SidebarUsuarioNuevo`
- `/dashboard` — Próximo entrenamiento, asistencia, métricas, planes, cápsulas
- `/capsules` — Catálogo de cápsulas e-learning con búsqueda/filtros
- `/capsules/[id]` — Reproductor de video + comentarios
- `/planes` — Planes de membresía + compra + ficha médica
- `/pagos` — Historial de pagos
- `/misclases` — Calendario de clases

### Admin

- Layout: `AuthGuard` (administrador) + `Sidebar` admin
- `/admin` — Alumnos (tabla con stats + CRUD)
- `/admin/analiticas` — Estadísticas, gráficos, distribución por plan
- `/admin/clases` — CRUD clases + horarios + asistencia
- `/admin/modulos` — CRUD módulos + categorías
- `/admin/capsulas` — CRUD cápsulas + video Bunny
- `/admin/profesores` — CRUD profesores
- `/admin/planes` — CRUD planes

### Profesor

- Layout: `AuthGuard` (profesor) + `SidebarProfesor`
- `/profesor` — Calendario de clases + control de asistencia

---

## API Routes

### Auth
- `GET /api/auth/callback` — Intercambia código OAuth por sesión

### Clases
- `POST /api/clases/inscribir` — Inscribe usuario en clase

### Bunny Stream
- `POST /api/bunny/create` — Crear video en Bunny
- `PUT /api/bunny/upload?videoId=xxx` — Subir archivo de video
- `DELETE /api/bunny/delete?videoId=xxx` — Eliminar video
- `GET /api/bunny/get-video?videoId=xxx` — Metadata del video
- `GET /api/bunny/get-videos` — Listar videos (paginado, búsqueda)

### Flow.cl
- `POST /api/flow/create-order` — Crear orden de pago (crea boleta + recurrencia opcional)
- `GET /api/flow/confirm` — Confirmar estado de pago
- `POST /api/flow/webhook` — Webhook de Flow (procesa pagos + recurrencias)
- `POST /api/flow/cancel` — Cancelar pago
- `POST /api/flow/cancel-recurrence` — Cancelar recurrencia

### Admin (service_role key)
- `GET /api/admin/membresias` — Membresías con plan
- `POST|PUT|DELETE /api/admin/students` — CRUD estudiantes (crea auth user + perfil)
- `GET|POST|PUT|DELETE /api/admin/clases` — CRUD clases + horarios + asistencia
- `GET|POST|PUT|DELETE /api/admin/modulos` — CRUD módulos
- `GET|POST|PUT|DELETE /api/admin/capsulas` — CRUD cápsulas
- `GET|POST|PUT|DELETE /api/admin/profesores` — CRUD profesores (crea auth user)
- `GET|POST|PUT|DELETE /api/admin/planes` — CRUD planes
- `GET|POST|DELETE /api/admin/documentos` — CRUD documentos
- `GET /api/admin/analiticas` — Datos de analíticas
- `POST /api/admin/upload` — Subida de archivos genérica
- `POST /api/admin/upload-documento` — Subida de documentos a Storage
- `POST /api/admin/upload-miniatura` — Subida de miniaturas

### Documentos
- `GET /api/download-documento?id=xxx` — Descarga documentos desde Storage

---

## Capa de Datos (`src/data/`)

| Archivo | Cliente | Exporta |
|---|---|---|
| `auth.ts` | browser | `getCurrentUser()`, `getUsuario()`, `signOut()`, `signInWithGoogle()`, `onAuthStateChange()`, `buscarUsuarioPorTelefono()` |
| `plans.ts` | browser | `getPlanes()`, `getPlanesLimit()`, `getUsers()`, `getPlanesAdmin()`, CRUD admin |
| `membresia.ts` | browser | `userHasMembresia()`, `getMembresiaByUser()`, `getAllMembresiasConPlan()`, `getAdminMembresias()`, `createMembresia()`, `devolverToken()` |
| `capsules.ts` | server | `getCapsulas()`, `getCapsulaById()` |
| `capsules-client.ts` | browser | `getCapsulasClient()` |
| `capsulas-admin.ts` | browser | `getCapsulasAdmin()`, `getModulosOptions()`, CRUD |
| `clases.ts` | browser | `getProximaClase()`, CRUD clases + asistencia vía API admin |
| `horario.ts` | browser | `getHorariosEntre()`, `getHorariosPasados()`, `getHorario()` — **usa tabla eliminada `horario`** |
| `clase_usuario.ts` | browser | `confirmarAsistencia()`, `actualizarAsistencia()`, `cancelarClase()` |
| `modulos.ts` | browser | CRUD módulos vía API admin |
| `profesores.ts` | browser | CRUD profesores vía API admin |
| `profesor-clases.ts` | browser | `getTodasLasClases()`, `getAlumnosPorClase()`, `updateAsistencia()`, `autoCerrarConfirmados()`, `cerrarAsistencia()` |
| `fichaMedica.ts` | browser | `updateUserProfile()`, `createFichaMedica()`, `userHasFichaMedica()`, `getFichaMedicaByUser()`, `calculateIMC()`, `getIMCStatus()`, `calcularEdad()` |
| `pagos.ts` | browser | `getMisBoletas()`, `getMiMembresia()` |
| `documentos.ts` | server | `getDocumentosByCapsulaId()` |
| `documentos-admin.ts` | browser | CRUD documentos vía API admin |
| `comentarios.ts` | browser | `getComentariosByCapsulaId()`, `createComentario()` |
| `misclases-calendario.ts` | browser | `getAllClasesConInscripcion()` |

---

## Componentes

### Admin (`src/components/admin/`)

| Componente | Propósito |
|---|---|
| `AdminHeader.tsx` | Header con buscador, notificaciones, avatar. **Nombre hardcodeado "Pablo Escobar"** |
| `Sidebar.tsx` | Sidebar colapsable con 6 rutas. Sin persistencia en localStorage |
| `StatCard.tsx` | Card de estadística con color y valor |
| `StudentsTable.tsx` | Tabla paginada (4/page). Columnas: Nombre, Rol, RUT, Teléfono, Plan, Tokens, Estado, Acciones |
| `CreateStudentModal.tsx` | Modal creación alumno/apoderado (NO conectado a Supabase) |
| `EditStudentModal.tsx` | Modal edición alumno |
| `ViewStudentModal.tsx` | Modal visualización alumno |
| `ConfirmDialog.tsx` | Diálogo de confirmación para eliminar |

### Landing Page

| Componente | Archivo |
|---|---|
| `Hero.tsx` | Hero con título, CTA, imagen |
| `Benefits.tsx` | 3 columnas: Presencial, E-Learning, Alto Rendimiento |
| `About.tsx` | Metodología "Estilo Barcelona" |
| `Elearning.tsx` | CTA de cápsulas e-learning |
| `Bento.tsx` | Grid: Sedes + Profesores |
| `Footer.tsx` | Info, sedes, contacto |

### Navbars

| Componente | Uso |
|---|---|
| `TopNavBar.jsx` | Navbar landing page pública | 
| `TopNavBarUser.tsx` | Top navbar dashboard (clases restantes, notificaciones, perfil) |
| `SidebarProfesor.tsx` | Sidebar profesor (Clases + E-learning, "Vista Usuario") |
| `SideBarUsuario.tsx` | **Legacy** — Marca "Kinetic", rutas rotas, template de otro proyecto |
| `SidebarUsuarioNuevo.tsx` | Sidebar dashboard actual con persistencia de colapso |

### Dashboard Usuario

| Componente | Propósito |
|---|---|
| `ProximoEntrenamiento.tsx` | Próxima clase con countdown (estático, sin setInterval) |
| `MiAsistencia.tsx` | Barra de progreso de tokens del mes |
| `ProximaRenovacion.tsx` | Próxima renovación |
| `MetricasCorporales.tsx` | Peso, IMC, grasa corporal desde ficha_medica |
| `PlanesRender.tsx` | Cards de planes con CTA de compra |
| `Recordatorio.tsx` | Banner normativa de cancelación |
| `CapsulasClient.tsx` | Fetch de cápsulas |
| `CapsulasRender.tsx` | Grid de cápsulas |
| `CapsulaCard.tsx` | Card individual de cápsula |

### Profesor

| Componente | Propósito |
|---|---|
| `CalendarioClases.tsx` | Calendario de clases del profesor |
| `ControlAsistencia.tsx` | Control de asistencia con estados |

### Video Player

| Componente | Propósito |
|---|---|
| `VideoPlayerView.tsx` | Reproductor Bunny Stream + progreso + comentarios mock + guía + material descargable |

---

## Webhook / WhatsApp Bot

### Puerto: 3001

**Archivos:**
- `webhook/server.js` — Express server + WhatsApp Client (LocalAuth, puppeteer) + Scheduler (node-cron)
- `webhook/handlers.js` — `confirmarAsistencia()`, `cancelarAsistencia()`, `procesarMensajeWhatsApp()`
- `webhook/data.js` — Queries a Supabase desde webhook (buscarUsuario, getProximaClaseUsuario, confirmarAsistencia, updateAsistencia, devolverToken, getHorarios*, getInscripciones*, setPendiente, actualizarPorClaseYEstado, getClase, getUsuario)

**Flujo de Asistencia:**
1. Scheduler envía recordatorio 24h antes vía WhatsApp
2. Alumno responde "1" (confirmar) o "2" (cancelar)
3. Si confirma: `asistencia = "confirmado_whatsapp"`
4. Si cancela con >= 3h de anticipación: devuelve token
5. Si cancela con < 3h: no devuelve token
6. Pasada 1h de la clase: `confirmado_whatsapp` → `no_asistio`

**Estados de asistencia:** `sin_confirmar`, `pendiente`, `confirmado_whatsapp`, `asistio`, `no_asistio`, `cancelado`, `cancelado_sin_reembolso`

---

## Configuración

### Variables de Entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://cdhbfyqtubqnmgjdgkab.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...  # ⚠️ Es la service_role key con prefijo NEXT_PUBLIC_
BUNNY_LIBRARY_ID=656363
BUNNY_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
FLOW_API_KEY=...
FLOW_SECRET_KEY=...
NEXT_PUBLIC_FLOW_SANDBOX=true
NEXT_PUBLIC_BASE_URL=https://98d4094820344f.lhr.life
```

### Next.js Config (`next.config.ts`)
- `allowedDevOrigins`: tunnels de desarrollo (lhr.life, trycloudflare.com)

### TypeScript
- `target: ES2017`, `strict: true`, `moduleResolution: bundler`
- Path alias: `@/*` → `./src/*`
- Incluye archivos `.jsx` legacy

### Tailwind v4
- PostCSS con `@tailwindcss/postcss`
- `@import "tailwindcss"` en globals.css
- `@theme inline` para variables CSS

### ESLint
- `eslint-config-next` (core-web-vitals + typescript)

### Gitignore
- `.env*`, `node_modules`, `.next/`, `webhook/node_modules/`, `webhook/whatsapp-session/`, etc.

### Tests (Vitest)
- Environment: node
- Setup: silencia console.log/warn/error
- Incluye: `src/**/*.test.ts`, `src/**/*.test.tsx`

---

## Problemas Conocidos y Deuda Técnica

### ⚠️ CRÍTICO (P0)

- [ ] **Webhook roto por schema desactualizado**: `webhook/data.js` referencia schema antiguo (la tabla `horario` fue eliminada). El webhook usa `clase.id` como si fuera `horario.id`, lo que causa IDs incorrectos en todas las operaciones.
- [ ] **Bunny API routes sin autenticación**: Crear/subir/borrar videos en Bunny.net no requiere sesión.
- [ ] **Service role key expuesta como `NEXT_PUBLIC_`**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` contiene la service_role key y tiene prefijo `NEXT_PUBLIC_`, expuesta al browser.
- [ ] **Flow webhook verificación bypassable**: Si `getFlowPaymentStatus` lanza error en sandbox, confía en body POST sin verificar con Flow.
- [ ] **Secrets de Flow hardcodeados en test-flow.mjs**: API Key y Secret Key en texto plano.

### 🔴 ALTO (P1)

- [ ] **`horario.ts` usa tabla eliminada**: Queries a tabla `horario` que no existe. Rompe funcionalidad del profesor.
- [ ] **Race condition en inscripción a clases**: Entre check de inscripción existente y INSERT, dos requests concurrentes pueden crear duplicados.
- [ ] **`membresia.ts` guarda fecha completa en columna `mes`**: Guarda "2026-06-12" en vez de "2026-06-01". Queries con gte/lte fallan en bordes del mes.
- [ ] **Membresía en cápsulas no filtra por mes actual**: Cualquier membresía pasada da acceso a contenido.
- [ ] **create-order route hardcodea `localhost:3000` en urlReturn**: Ignora `NEXT_PUBLIC_BASE_URL`.
- [ ] **Flow confirm: type coercion bug**: `commerceOrder` puede ser número, se compara con string sin convertir.
- [ ] **Profesor/clases excluye alumnos sin confirmar**: Filtro excluye "sin_confirmar" y "pendiente".
- [ ] **`cerrarAsistencia` guarda "no asistio" con espacio**: Inconsistente con el resto del sistema que usa "no_asistio".
- [ ] **FichaMedicaModal: campos médicos todos requeridos**: Usuarios sin condiciones deben escribir "Ninguna".
- [ ] **Login: dos botones de Google que llaman la misma función**: "Iniciar Sesion" y "Registrarse" hacen exactamente lo mismo.

### 🟡 MEDIO (P2)

- [ ] **SidebarUsuarioNuevo muestra "Admin Panel" como subtítulo**: Estudiantes ven "Admin Panel" en vez de "Panel de Usuario".
- [ ] **AdminHeader hardcodea "Pablo Escobar"**: No usa `useAuthUser()`.
- [ ] **SideBarUsuario.tsx legacy con "Kinetic" y rutas rotas**: Template de otro proyecto.
- [ ] **PróximoEntrenamiento: countdown estático**: No hay setInterval para hacer tick.
- [ ] **VideoPlayerView: clases Tailwind dinámicas**: `bg-${color}-500/10` no genera clases en JIT.
- [ ] **FichaMedicaModal: parseInt trunca decimales de estatura**: `175.5` se trunca a `175`.
- [ ] **clases.ts: acceso frágil a nested array**: `c?.[0]` asume respuesta array, falla si es objeto.
- [ ] **MetricasCorporales: `.replace("text-", "text-")` no-op**: Se reemplaza a sí mismo (typo).
- [ ] **students/status route usa anon key**: No usa `verifyAdmin()` como las demás admin routes.

### 🟢 BAJO (P3)

- [ ] **test-flow.mjs usa URL tunnel hardcodeada**: No configurable vía env var.
- [ ] **Test setup silencia todo console output**: Dificulta debuggear tests fallidos.
- [ ] **misclases-client.tsx usa localStorage directo sin try/catch**: Puede explotar si localStorage no disponible.
- [ ] **capsules-admin.ts: fallback silencioso enmascara errores de schema**: Reintenta query sin `profesor_id` si falla.
- [ ] **misclases-calendario.ts usa `any`**: Definir interfaz.
- [ ] **Archivos muy grandes**: `pagos-client.tsx` (~1400 líneas), `misclases-client.tsx` (~747 líneas).

---

---
## Cambios Recientes

### 2026-06-28 — Cancelar clase + Re-inscripción

**Archivos modificados:**
- `src/data/clase_usuario.ts`: Nueva función `cancelarClase(claseUsuarioId, usuarioId, fechaHora)` con la misma lógica que el webhook — ≥3h devuelve token (`cancelado`), <3h no lo devuelve (`cancelado_sin_reembolso`). Reutiliza `devolverToken()` de `membresia.ts`.
- `src/components/misclases/CancelarClaseModal.tsx`: Nuevo modal de confirmación para cancelar clase. Muestra info de la clase (título, fecha, sede), indica si se devolverá o no el token según las horas restantes, y tiene botones "Volver" / "Cancelar clase" con estado de carga.
- `src/app/(dashboard)/misclases/misclases-client.tsx`: Botón "Cancelar" en la tabla de detalle de sesiones. Visible para **cualquier clase futura con inscripción** (no solo `confirmado_whatsapp`). Reemplaza `window.confirm` por el modal `CancelarClaseModal`. Incluye estado de carga, actualización local, refresco de tokens, y banner de resultado.
- `src/app/api/clases/cancelar/route.ts`: Nueva API route `POST /api/clases/cancelar`. Usa `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS) para hacer UPDATE a `clase_usuario` y llamar al RPC `devolver_token`. Misma lógica que el webhook: ≥3h → `cancelado` + devolver token, <3h → `cancelado_sin_reembolso`.
- `src/data/clase_usuario.ts`: `cancelarClase()` ahora llama a `POST /api/clases/cancelar` en vez de operar directo en Supabase (soluciona bloqueo por RLS).
- `src/app/api/clases/inscribir/route.ts`: Soporte para **re-inscripción** (UPDATE si cancelado) + ahora **consume un token** al inscribir (incrementa `tokens_usados`) tanto en inscripción nueva como re-inscripción, para que la cancelación pueda devolverlo correctamente.
- `supabase/rls_clase_usuario_update_jugador.sql`: Script SQL para agregar RLS policy (opcional, la API route ya bypass RLS con service_role). Si el usuario ya tiene un registro `cancelado`/`cancelado_sin_reembolso` para esa clase, hace UPDATE a `pendiente` en vez de INSERT. Valida membresía manualmente (el trigger BEFORE INSERT no corre en UPDATE).

**Comportamiento:**
- Cancelar: cualquier estado de inscripción, misma lógica de devolución de token
- Re-inscribir: si la clase fue cancelada previamente, se reactiva el registro existente cambiando a `pendiente`
- Después de cancelar: la sesión aparece como "Próxima" (amarillo) si es futura, o "Sin confirmar" (gris) si es pasada — visualmente disponible para re-inscribirse
- El botón "Cancelar" desaparece tras cancelar (se limpia `inscripcionId` en estado local)

**Cambios en `normalizeAsistencia`:** `cancelado` y `cancelado_sin_reembolso` ya no se mapean a `"ausente"` (rojo), sino que caen en `"sin_confirmar"`, mostrando la clase como disponible.

## Últimas Migraciones del Schema

- **Tabla `horario` eliminada** (2026-06): `fecha_hora` movido a `clase`, `clase_usuario` ahora referencia `clase` vía `clase_id`
- **CASCADE DELETE** en `clase_usuario.clase_id` → `clase.id`
- **Trigger `manejar_inscripcion_clase()`** modificado: solo valida membresía, NO descuenta tokens
- **Función `devolver_token()`** RPC creada y desplegada
- **Admin DELETE clase**: devuelve tokens vía `devolver_token()` RPC
- **Frontend pagos**: detecta `flowReturn`, polling 15 intentos, cleanup de orphaned

---

## Instrucciones Importantes

> **CUALQUIER cambio que se realice en el proyecto debe ser documentado en este archivo (`PROJECT.md`).**
> 
> - Si se agrega una nueva funcionalidad: actualizar secciones relevantes (estructura, API, data layer, etc.)
> - Si se modifica el schema de la DB: actualizar la sección de Base de Datos
> - Si se corrige un bug: mover el issue de la lista de problemas a "Resueltos" y agregar fecha
> - Si se agrega una dependencia: actualizar Stack Tecnológico
> - **Cada vez que se realicen cambios, ejecutar las pruebas unitarias** (`npx vitest run` o el comando correspondiente) para verificar que todo sigue funcionando correctamente
> - Mantener este archivo como fuente única de verdad del estado del proyecto
