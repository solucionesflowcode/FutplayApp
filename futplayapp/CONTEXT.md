# FutPlay App — Contexto Completo del Proyecto

> Generado: 2026-05-13. Basado en lectura completa de todos los archivos .ts, .tsx, .js, .jsx, .md, .json y configuración del proyecto.

---

## 1. Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| Next.js | 16.2.2 | App Router, RSC, API Routes |
| React | 19.2.4 | UI |
| TypeScript | ^5 | Tipado estático |
| Supabase JS | ^2.103.2 | Cliente base de datos + Auth |
| Supabase SSR | ^0.10.2 | Manejo de sesión server-side |
| Tailwind CSS | v4 | Estilos (PostCSS, `@import "tailwindcss"`) |
| Bunny.net Stream | — | Video streaming (cápsulas e-learning) |
| Lucide React | ^1.8.0 | Iconos |
| whatsapp-web.js | — | Bot WhatsApp para asistencia |
| Express | — | Servidor webhook |

---

## 2. Estructura del Proyecto

```
futplayapp/
├── context-ai/                       # Documentación DB para IA
│   ├── columns-types.md              # (vacío)
│   ├── enums.md                      # Enums de PostgreSQL
│   ├── foreignkey-reltions.md        # Relaciones FK
│   ├── funciones.md                  # Funciones SQL
│   ├── policies.md                   # Políticas RLS
│   ├── project_context.md            # Contexto general
│   ├── tables.md                     # (vacío)
│   └── triggers.md                   # Triggers SQL
│
├── public/
│   ├── file.svg, globe.svg, next.svg, vercel.svg, window.svg
│   ├── futplay-logo.svg, futplay-logo-original.svg
│   ├── login-background.svg, login-image-player.svg
│
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout (AuthProvider)
│   │   ├── page.tsx                 # Redirector por rol
│   │   ├── middleware.ts             # Supabase middleware
│   │   ├── globals.css              # Tailwind v4 + variables
│   │   │
│   │   ├── (public)/
│   │   │   ├── home/
│   │   │   │   ├── layout.tsx       # TopNavbar + pt-20
│   │   │   │   └── page.tsx         # Landing page (Hero, Benefits, About, Elearning, Bento, Footer)
│   │   │   └── login/
│   │   │       └── page.tsx         # Login con Google OAuth
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           # SidebarUsuarioNuevo
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx         # Server component → DashboardClient
│   │   │   │   └── dashboard-client.tsx  # Dashboard layout con widgets
│   │   │   ├── capsules/
│   │   │   │   ├── page.tsx         # Server component (getCapsulas) → CapsulesPage
│   │   │   │   ├── capsules-client.tsx  # Catálogo de cápsulas con búsqueda/filtros
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Reproductor de video + progreso + comentarios
│   │   │   └── planes/
│   │   │       └── page.tsx         # Planes de membresía + compra + ficha médica
│   │   │
│   │   ├── (admin)/
│   │   │   └── admin/
│   │   │       ├── layout.tsx       # Sidebar admin fijo + AuthGuard
│   │   │       ├── page.tsx         # Panel admin con tabla de usuarios + stats
│   │   │       ├── analiticas/
│   │   │       │   └── page.tsx     # Vista de analíticas (stats, gráficos, distribución)
│   │   │       ├── clases/
│   │   │       │   └── page.tsx     # CRUD completo: tabla, crear/editar modal, eliminar, asistencia general y por alumno
│   │   │       ├── modulos/
│   │   │       │   └── page.tsx     # CRUD completo: tabla, crear/editar modal, eliminar con validación de cápsulas asociadas
│   │   │       ├── capsulas/
│   │       │           │       └── page.tsx     # CRUD completo: tabla con thumbnail, coach, duración, módulo, BunnyVideoID, orden; modal crear/editar, eliminar
│   │   │       └── profesores/
│   │   │           └── page.tsx     # CRUD completo: tabla con clases y cápsulas asociadas, expandible, crear/editar/eliminar profesor
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── callback/route.ts    # OAuth Google callback
│   │       ├── bunny/
│   │       │   ├── create/route.ts      # POST - Crear video en Bunny
│   │       │   ├── upload/route.ts      # PUT - Subir video a Bunny
│   │       │   ├── delete/route.ts      # DELETE - Eliminar video
│   │       │   ├── get-video/route.ts   # GET - Metadata de un video
│   │       │   └── get-videos/route.ts  # GET - Listar videos
│   │       └── admin/
│       │           ├── clases/route.ts      # CRUD Clases + Horarios + Asistencia (service_role)
│       │           ├── modulos/route.ts     # CRUD Módulos + Categorías (service_role)
│       │           ├── capsulas/route.ts    # CRUD Cápsulas (service_role)
│       │           ├── profesores/route.ts  # CRUD Profesores (service_role, crea usuario auth + perfil)
│       │           ├── membresias/route.ts  # GET - Membresías (bypass RLS con service_role)
│       │           └── students/route.ts    # POST - Crear alumno/profesor manualmente
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminHeader.tsx          # Header con buscador, notificaciones, avatar
│   │   │   ├── CreateStudentModal.tsx   # Modal registro alumno/apoderado
│   │   │   ├── FabButton.tsx            # Botón flotante "+"
│   │   │   ├── Sidebar.tsx             # Sidebar admin colapsable
│   │   │   ├── StatCard.tsx            # Card de estadística
│   │   │   └── StudentsTable.tsx       # Tabla de alumnos paginada
│   │   │
│   │   ├── checkout/
│   │   │   └── FichaMedicaModal.tsx     # Modal multi-step de ficha médica
│   │   │
│   │   ├── landingPage/
│   │   │   ├── Hero.tsx
│   │   │   ├── Benefits.tsx
│   │   │   ├── About.tsx
│   │   │   ├── Elearning.tsx
│   │   │   ├── Bento.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── Login/
│   │   │   └── login.tsx               # Formulario login con Google
│   │   │
│   │   ├── navbars/
│   │   │   ├── TopNavBar.jsx            # Navbar landing page
│   │   │   ├── TopNavBarUser.tsx        # Top navbar dashboard (clases restantes)
│   │   │   ├── SideBarUsuario.tsx       # Sidebar legacy (Kinetic, no usado)
│   │   │   └── SidebarUsuarioNuevo.tsx  # Sidebar dashboard actual
│   │   │
│   │   └── userDashboard/
│   │       ├── ProximoEntrenamiento.tsx  # Próxima clase con countdown
│   │       ├── MiAsistencia.tsx         # Tokens restantes del mes
│   │       ├── MetricasCorporales.tsx   # Peso, IMC, grasa corporal
│   │       ├── PlanesRender.tsx         # Cards de planes (si no tiene membresía)
│   │       ├── Recordatorio.tsx         # Banner normativa cancelación
│   │       ├── CapsulasClient.tsx       # Fetch de cápsulas
│   │       ├── CapsulasRender.tsx       # Grid de cápsulas
│   │       └── CapsulaCard.tsx          # Card individual de cápsula
│   │
│   ├── context/
│   │   ├── AuthContext.tsx              # AuthProvider + useAuthUser hook
│   │   ├── AuthGuard.tsx               # Route guard por rol
│   │   └── index.ts                    # Barrel exports
│   │
│   ├── data/
│   │   ├── auth.ts                     # Auth queries (getCurrentUser, getUsuario, signOut, signInWithGoogle, onAuthStateChange)
│   │   ├── plans.ts                    # Plan queries + getUsers() para admin
│   │   ├── membresia.ts                # Membresía CRUD + getAdminMembresias()
│   │   ├── capsules.ts                 # Cápsulas server-side (con cookies)
│   │   ├── capsules-client.ts          # Cápsulas client-side
│   │   ├── clases.ts                   # Próxima clase via RPC
│   │   ├── fichaMedica.ts              # Ficha médica CRUD + IMC calculator
│   │   └── admin.ts                    # (eliminado, funciones movidas a plans.ts)
│   │
│   ├── lib/
│   │   └── bunny.ts                    # Bunny Stream API (create, upload, get, list, delete video)
│   │
│   └── utils/supabase/
│       ├── client.ts                   # createBrowserClient
│       ├── server.ts                   # createServerClient (cookies)
│       └── middleware.ts               # createServerClient (NextRequest)
│
├── webhook/
│   └── server.js                       # Express + WhatsApp bot + Supabase
│
├── AGENTS.md, CLAUDE.md, CONTEXT.md    # Documentación
├── .env.local                          # Supabase URL + keys
├── package.json                        # Dependencias
├── next.config.ts, tsconfig.json, eslint.config.mjs, postcss.config.mjs
```

