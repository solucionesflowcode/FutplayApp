<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# FutPlay App - Sistema de Autenticación

## Estructura del Proyecto

```
src/
├── app/                              # App Router de Next.js
│   ├── (public)/                      # Grupo de rutas públicas
│   │   ├── home/page.tsx              # Landing page
│   │   ├── login/page.tsx             # Página de login
│   │   └── perfil/page.tsx            # Perfil del usuario
│   ├── (admin)/                       # Grupo de rutas admin
│   │   └── admin/page.tsx            # Panel de administración
│   ├── (dashboard)/                   # Grupo de rutas dashboard
│   │   └── dashboard/page.tsx        # Dashboard de usuario
│   ├── api/                           # API Routes
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts          # Callback OAuth de Google
│   ├── layout.tsx                    # Layout raíz (AuthProvider)
│   ├── page.tsx                      # Redirector según rol
│   ├── globals.css                    # Estilos globales
│   └── middleware.ts                  # Middleware de Supabase
├── components/                       # Componentes reutilizables
│   ├── landingPage/
│   ├── Login/
│   └── navbars/
├── context/                          # Contextos de React
│   ├── AuthContext.tsx               # Contexto de autenticación
│   ├── AuthGuard.tsx                 # Protector de rutas
│   └── index.ts                      # Exports
└── utils/supabase/                   # Clientes de Supabase
    ├── client.ts                      # Cliente browser
    ├── server.ts                      # Cliente server
    └── middleware.ts                  # Middleware helper
```

---

## Archivos del Sistema de Autenticación

### 1. `src/context/AuthContext.tsx`

**Proveedor del contexto de autenticación con Supabase.**

- `AuthProvider` - Envuelve la app para dar acceso al estado de auth
- `useAuthUser()` - Hook para acceder a los datos del usuario

**Estado proporcionado:**
```ts
{
  user: User | null,           // Usuario de Supabase Auth
  usuario: Usuario | null,      // Datos de la tabla usuario
  loading: boolean,             // Cargando sesión
  error: string | null,         // Error si ocurre
  signOut: () => Promise<void>, // Cerrar sesión
  refreshUser: () => Promise<void> // Recargar datos
}
```

### 2. `src/context/AuthGuard.tsx`

**Componente para proteger rutas según rol.**

```tsx
<AuthGuard allowedRoles={["administrador"]}>
  <PanelAdmin />
</AuthGuard>
```

- Muestra loader mientras carga
- Redirige a `/login` si no está autenticado
- Redirige a `/perfil` si no tiene el rol requerido

### 3. `src/context/index.ts`

Exporta: `AuthProvider`, `useAuthUser`, `AuthGuard`, `Rol`, `Usuario`

### 4. `src/app/layout.tsx`

**Layout raíz.** Envuelve toda la app con `AuthProvider`.

### 5. `src/app/page.tsx`

**Redirector raíz.** Detecta el rol del usuario y redirige:

| Rol | Redirect |
|-----|----------|
| Sin usuario | → `/login` |
| administrador | → `/admin` |
| profesor | → `/dashboard` |
| jugador | → `/dashboard` |

### 6. `src/app/api/auth/callback/route.ts`

**Route handler para OAuth.**

1. Recibe `?code=...` de Google
2. Intercambia el código por sesión de Supabase
3. Guarda cookies de sesión
4. Redirige a `/perfil`

### 7. `src/app/(public)/login/page.tsx`

**Página de login.** Renderiza el componente `Login`.

### 8. `src/app/(public)/perfil/page.tsx`

**Página de perfil del usuario.**

Muestra:
- Email (de Supabase Auth)
- Nombre (de tabla usuario)
- Rol (de tabla usuario)
- Botón para cerrar sesión

---

## Tipos de Datos

### Roles
```ts
type Rol = "jugador" | "profesor" | "administrador";
```

### Usuario
```ts
interface Usuario {
  id: string;       // UUID, coincide con auth.users.id
  nombre: string;    // Nombre del usuario
  rol: Rol;          // Rol en el sistema
  email?: string;    // Opcional
}
```

---

## Tabla Requerida en Supabase

```sql
CREATE TYPE rol_enum AS ENUM ('jugador', 'profesor', 'administrador');

CREATE TABLE usuario (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  rol rol_enum NOT NULL DEFAULT 'jugador'
);
```

---

## Flujo de Autenticación

```
1. Usuario → /login
2. Click "Iniciar sesión con Google"
3. Supabase → Google OAuth
4. Google → /api/auth/callback?code=...
5. exchangeCodeForSession() → Guardar cookies
6. Redirect → /perfil
7. useAuthUser() → Obtiene user + consulta tabla usuario
8. Mostrar perfil con nombre y rol
```

---

## Uso en Componentes

### Verificar rol y renderizar vista
```tsx
const { usuario } = useAuthUser();

switch (usuario?.rol) {
  case "administrador":
    return <AdminPanel />;
  case "profesor":
    return <ProfesorPanel />;
  case "jugador":
    return <JugadorPanel />;
}
```

### Proteger ruta
```tsx
<AuthGuard allowedRoles={["administrador"]}>
  <PanelAdmin />
</AuthGuard>
```

---

## Configuración de Supabase

**Authentication → URL Configuration:**
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**:
  - `http://localhost:3000/**`
  - `http://localhost:3000/api/auth/callback`

---

## Configuración de Google Cloud

**APIs y servicios → Credenciales → OAuth Client:**
- **Orígenes JS**: `http://localhost:3000`
- **Redirect URIs**: `https://[tu-proyecto].supabase.co/auth/v1/callback`
