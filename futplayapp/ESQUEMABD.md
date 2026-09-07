# Esquema de Base de Datos - Futplay

> Generado: 2026-07-09
> Base de datos: PostgreSQL (Supabase)
> Proyecto: Futplay App

---

## 📋 Tablas

### `usuario`
Almacena los usuarios del sistema (jugadores, profesores, administradores).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | gen_random_uuid() | Identificador único |
| `nombre` | text | NOT NULL | - | Nombre completo |
| `email` | text | NOT NULL | - | Email único |
| `telefono` | text | NULL | - | Teléfono (WhatsApp) |
| `foto_url` | text | NULL | - | URL de foto de perfil |
| `rut` | text | NULL | - | RUT chileno |
| `rol` | USER-ENUM | NOT NULL | - | Rol: `jugador`, `profesor`, `administrador` |
| `created_at` | timestamp | NOT NULL | now() | Fecha de creación |

**Índices:**
- `usuario_pkey` PRIMARY KEY (id)
- `usuario_email_key` UNIQUE (email)
- `unique_email` UNIQUE (email)
- `usuario_telefono_key` UNIQUE (telefono)

---

### `plan`
Planes de membresía disponibles.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | gen_random_uuid() | Identificador único |
| `nombre` | text | NOT NULL | - | Nombre del plan |
| `precio` | integer | NOT NULL | - | Precio en CLP |
| `tokens_mensuales` | integer | NOT NULL | - | Tokens incluidos por período |
| `dias` | integer | NOT NULL | 30 | Días de vigencia del plan |
| `dias_vigencia` | integer | NOT NULL | 30 | Días de vigencia (alternativo) |
| `tipo_plan` | USER-ENUM | NULL | - | Tipo: `normal`, `familiar`, `kids` |
| `codigo_acceso` | text | NULL | - | Código para planes especiales |
| `created_at` | timestamp | NOT NULL | now() | Fecha de creación |

**Índices:**
- `plan_membresia_pkey` PRIMARY KEY (id)
- `plan_membresia_nombre_key` UNIQUE (nombre)
- `plan_codigo_acceso_key` UNIQUE (codigo_acceso) WHERE codigo_acceso IS NOT NULL

---

### `membresia`
Membresías activas de los usuarios.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | gen_random_uuid() | Identificador único |
| `usuario_id` | uuid | NOT NULL | - | FK a `usuario.id` |
| `plan_id` | uuid | NOT NULL | - | FK a `plan.id` |
| `boleta_id` | uuid | NULL | - | FK a `boleta.id` (opcional) |
| `tokens_totales` | integer | NOT NULL | - | Tokens totales del plan |
| `tokens_usados` | integer | NOT NULL | 0 | Tokens consumidos |
| `fecha_inicio` | timestamptz | NOT NULL | now() | Inicio de vigencia |
| `fecha_vencimiento` | timestamptz | NOT NULL | - | Fin de vigencia |
| `estado` | boolean | NOT NULL | true | Activa/inactiva |
| `created_at` | timestamp | NOT NULL | now() | Fecha de creación |

**Índices:**
- `membresia_pkey` PRIMARY KEY (id)
- `idx_membresia_boleta_id` UNIQUE (boleta_id) WHERE boleta_id IS NOT NULL
- `uq_membresia_user_mes` UNIQUE (usuario_id, fecha_inicio)
- `unique_usuario_mes` UNIQUE (usuario_id, fecha_inicio)

---

### `sede`
Sedes donde se realizan las clases.


---

### `boleta`
Boletas de compra (Flow.cl).

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id` | uuid | NOT NULL | gen_random_uuid() |
| `usuario_id` | uuid | NOT NULL | - |
| `estado` | text | NOT NULL | `pendiente` |
| `total` | integer | NOT NULL | - |
| `transaccion_id` | text | NULL | - |
| `recurrencia_id` | uuid | NULL | - |
| `flow_confirmada` | boolean | NOT NULL | false |
| `cuotas` | integer | NULL | - |
| `created_at` | timestamp | NOT NULL | now() |
| `updated_at` | timestamp | NOT NULL | now() |

**Índices:** `boleta_pkey` PRIMARY KEY (id)

---

### `boleta_item`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id` | uuid | NOT NULL | gen_random_uuid() |
| `boleta_id` | uuid | NOT NULL | - |
| `plan_id` | uuid | NOT NULL | - |
| `producto_id` | uuid | NULL | - |
| `cantidad` | integer | NOT NULL | 1 |
| `precio` | integer | NOT NULL | - |
| `total` | integer | NOT NULL | - |