---

## 3. Base de Datos (Supabase PostgreSQL)

### 3.1 Enums

| Enum | Valores |
|---|---|
| `rol_usuario` | `jugador`, `profesor`, `administrador` |
| `estado` | `pendiente`, `pagado`, `rechazado`, `anulado` |

### 3.2 Tablas y Columnas

#### `usuario`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | `REFERENCES auth.users(id)` |
| `nombre` | TEXT NOT NULL | |
| `email` | TEXT | |
| `telefono` | TEXT | |
| `rol` | `rol_usuario` NOT NULL | DEFAULT `'jugador'` |
| `rut` | TEXT | |

#### `plan`
| Columna | Tipo |
|---|---|
| `id` | UUID PK |
| `nombre` | TEXT |
| `tokens_mensuales` | INTEGER |
| `precio` | NUMERIC/INTEGER |

#### `membresia`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `usuario_id` | UUID FK → `usuario.id` | |
| `plan_id` | UUID FK → `plan.id` | |
| `tokens_totales` | INTEGER | |
| `tokens_usados` | INTEGER | DEFAULT 0 |
| `estado` | BOOLEAN? | `true`=pagado, `null`=pendiente (según triggers) |
| `mes` | DATE/TIMESTAMP | Primer día del mes |

#### `clase`
| Columna | Tipo |
|---|---|
| `id` | UUID PK |
| `titulo` | TEXT |
| `descripcion` | TEXT |
| `sede_id` | UUID FK → `sede.id` |
| `cupo_maximo` | INTEGER |

#### `horario`
| Columna | Tipo |
|---|---|
| `id` | UUID PK |
| `clase_id` | UUID FK → `clase.id` |
| `fecha_hora` | TIMESTAMP |

#### `clase_usuario`
| Columna | Tipo |
|---|---|
| `id` | UUID PK |
| `usuario_id` | UUID FK → `usuario.id` |
| `clase_id` | UUID FK → `clase.id` |
| `asistencia` | BOOLEAN |

#### `ficha_medica`
| Columna | Tipo |
|---|---|
| `id` | UUID PK |
| `usuario_id` | UUID FK → `usuario.id` |
| `edad` | INTEGER |
| `peso_kg` | NUMERIC |
| `estatura_cm` | INTEGER |
| `imc` | NUMERIC |
| `grupo_sanguineo` | TEXT |
| `enfermedades` | TEXT |
| `alergias` | TEXT |
| `medicamentos` | TEXT |
| `observaciones` | TEXT |

#### `capsula`
| Columna | Tipo |
|---|---|
| `id` | UUID PK |
| `titulo` | TEXT |
| `imagen` | TEXT (URL) |
| `creado` | TEXT (nombre del coach) |
| `duracion` | INTERVAL/TEXT (HH:MM:SS) |
| `modulo_id` | UUID FK → `modulo.id` |
| `bunny_video_id` | TEXT (nullable) |
| `order_index` | INTEGER |

#### `modulo`
| Columna | Tipo |
|---|---|
| `id` | UUID PK |
| `categoria_id` | UUID FK → `categoria.id` |

#### `categoria`
| Columna | Tipo |
|---|---|
| `id` | UUID PK |
| `nombre` | TEXT |

#### Otras tablas (boleta, boleta_item, producto, sede)

### 3.3 Foreign Keys

| Tabla | Columna | Referencia |
|---|---|---|
| `clase` | `sede_id` | `sede.id` |
| `horario` | `clase_id` | `clase.id` |
| `clase_usuario` | `clase_id` | `clase.id` |
| `clase_usuario` | `usuario_id` | `usuario.id` |
| `boleta` | `usuario_id` | `usuario.id` |
| `membresia` | `usuario_id` | `usuario.id` |
| `membresia` | `plan_id` | `plan.id` |
| `boleta_item` | `boleta_id` | `boleta.id` |
| `boleta_item` | `producto_id` | `producto.id` |
| `capsula` | `modulo_id` | `modulo.id` |
| `modulo` | `categoria_id` | `categoria.id` |
| `ficha_medica` | `usuario_id` | `usuario.id` |

### 3.4 Funciones SQL

| Función | Tipo | Propósito |
|---|---|---|
| `check_is_staff()` | SECURITY DEFINER | Retorna true si usuario es admin o profesor |
| `check_membresia_activa()` | TRIGGER | Previene membresías duplicadas en el mismo mes |
| `get_proxima_clase(p_usuario_id)` | SQL | Retorna próxima clase del usuario |
| `handle_new_user()` | TRIGGER (SECURITY DEFINER) | Crea registro en `usuario` al registrarse en Auth |
| `inscribir_usuario_clase()` | SQL | Inscribe usuario en clase |
| `limitar_15_alumnos()` | TRIGGER | Controla cupo máximo |
| `manejar_inscripcion_clase()` | TRIGGER | Valida membresía + consume token al inscribir |
| `procesar_boleta_pagada()` | TRIGGER | Crea membresía y asigna tokens al pagar boleta |

### 3.5 Triggers

| Tabla | Trigger | Evento | Función |
|---|---|---|---|
| `boleta` | `trigger_procesar_boleta` | AFTER UPDATE | `procesar_boleta_pagada()` |
| `clase_usuario` | `trigger_limite_15` | BEFORE INSERT | `limitar_15_alumnos()` |
| `clase_usuario` | `trigger_inscripcion` | BEFORE INSERT | `manejar_inscripcion_clase()` |
| `clase_usuario` | `trigger_limitar_15_alumnos` | BEFORE INSERT | `limitar_15_alumnos()` |
| `membresia` | `trigger_prevenir_doble_plan` | BEFORE INSERT | `check_membresia_activa()` |

### 3.6 Políticas RLS

| Tabla | Policy | Efecto |
|---|---|---|
| `usuario` | Lectura de perfiles | `(auth.uid() = id) OR check_is_staff()` |
| `usuario` | Actualizar propio perfil | `auth.uid() = id` |
| `membresia` | Ver mis membresias | `auth.uid() = usuario_id` (SOLO PROPIAS — **no hay policy para admin**) |
| `membresia` | Insert | Solo propia |
| `plan` | Lectura de catálogo | `authenticated` → true |
| `plan` | Solo admin gestiona | check `rol = 'administrador'` |
| `capsula` | Lectura de contenido | `authenticated` → true |
| `capsula` | Solo admins gestionan | check `rol = 'administrador'` |
| `capsula` | Staff gestiona contenido | check `rol IN ('administrador', 'profesor')` |
| `ficha_medica` | Dueño gestiona su ficha | `auth.uid() = usuario_id` |
| `ficha_medica` | Staff lee fichas | check `rol IN ('administrador', 'profesor')` |
| `ficha_medica` | Admins ven todas | check `rol = 'administrador'` |
| `clase_usuario` | Jugador ve sus clases | `auth.uid() = usuario_id` |
| `clase_usuario` | Profesor ve inscritos | check `rol IN ('profesor', 'administrador')` |
| `clase_usuario` | Profesor gestiona asistencia | `rol = 'profesor'` |
| `boleta` | Admin gestiona finanzas | `rol = 'administrador'` |
| `boleta` | Usuarios ven sus boletas | `auth.uid() = usuario_id` |
| `categoria` | Lectura | `authenticated` → true |
| `clase` | Lectura | `authenticated` → true |
| `horario` | Lectura | `authenticated` → true |
| `modulo` | Lectura | `authenticated` → true |
| `producto` | Lectura | `authenticated` → true |
| `sede` | Lectura | `authenticated` → true |

---

## 4. Sistema de Autenticación

### Flujo Completo

```
1. Usuario → /login
2. Click "Iniciar sesión con Google"
3. Supabase → Google OAuth → redirect a /api/auth/callback?code=...
4. API Route: exchangeCodeForSession() → guarda cookies → redirect a /dashboard
5. AuthProvider (root layout) detecta sesión vía onAuthStateChange
6. AuthContext carga datos de usuario desde tabla `usuario` via getUsuario(userId)
7. Root page.tsx redirige según rol:
   - administrador → /admin
   - profesor → /dashboard
   - jugador → /dashboard
   - No autenticado → /home
```

### AuthContext (`src/context/AuthContext.tsx`)
- `AuthProvider` envuelve root layout
- Hook `useAuthUser()` devuelve: `{ user, usuario, loading, error, signOut, refreshUser }`
- En mount: `getCurrentUser()` → si hay user → `getUsuario(userId)` → estado
- Suscribe a `onAuthStateChange` para cambios en tiempo real