**Índices:** `boleta_item_pkey` PRIMARY KEY (id)

---

### `recurrencia`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id` | uuid | NOT NULL | gen_random_uuid() |
| `usuario_id` | uuid | NOT NULL | - |
| `plan_id` | uuid | NOT NULL | - |
| `activa` | boolean | NOT NULL | true |
| `created_at` | timestamp | NOT NULL | now() |

**Índices:** `recurrencia_pkey` PRIMARY KEY (id)

---

### `producto`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id` | uuid | NOT NULL | gen_random_uuid() |
| `nombre` | text | NOT NULL | - |
| `tipo` | text | NOT NULL | - |
| `precio` | integer | NOT NULL | - |

**Índices:** `producto_pkey` PRIMARY KEY (id)

---

### `ficha_medica`

| Columna | Tipo | Nullable |
|---------|------|----------|
| `usuario_id` | uuid | NOT NULL (PK) |
| `fecha_nacimiento` | date | NULL |
| `perfil` | USER-ENUM | NULL |
| `grupo_sanguineo` | text | NULL |
| `estatura_cm` | integer | NULL |
| `peso_kg` | numeric | NULL |
| `imc` | real | NULL |
| `enfermedades` | text | NULL |
| `alergias` | text | NULL |
| `medicamentos` | text | NULL |
| `observaciones` | text | NULL |
| `historial_lesiones` | text | NULL |
| `afecciones_cardiacas` | text | NULL |
| `updated_at` | timestamp | NOT NULL |

**Índices:** `ficha_medica_pkey` PRIMARY KEY (usuario_id)

---

### `categoria`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|

---

## 🔧 Funciones (Triggers)

### `manejar_inscripcion_clase()`
**Tabla:** `clase_usuario` (BEFORE INSERT)

Valida inscripción a clase:
1. Verifica que la clase exista
2. Carga membresía ACTIVA por vigencia
3. Descuenta 1 token SOLO si `tipo_evento <> 'partido'`
4. Valida tokens disponibles

---

### `limitar_15_alumnos()`
**Tabla:** `clase_usuario` (BEFORE INSERT)

Valida cupo máximo:
- Default 15 si no se configuró
- Excluye cancelados del conteo
- Usa SECURITY DEFINER para evitar RLS

---

### `devolver_token(p_usuario_id uuid)`
**Tipo:** RPC

Devuelve 1 token a la membresía activa del usuario.

---

## 📊 Enums

```sql
CREATE TYPE usuario_rol AS ENUM ('jugador', 'profesor', 'administrador');
CREATE TYPE clase_tipo_evento AS ENUM ('entrenamiento', 'partido', 'kids');
CREATE TYPE clase_usuario_asistencia AS ENUM (
    'sin_confirmar', 'pendiente', 'confirmado_whatsapp',
    'asistio', 'no_asistio', 'cancelado', 'cancelado_sin_reembolso'
);
CREATE TYPE plan_tipo AS ENUM ('normal', 'familiar', 'kids');
```

---

## 🔄 Relaciones (FK)

```
usuario ─┬─< membresia >──┬─ plan
         │                 │
         ├─< clase_usuario >─< clase >── sede
         │
         ├─< boleta >──< boleta_item >── plan
         │
         ├─< recurrencia
         │
         ├─< ficha_medica
         │
         ├─< comentario >──< capsula >──< modulo >── categoria
         │
         └─< documento >── capsula
```

---

## ⚙️ Scheduler (Webhook)

Cada 15 minutos:
1. Enviar recordatorios 24h antes (WhatsApp)
2. Marcar `pendiente` → `cancelado_sin_reembolso` (clases pasadas)
3. Marcar `confirmado_whatsapp` → `no_asistio` (clases pasadas + 1h)

---

## 📌 Notas

1. **Horario Chile:** Fechas en UTC, conversión a `America/Santiago` en código
2. **Tokens:** Partidos NO descuentan tokens
3. **Cancelaciones:**
   - ≥ 3h: `cancelado` + devuelve token
   - < 3h: `cancelado_sin_reembolso`
   - < 1h: No permitida
4. **Cupo:** Default 15, cancelaciones NO ocupan cupo
5. **Membresía activa:** `estado=true` AND `fecha_inicio <= now() <= fecha_vencimiento`