### AuthGuard (`src/context/AuthGuard.tsx`)
- `allowedRoles?: Rol[]` — protege rutas
- Muestra loader mientras carga
- Redirige a `/login` si no autenticado
- Redirige a `/perfil` si no tiene rol (ruta /perfil no existe actualmente)

---

## 5. Enfoque: Admin Page

### Ubicación
`src/app/(admin)/admin/`

### Layout (`layout.tsx`)
- Renderiza `Sidebar` fijo (colapsable, menú con 6 rutas) + `<main>` con children
- **Sin `AuthGuard`** — la ruta no está protegida actualmente

### Sidebar (`src/components/admin/Sidebar.tsx`)
- Colapsable (w-64 ↔ w-20), sin persistencia en localStorage
- Menú: Analíticas, Alumnos, Gestión de clases, Gestión de módulos, Gestión de cápsulas, Profesores
- Footer: Ajustes, Cerrar sesión
- Color activo: `#F28C28` (naranja)
- **Solo `/admin` (Alumnos) existe** — las otras 5 rutas no tienen página

### Page (`admin/page.tsx`)
- "use client"
- `useEffect` → `getUsers()` de `@/data/plans` → `setStudents(data)`
- StatCards dinámicos: Total Alumnos, Con Plan, Activos, Pagos Vencidos
- Renderiza `StudentsTable`, `CreateStudentModal`, `FabButton`

### StudentsTable (`src/components/admin/StudentsTable.tsx`)
- Paginación (4 items/página) con Anterior/Siguiente + números
- Columnas: Nombre, Usuario (rol), RUT, Teléfono, Plan, Tokens, Estado, Acciones
- Acciones: Ver ficha médica, Ver, Editar, Eliminar (sin funcionalidad real)
- Estados: Activo (verde), Inactivo (amarillo), Vencido (rojo)

### CreateStudentModal (`src/components/admin/CreateStudentModal.tsx`)
- Registro manual de alumno o apoderado
- Apoderado puede agregar N hijos (nombre + plan)
- Soporta subida de ficha médica (archivo, preparado para Supabase)
- Tokens: Híbrido=10, Online=5
- **NO conectado a Supabase** — solo estado local en admin/page.tsx

### Vista de Analíticas (`admin/analiticas/page.tsx`)

**Layout:** `flex-col gap-8 max-w-[1216px]` con secciones `flex-none self-stretch z-0`.

**Secciones:**

| Sección | Componente | Datos |
|---------|-----------|-------|
| Header | Título + selector de período | — |
| 4 StatCards | Total Alumnos, Ingresos del Mes, Membresías Activas, Tasa Retención | Supabase queries |
| Gráfico Ingresos | Barras por mes (últimos 6) | `membresia.precio` agrupado por mes |
| Distribución por Plan | Barras horizontales con % | `getAdminMembresias()` agrupado por `plan_nombre` |
| Ingresos por Plan | Ingresos por plan + alumnos + barra % + total recurrente | `membresia.precio` agrupado por `plan_nombre` |
| Tabla de Planes | Nombre, Tokens, Precio | `getPlanes()` |

**Queries a Supabase:**
- `usuario` → total alumnos + distribución por rol
- `boleta` (pagadas) → ingresos del mes
- `membresia` (vía API `/api/admin/membresias`) → membresías activas + distribución por plan
- `clase_usuario` → tasa de retención (asistencias / total inscripciones)
- `plan` → lista de planes disponibles

### Flujo de datos de admin

```
Supabase (service_role key via API route)
  → GET /api/admin/membresias
    → membresia.getAdminMembresias() ← [membresia.ts]
      → plans.getUsers()              ← [plans.ts]
        → admin/page.tsx (useEffect)
          → StudentsTable (props)
```

### Student Type
```ts
type Student = {
  id: string;
  name: string;
  role: string;       // "Alumno" | "Profesor" | "Admin"
  rut: string;
  phone: string;
  plan: string;       // nombre del plan o "Sin plan"
  tokens: number;     // tokens restantes
  status: string;     // "Activo" | "Inactivo" | "Vencido"
  medicalFileUrl?: string;
  children?: any[];
};
```

---

## 6. Dashboard de Usuario

### Layout (`(dashboard)/layout.tsx`)
- `SidebarUsuarioNuevo` + children

### SidebarUsuarioNuevo (`navbars/SidebarUsuarioNuevo.tsx`)
- Fondo oscuro `#001529`, menú: Dashboard, Planes, Cápsulas, Pagos, Mis Clases, Ayuda
- Mobile: top navbar con menú desplegable
- Persistencia de colapso en localStorage

### Dashboard Client (`(dashboard)/dashboard/dashboard-client.tsx`)
- `TopNavBarUser` — buscador + clases restantes + notificaciones + perfil
- `ProximoEntrenamiento` — próxima clase con countdown. Sin membresía: bloqueado con CTA
- `MiAsistencia` — barra de progreso de tokens del mes
- `MetricasCorporales` — peso, IMC, grasa desde ficha_medica
- `PlanesRender` — si no tiene plan, muestra cards de planes con CTA de compra
- `Recordatorio` — banner de normativa de cancelación
- `CapsulasClient` / `CapsulasRender` / `CapsulaCard` — últimas 4 cápsulas

### Planes Page (`(dashboard)/planes/page.tsx`)
- Fetch de planes desde `plan` table
- 3 cards: Básico (Zap), Popular (Shield, destacado), Premium (Crown)
- Flujo compra: click → verificar ficha médica → si no tiene: abrir `FichaMedicaModal` → al completar: crear membresía → redirect a /dashboard

### FichaMedicaModal (`checkout/FichaMedicaModal.tsx`)
- 2 pasos: PERSONAL (RUT, teléfono, edad, peso, estatura, grupo sanguíneo) → MÉDICA (enfermedades, alergias, medicamentos, observaciones)
- Calcula IMC en vivo
- Guarda en `usuario` (rut, telefono) + `ficha_medica` en Supabase

### Cápsulas Page (`(dashboard)/capsules/`)
- Server component `page.tsx` → `getCapsulas()` → `CapsulesPageClient`
- Featured hero + grid de cards con búsqueda y filtro por categoría
- Datos desde Supabase via nested: `capsula` → `modulo` → `categoria`

### Cápsula Individual (`(dashboard)/capsules/[id]/`)
- Server component: `getCapsulaById(id)` + verifica sesión y membresía
- Renderiza `VideoPlayerView` — reproductor Bunny Stream, progreso, comentarios mock, guía minuto a minuto, material descargable mock
- Sin membresía: muestra pantalla de bloqueo con CTA a `/planes`

---

## 7. Landing Page (Pública)

| Componente | Sección |
|---|---|
| `TopNavBar.jsx` | Navbar fijo con menú + auth buttons |
| `Hero.tsx` | Hero con título, CTA, imagen |
| `Benefits.tsx` | 3 columnas: Entrenamiento Presencial, E-Learning, Alto Rendimiento |
| `About.tsx` | Metodología "Estilo Barcelona" con features |
| `Elearning.tsx` | CTA destacado de cápsulas e-learning |
| `Bento.tsx` | Grid: 2 Sedes + Profesores Certificados |
| `Footer.tsx` | Info, sedes, contacto, privacidad |

---

## 8. API Routes

### Auth
- `GET /api/auth/callback` — Intercambia código OAuth, redirect a /dashboard

### Bunny Stream
| Route | Método | Parámetros | Propósito |
|---|---|---|---|
| `/api/bunny/create` | POST | `{ title }` | Crea video, retorna `{ videoId }` |
| `/api/bunny/upload` | PUT | `?videoId=xxx` + body binario | Sube archivo de video |
| `/api/bunny/delete` | DELETE | `?videoId=xxx` | Elimina video |
| `/api/bunny/get-video` | GET | `?videoId=xxx` | Metadata del video |
| `/api/bunny/get-videos` | GET | `?page=&itemsPerPage=&search=&collection=&orderBy=` | Lista paginada |

### Admin API (bypass RLS con service_role key)
- `GET /api/admin/membresias` — Membresías con plan
  - Verifica sesión y rol admin/profesor
  - Retorna `MembresiaConPlan[]` agrupado por usuario
- `POST /api/admin/students` — Crear alumno/profesor manualmente
  - Verifica sesión y rol admin
  - Crea usuario en `auth.users` (vía adminClient con service_role) + registro en `usuario` + membresía opcional
  - Retorna datos del usuario creado + `tempPassword`
- `GET|POST|PUT|DELETE /api/admin/profesores` — CRUD Profesores
  - `GET` — Lista profesores con total de clases y cápsulas asociadas (incluye listado expandible)
  - `GET ?tipo=dropdown` — Lista profesores para selectores (id, nombre)
  - `POST` — Crea profesor (crea auth user + usuario con rol=profesor, devuelve contraseña temporal)
  - `PUT` — Actualiza nombre, email, telefono
  - `DELETE ?id=xxx` — Elimina profesor (solo si no tiene clases o cápsulas asociadas — error 409)
- `GET|POST|PUT|DELETE /api/admin/capsulas` — CRUD Cápsulas
  - `GET ?tipo=capsulas` (default) — Lista cápsulas con módulo, ordenadas por order_index
  - `GET ?tipo=modulos` — Lista módulos para dropdown
  - `POST` — Crear cápsula (titulo, imagen, creado, duracion, modulo_id, bunny_video_id, order_index)
  - `PUT` — Actualizar cápsula
  - `DELETE ?id=xxx` — Elimina cápsula
- `GET|POST|PUT|DELETE /api/admin/modulos` — CRUD Módulos
  - Verifica sesión y rol admin
  - `GET ?tipo=modulos` (default) — Lista módulos con categoría + total cápsulas
  - `GET ?tipo=categorias` — Lista categorías disponibles
  - `POST` — Crear módulo (nombre, descripcion, categoria_id)
  - `PUT` — Actualizar módulo
  - `DELETE ?id=xxx` — Elimina módulo (solo si no tiene cápsulas asociadas — error 409 si tiene)
- `GET|POST|PUT|DELETE|PATCH /api/admin/clases` — CRUD Clases + Asistencia
  - Verifica sesión y rol admin
  - `GET ?tipo=clases` (default) — Lista clases con horarios, sede, inscritos
  - `GET ?tipo=sedes` — Lista sedes disponibles
  - `GET ?tipo=asistencia-general` — Todos los registros de clase_usuario con nombres
  - `GET ?tipo=asistencia&clase_id=xxx` — Detalle de asistencia por clase (horarios + inscripciones)
  - `POST` — Crear clase + horarios
  - `PUT` — Actualizar clase + reemplazar horarios
  - `DELETE ?id=xxx` — Eliminar clase + horarios + clase_usuario asociados
  - `PATCH { accion: "registrar-asistencia", clase_id, usuario_id, asistencia }` — Marcar asistencia

---

## 9. Webhook / WhatsApp Bot

**Archivo:** `webhook/server.js`
**Puerto:** 3001
**Tecnología:** Express + whatsapp-web.js + Supabase

**Funciones actuales:**
- `getProximaClaseUsuario(usuarioId)` — próxima clase del usuario (clase_usuario → horario → clase)
- `confirmarAsistencia(usuarioId)` — marca `asistencia = true` (provisional, se refactorizará)
- `liberarCupoFantasma(usuarioId)` — elimina inscripción
- `procesarMensajeWhatsApp(telefono, texto)` — busca usuario por teléfono, responde "SI" o "NO"

**WhatsApp Client:**
- LocalAuth con puppeteer (Chrome)
- Escanea QR al iniciar
- Responde mensajes directos (ignora grupos/broadcast)