| `id` | uuid | NOT NULL | gen_random_uuid() |
| `nombre` | text | NOT NULL | - |
| `created_at` | timestamptz | NOT NULL | now() |

**Índices:** `categorias_pkey` PRIMARY KEY (id), `categorias_nombre_key` UNIQUE (nombre)

---

### `modulo`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id` | uuid | NOT NULL | gen_random_uuid() |
| `nombre` | text | NOT NULL | - |
| `descripcion` | text | NULL | - |
| `categoria_id` | uuid | NULL | - |
| `duracion` | interval | NULL | - |
| `created_at` | timestamptz | NOT NULL | now() |

**Índices:** `modulos_pkey` PRIMARY KEY (id)

---

### `capsula`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id` | uuid | NOT NULL | gen_random_uuid() |
| `titulo` | text | NOT NULL | - |
| `descripcion` | text | NULL | - |
| `modulo_id` | uuid | NULL | - |
| `profesor_id` | uuid | NULL | - |
| `bunny_video_id` | text | NULL | - |
| `imagen` | text | NULL | - |
| `duracion` | interval | NULL | - |
| `order_index` | integer | NULL | - |
| `creado` | text | NULL | - |
| `created_at` | timestamptz | NOT NULL | now() |

**Índices:** `capsulas_pkey` PRIMARY KEY (id)

---

### `documento`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id` | uuid | NOT NULL | gen_random_uuid() |
| `nombre` | text | NOT NULL | - |
| `url_archivo` | text | NOT NULL | - |
| `capsula_id` | uuid | NULL | - |
| `tipo_archivo` | text | NULL | - |
| `created_at` | timestamptz | NOT NULL | now() |

**Índices:** `documento_pkey` PRIMARY KEY (id)

---

### `comentario`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id` | uuid | NOT NULL | gen_random_uuid() |
| `usuario_id` | uuid | NOT NULL | - |
| `capsula_id` | uuid | NOT NULL | - |
| `contenido` | text | NOT NULL | - |
| `created_at` | timestamptz | NOT NULL | now() |

**Índices:** `comentario_pkey` PRIMARY KEY (id)

---

### `clase_backup_fechas`

| Columna | Tipo | Nullable |
|---------|------|----------|
| `id` | uuid | NOT NULL |
| `fecha_hora` | timestamp | NULL |

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | gen_random_uuid() | Identificador único |
| `nombre` | text | NOT NULL | - | Nombre de la sede |

**Índices:**
- `sede_pkey` PRIMARY KEY (id)
- `sede_nombre_key` UNIQUE (nombre)

---

### `clase`
Clases/entrenamientos/partidos programados.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | gen_random_uuid() | Identificador único |
| `titulo` | USER-ENUM | NULL | - | Título/clase tipo |
| `descripcion` | text | NOT NULL | - | Descripción de la clase |
| `tipo_evento` | USER-ENUM | NOT NULL | - | Tipo: `entrenamiento`, `partido`, `kids` |
| `cupo_maximo` | integer | NULL | 15 | Máximo de alumnos |
| `profesor_id` | uuid | NULL | - | FK a `usuario.id` |
| `sede_id` | uuid | NULL | - | FK a `sede.id` |
| `fecha_hora` | timestamptz | NULL | - | Fecha y hora (Chile) |
| `created_at` | timestamp | NOT NULL | now() | Fecha de creación |

**Índices:**
- `clase_pkey` PRIMARY KEY (id)

---

### `clase_usuario`
Inscripciones de usuarios a clases.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | gen_random_uuid() | Identificador único |
| `usuario_id` | uuid | NOT NULL | - | FK a `usuario.id` |
| `clase_id` | uuid | NOT NULL | - | FK a `clase.id` |
| `asistencia` | USER-ENUM | NULL | `sin_confirmar` | Estado de asistencia |
| `created_at` | timestamp | NOT NULL | now() | Fecha de creación |

**Índices:**
- `clase_usuario_pkey` PRIMARY KEY (id)
- `clase_usuario_usuario_clase_key` UNIQUE (usuario_id, clase_id)

**Valores de `asistencia`:**
- `sin_confirmar` - Pendiente de confirmación
- `pendiente` - Recordatorio enviado
- `confirmado_whatsapp` - Confirmado por WhatsApp
- `asistio` - Asistió a la clase
- `no_asistio` - No asistió
- `cancelado` - Cancelado (devuelve token)
- `cancelado_sin_reembolso` - Cancelado sin devolver token