**Webhook endpoint:** `POST /whatsapp-webhook`

### Flujo de Asistencia (Futuro)

Las clases son **presenciales**. El flujo planeado es:

```
1. Alumno responde "SI" por WhatsApp
   → Se registra intención de asistir (ej: asistencia = "pendiente")

2. La asistencia se confirma REAL cuando:
   a) El horario de la clase ya comenzó (time threshold mínimo),
      O
   b) El alumno escanea un código QR en la sede

   → En ese momento pasa a asistencia = true
```

**Estados de `clase_usuario.asistencia` planeados:**
| Estado | Significado |
|--------|-------------|
| `null` | Inscrito, sin confirmar |
| `'pendiente'` | Confirmó vía WhatsApp que asistirá |
| `true` | Asistió realmente (QR pass o tiempo cumplido) |
| `false` | Ausente |

> Actualmente `asistencia` es BOOLEAN. Habrá que migrar a un tipo más expresivo cuando se implemente QR + threshold.

---

## 10. Capa de Datos (`src/data/`)

| Archivo | Cliente | Exporta | Propósito |
|---|---|---|---|
| `auth.ts` | browser | `getCurrentUser()`, `getUsuario()`, `signOut()`, `signInWithGoogle()`, `onAuthStateChange()` | Autenticación |
| `plans.ts` | browser | `getPlanes()`, `getPlanesLimit()`, `getUsers()` | Planes + Admin users |
| `membresia.ts` | browser | `userHasMembresia()`, `getMembresiaByUser()`, `getAllMembresiasConPlan()`, `getAdminMembresias()`, `createMembresia()` | Membresías |
| `capsules.ts` | server | `getCapsulas()`, `getCapsulaById()` | Cápsulas SSR + detalle individual |
| `capsules-client.ts` | browser | `getCapsulasClient()` | Cápsulas CSR |
| `clases.ts` | browser | `getProximaClase(userId)` + `getClases()`, `getSedes()`, `createClase()`, `updateClase()`, `deleteClase()`, `getAsistenciaGeneral()`, `getAsistenciaPorClase()`, `registrarAsistencia()` | Vía RPC + admin API |
| `modulos.ts` | browser | `getModulos()`, `getCategorias()`, `createModulo()`, `updateModulo()`, `deleteModulo()` | Admin API |
| `capsulas-admin.ts` | browser | `getCapsulasAdmin()`, `getModulosOptions()`, `createCapsula()`, `updateCapsula()`, `deleteCapsula()` | Admin API |
| `profesores.ts` | browser | `getProfesores()`, `getProfesoresDropdown()`, `createProfesor()`, `updateProfesor()`, `deleteProfesor()` | Admin API |
| `fichaMedica.ts` | browser | `updateUserProfile()`, `createFichaMedica()`, `userHasFichaMedica()`, `getFichaMedicaByUser()`, `calculateIMC()`, `getIMCStatus()` | Ficha médica |

---

## 11. Paleta de Colores

| Color | Uso | Hex |
|---|---|---|
| Azul profundo | Fondos oscuros, headers | `#001529`, `#001c37`, `#002447`, `#002a58`, `#00305B`, `#004080`, `#001730` |
| Naranja primario | CTAs, acentos, hover | `#F28C28`, `#F39200`, `#FC9910`, `#f59e0b`, `#c26d03` |
| Verde éxito | Cápsulas, confirmación | `#00A86B`, `#009960` |
| Fondo página | Layout principal | `#F8F9FB`, `#f9fafb` |
| Azul claro | Backgrounds hover | `#D3E3FF`, `#e0f2fe` |

---

## 12. Pendientes / Problemas Conocidos

1. ~~**Ruta `/perfil` no existe**~~ ✅ Resuelto — página en `(public)/perfil/page.tsx`
2. **RLS en `membresia`** — No hay policy para admin/staff, se usa API route con service_role key como workaround
3. **Falta `SUPABASE_SERVICE_ROLE_KEY`** en `.env.local` — necesario para que admin vea membresías y cree usuarios
4. ~~**Rutas del sidebar admin no existen**~~ ✅ Todas las rutas del sidebar implementadas: analíticas, clases, módulos, cápsulas, profesores
5. ~~**Admin page sin `AuthGuard`**~~ ✅ Resuelto — `layout.tsx` tiene `<AuthGuard allowedRoles={["administrador"]}>`
6. **CreateStudentModal no persiste apoderados con hijos** — el modal crea el usuario pero no vincula hijos al apoderado
7. **`sidebar-collapsed` no persiste** en el Sidebar de admin (sí en SidebarUsuarioNuevo)
8. **`SideBarUsuario` legacy** — sidebar viejo con nombre "Kinetic", no usado actualmente
9. **TopNavBar.jsx** — links del menú apuntan a `#` (placeholder)
10. **Membresía tiene campo `estado`** (boolean según triggers) — no incluido en los tipos actuales
11. **Trigger `handle_new_user`** — asigna `rol = 'jugador'` por defecto a nuevos registros
---

---

# Plan de Debug General

Generado: 2026-06-12. Basado en auditoría completa del código fuente (todos los .ts, .tsx, .js, .sql).

## ⚠️ CRÍTICO (P0) — hace algo inseguro o no funciona

- [ ] **0. `src/data/horario.ts` y `clase_usuario.ts` también referencian schema eliminado**
  - `src/data/horario.ts` líneas 13, 25, 36: queries a tabla `horario` que no existe. Rompe calendario del profesor.
  - `src/data/clase_usuario.ts:44-47`: `actualizarAsistenciaPorHorario` referencia `horario_id` que no existe en `clase_usuario` (fue reemplazado por `clase_id`).
  - **Fix**: migrar a schema actual (fecha_hora está ahora en `clase`).

- [ ] **1. Webhook roto: schema desactualizado**
  - `webhook/data.js`: referencia `clase_usuario.horario_id` y tabla `horario` que fueron eliminados del schema (reemplazados por `clase_usuario.clase_id` con fecha_hora directa en `clase`).
  - **Impacto**: WhatsApp bot entero no funciona — confirmar/cancelar asistencia, recordatorios, scheduler, todo falla silenciosamente.
  - **Fix**: Reescribir webhook/data.js usando schema actual.

- [ ] **2. Bunny API routes sin autenticación**
  - `src/app/api/bunny/create/route.ts`, `upload/route.ts`, `delete/route.ts`, `get-video/route.ts`, `get-videos/route.ts`
  - Cualquier persona (sin sesión) puede crear/subir/borrar videos de Bunny.net.
  - **Fix**: Agregar `verifyAdmin()` o al menos verificar sesión de Supabase.

- [ ] **3. Secrets de Flow hardcodeados en test-flow.mjs**
  - `test-flow.mjs` líneas 3-4: `FLOW_API_KEY` y `FLOW_SECRET_KEY` de producción en texto plano.
  - **Fix**: Mover a `.env.local`, leer con `process.env`, agregar archivo a `.gitignore`.

- [ ] **4. Service role key expuesta como `NEXT_PUBLIC_`**
  - `.env.local`: variable `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` contiene la service_role key y tiene prefijo `NEXT_PUBLIC_`, expuesta al browser.
  - **Fix**: Renombrar sin `NEXT_PUBLIC_`, verificar que ningún cliente browser la use.

- [ ] **5. Flow webhook: verificación de pago bypassable**
  - `src/app/api/flow/webhook/route.ts`: si `getFlowPaymentStatus` lanza error, confía en body POST sin verificar con Flow.
  - **Fix**: No confiar en body no verificado; siempre validar con Flow API antes de marcar como pagado.

## 🔴 ALTO (P1) — bug funcional, authorization o UX blocking

### Seguridad y Auth

- [ ] **6. Dashboard layout sin AuthGuard**
  - `src/app/(dashboard)/layout.tsx`: no protege rutas. Usuarios no autenticados pueden acceder a /dashboard, /planes, /pagos, /misclases, /capsules, /configuracion.
  - **Fix**: Agregar `<AuthGuard>` en dashboard layout.

- [ ] **7. students/status route usa anon key para auth check**
  - `src/app/api/admin/students/status/route.ts`: usa anon key + query manual a usuario.rol en vez de `verifyAdmin()`.
  - **Fix**: Usar `verifyAdmin()` como las demás admin routes.

### Membresía y Tokens

- [ ] **8. Race condition en inscripción a clases**
  - `src/app/api/clases/inscribir/route.ts`: entre el check de inscripción existente y el INSERT, dos requests concurrentes pueden crear duplicados.
  - **Fix**: Agregar unique constraint `(usuario_id, clase_id)` + `ON CONFLICT DO NOTHING`.

- [ ] **9. `membresia.ts` guarda fecha completa en columna `mes`**
  - `src/data/membresia.ts:168`: `mes = "2026-06-12"` en vez de `"2026-06"`.
  - Queries con `gte`/`lte` por mes fallan en los bordes del mes.
  - **Fix**: `mes = now.toISOString().slice(0, 7)`.

- [ ] **10. Membresía en cápsulas no filtra por mes actual**
  - `src/app/(dashboard)/capsules/[id]/page.tsx:28-31`: query a membresía sin filtro de mes. Cualquier membresía pasada da acceso.
  - **Fix**: Agregar filtro por mes actual (`.gte("mes", mesStart).lte("mes", mesEnd)`).

### Webhook y WhatsApp

- [ ] **11. devolverToken siempre dice éxito aunque falle**
  - `webhook/handlers.js:19-20`: ignora el booleano de `devolverToken`. Siempre responde "Te devolvimos el token".
  - **Fix**: Validar return y mensaje condicional.

### Inscripción y Asistencia

- [ ] **12. Profesor/clases excluye alumnos sin confirmar**
  - `src/data/profesor-clases.ts:118`: filtro excluye `"sin_confirmar"` y `"pendiente"`.
  - Alumnos recién inscritos invisibles en control de asistencia del profesor.
  - **Fix**: Incluir esos estados en el `.in()`.

### Profesor/Asistencia

- [ ] **12b. `fetchProfesorClaseIds` busca en tabla incorrecta**
  - `src/data/profesor-clases.ts:70-84`: busca `clase_usuario` filtrando por `usuario_id` = profesorId. Esto encuentra clases donde el profesor está inscrito COMO ALUMNO. La tabla correcta es `clase` con filtro por `profesor_id`.
  - **Impacto**: el profesor nunca ve "Mis clases" en el calendario (nunca se marcan como `isMine: true`).
  - **Fix**: cambiar a `.from("clase").select("id").eq("profesor_id", profesorId)`.

- [ ] **12c. `cerrarAsistencia` y `ControlAsistencia` usan "no asistio" con espacio**
  - `src/data/profesor-clases.ts:169` y `src/components/profesor/ControlAsistencia.tsx:96`: guardan `"no asistio"` (con espacio) en la BD, pero el valor correcto es `"no_asistio"` (con underscore) como se usa en el resto del sistema.
  - **Impacto**: valor inconsistente en la BD, puede no ser reconocido por otras queries o validaciones.
  - **Fix**: cambiar a `"no_asistio"`.

### Flow/Pagos

- [ ] **13b. create-order route hardcodea `localhost:3000` en urlReturn**
  - `src/app/api/flow/create-order/route.ts:158`: `urlReturn: "http://localhost:3000/pagos?token={token}&boletaId=${boleta.id}"` — ignora la variable `publicUrl` definida en línea 149.
  - **Impacto**: en producción, Flow redirige a localhost:3000 en vez del dominio real.
  - **Fix**: `urlReturn: \`${publicUrl}/pagos?boletaId=${boleta.id}&flowReturn=1\``

- [ ] **13. Type coercion bug en flow/confirm**
  - `src/app/api/flow/confirm/route.ts:44`: `commerceOrder !== boletaId` — Flow puede devolver `commerceOrder` como número.
  - **Fix**: `String(commerceOrder) !== boletaId`.

- [ ] **14. Flow webhook: sandbox fallback traga errores de prod**
  - `src/app/api/flow/webhook/route.ts:48-58`: si `getFlowPaymentStatus` falla en prod, retorna 200 OK y descarta la notificación.
  - **Fix**: Log de error + al menos no hacer silent OK.

### UI/UX

- [ ] **15. FichaMedicaModal: campos médicos todos requeridos**
  - `src/components/checkout/FichaMedicaModal.tsx:122-124`: `validateStep2` exige enfermedades, alergias, medicamentos, observaciones no vacíos. Usuarios sin condiciones deben escribir "Ninguna".
  - **Fix**: Validar solo si hay contenido (strings vacías OK).

- [ ] **16. Login: dos botones de Google idénticos**
  - `src/components/Login/login.tsx:54-117`: "Iniciar Sesion" y "Registrarse" llaman exactamente la misma función `handleGoogleLogin`.
  - **Fix**: Unificar en un botón o separar flujos reales.

## 🟡 MEDIO (P2) — calidad, UX, errores visibles

- [ ] **17. SidebarUsuarioNuevo muestra "Admin Panel" como subtítulo**
  - `src/components/navbars/SidebarUsuarioNuevo.tsx:66`: estudiantes ven "Admin Panel". Debe mostrar algo como "Panel de Usuario".

- [ ] **18. AdminHeader hardcodea "Pablo Escobar"**
  - `src/components/admin/AdminHeader.tsx:150`: nombre hardcodeado. Usar `useAuthUser()`.

- [ ] **19. SideBarUsuario.tsx (legacy): "Kinetic" + rutas rotas**
  - `src/components/navbars/SideBarUsuario.tsx`: marca "Kinetic", rutas `/calendar`, `/payments`, `/classes` que no existen. Template de otro proyecto.
  - **Fix**: Eliminar el archivo si no se usa.

- [ ] **20. PróximoEntrenamiento: countdown estático (nunca hace tick)**
  - `src/components/userDashboard/ProximoEntrenamiento.tsx:117-119`: diff calculado una vez al render. No hay setInterval.
  - **Fix**: `useEffect` + `setInterval` cada 60s.

- [ ] **21. VideoPlayerView: clases Tailwind dinámicas no se generan**
  - `src/components/videoPlayer/VideoPlayerView.tsx:290-291`: `bg-${color}-500/10` etc. Tailwind JIT no genera clases por interpolación de strings.
  - Badges de documentos sin color de fondo/texto.
  - **Fix**: Mapeo de objeto con clases literales.

- [ ] **22. FichaMedicaModal: parseInt trunca decimales de estatura**
  - `src/components/checkout/FichaMedicaModal.tsx:143`: `parseInt(estatura)` → `175.5` se trunca a `175`.
  - **Fix**: `parseFloat(estatura)`.

- [ ] **23. clases.ts: acceso frágil a nested array de Supabase**
  - `src/data/clases.ts:52-53`: `c?.[0]` asume respuesta array. Si Supabase devuelve objeto single, es `undefined`.
  - **Fix**: `Array.isArray(c) ? c[0] : c`.

- [ ] **24. MetricasCorporales: no-op .replace()**
  - `src/components/userDashboard/MetricasCorporales.tsx:149`: `.replace("text-", "text-")` — se reemplaza a sí mismo.
  - **Fix**: Usar `imcStatus.color` directamente.

## 🟢 BAJO (P3) — deuda técnica, refactor, configuración

- [ ] **25. test-flow.mjs usa URL tunnel hardcodeada**
  - `BASE_URL = "https://113dd18786e138.lhr.life"`. Hacer configurable vía env var.

- [ ] **26. Test setup silencia todo console output**
  - `src/tests/setup.ts:5-9`: mockea `console.log/warn/error`. Dificulta debuggear tests fallidos.

- [ ] **27. misclases-client.tsx usa localStorage directo sin try/catch**
  - `loadCache`/`saveCache`: puede explotar si localStorage no disponible. Agregar try/catch.

- [ ] **28. capsules-admin.ts: fallback silencioso enmascara errores de schema**
  - Líneas 37-48: si query con `profesor_id` falla, reintenta sin él. Oculta errores de esquema.

- [ ] **29. misclases-calendario.ts usa `any`**
  - `src/data/misclases-calendario.ts:38`: `(clases ?? []).map((clase: any)`. Definir interfaz.

- [ ] **30. Archivos muy grandes — refactorizar**
  - `pagos-client.tsx` (~1400 líneas), `misclases-client.tsx` (~747 líneas). Separar en componentes.

## ✅ REALIZADOS

- [x] Flow: `{token}` en `urlReturn` eliminado, reemplazado por `flowReturn=1`
- [x] Flow confirm: token opcional, fallback a estado Supabase
- [x] Frontend pagos: detecta `flowReturn`, polling 15 intentos, cleanup orphaned
- [x] Token consumption en inscripción a clases (antes del INSERT, rollback en fallo)
- [x] Admin DELETE clase: devuelve tokens vía `devolver_token()` RPC
- [x] CASCADE DELETE en `clase_usuario.clase_id` → `clase.id`
- [x] Trigger `manejar_inscripcion_clase()` modificado: solo valida, no descuenta
- [x] Función `devolver_token()` RPC desplegada en Supabase
