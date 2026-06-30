# Informe: Inconsistencias de fecha/hora en membresia, boleta, clase, recurrencia, plan

## Resumen Ejecutivo

Se detectaron **3 formatos distintos** para el campo `membresia.mes` repartidos en diferentes archivos del código. Esto provoca que el cálculo de vencimiento de membresía (`membresiaActiva()`) dé resultados incorrectos, que el constraint `UNIQUE (usuario_id, mes)` sea fácil de eludir, y que la visualización de fechas sea inconsistente.

Adicionalmente, hay problemas menores de zona horaria en `clase.fecha_hora` y falta de actualización automática en `plan.updated_at`.

---

## 1. CRÍTICO: `membresia.mes` — 3 formatos distintos según el origen

### El campo `mes` en Supabase

El tipo del campo `mes` en la tabla `membresia` **no es `DATE` ni `TIMESTAMP`** — PostgREST lo trata como texto. Esto permite que distintos orígenes inserten valores con formatos incompatibles.

### Formato correcto (esperado): `YYYY-MM-01`

**Código correcto:**
| Archivo | Línea | Fórmula |
|---------|-------|---------|
| `src/data/membresia.ts` | 185 | `` `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01` `` |
| `src/app/api/flow/webhook/route.ts` | 212 | Misma fórmula |
| `src/app/api/flow/confirm/route.ts` | 41 | Misma fórmula |
| `src/app/api/clases/inscribir/route.ts` | 106 | Misma fórmula (reinscripción) |

**Produce:** `"2026-06-01"` → `new Date("2026-06-01")` = 1 de junio 00:00 local → vence 1 de julio ✅

### Formato incorrecto #1 (recurrencia): `YYYY-MM-DDTHH:mm:ss.sssZ`

| Archivo | Línea | Código problemático |
|---------|-------|---------------------|
| `src/app/api/flow/webhook/route.ts` | 140 | `const mes = new Date().toISOString();` |

**Produce:** `"2026-06-15T14:30:00.000Z"` → `new Date("...")` = 15 de junio → vence **15 de julio** ❌

Esto ocurre solo en el **flujo de cobro recurrente** (cuando un pago recurrente de Flow gatilla la creación de una nueva membresía). Como resultado:
- La membresía dura 15 días más de lo esperado
- El constraint `UNIQUE (usuario_id, mes)` no frena duplicados si ya existe un `"2026-06-01"` para el mismo usuario (son strings distintas)

### Formato incorrecto #2 (admin): `YYYY-MM-DDT HH:mm:ss.sssZ`

| Archivo | Línea | Código problemático |
|---------|-------|---------------------|
| `src/app/api/admin/students/status/route.ts` | 64 | `const mes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();` |
| `src/app/api/admin/students/route.ts` | 74 | `const mes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();` |

**Produce:** `"2026-06-01T04:00:00.000Z"` (Santiago UTC-4) → `new Date("...")` = 1 de junio 04:00 UTC → vence **1 de julio 04:00 UTC** ⚠️

Aquí la intención era correcta (primer día del mes), pero `toISOString()` fuerza una conversión a UTC que:
- En husos negativos como Santiago (UTC-4/UTC-3), la fecha se desplaza 3-4 horas
- En el extremo de Chile (UTC-5), si el mes cambia al UTC, podría incluso aterrizar en el mes anterior
- El cálculo de vencimiento `membresiaActiva()` trabaja con `new Date(fecha)`, que interpreta UTC correctamente, pero la hora exacta del vencimiento dependerá de la hora local del servidor

### Impacto en la DB actual

Tras inspeccionar la DB de Supabase (solo 2 registros de membresía): se encontraron ambos formatos ya en producción, confirmando que el bug está activo.

### Impacto en `membresiaActiva()` y `calcularVencimiento()`

```typescript
// src/lib/fechas.ts
export function calcularVencimiento(fecha: string): Date {
  const date = new Date(fecha);
  return new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
}
```

| Formato `mes` | `new Date(mes)` | Vencimiento (30d) | Diferencia vs esperado |
|--------------|----------------|-------------------|----------------------|
| `"2026-06-01"` | Jun 1 00:00 | Jul 1 00:00 | ✅ Exacto |
| `"2026-06-15T14:30:00.000Z"` | Jun 15 14:30 UTC | Jul 15 14:30 UTC | ❌ +15 días |
| `"2026-06-01T04:00:00.000Z"` | Jun 1 04:00 UTC | Jul 1 04:00 UTC | ⚠️ +4 horas |

### Impacto en el trigger SQL `manejar_inscripcion_clase()`

```sql
WHERE date_trunc('month', mes) = date_trunc('month', current_date)
```

`date_trunc('month', ...)` trunca cualquier timestamp al primer día del mes a las 00:00. Esto funciona correctamente con los 3 formatos porque PostgreSQL parsea todos como timestamp válidos. **El trigger no se ve afectado**, pero el cálculo de `membersiaActiva()` del lado TypeScript sí.

### Solución propuesta

1. **Corregir `webhook/route.ts:140`** (recurrencia): Cambiar de:
   ```typescript
   const mes = new Date().toISOString();
   ```
   a:
   ```typescript
   const ahora = new Date();
   const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`;
   ```

2. **Corregir `students/status/route.ts:64` y `students/route.ts:74`** (admin): Cambiar de:
   ```typescript
   const mes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
   ```
   a:
   ```typescript
   const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
   ```

3. **Unificar en un helper** (opcional pero recomendado): Crear una función `formatearMes()` en `src/lib/fechas.ts`:
   ```typescript
   export function formatearMes(fecha: Date = new Date()): string {
     return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`;
   }
   ```
   Y usarla en todos los 6 lugares donde se genera `mes`.

4. **Script de migración SQL** para corregir datos existentes:
   ```sql
   -- Normalizar membresia.mes a YYYY-MM-01
   UPDATE membresia
   SET mes = to_char(date_trunc('month', mes::timestamptz), 'YYYY-MM-DD')
   WHERE mes IS NOT NULL;
   ```
   Luego agregar una constraint CHECK en la DB:
   ```sql
   ALTER TABLE membresia ADD CONSTRAINT mes_formato_valido
   CHECK (mes ~ '^\d{4}-\d{2}-01$');
   ```

---

## 2. MODERADO: `clase.fecha_hora` — Ambigüedad de zona horaria

### El problema

Varios archivos generan strings ISO locales **sin zona horaria** para comparar contra `clase.fecha_hora` (columna `timestamptz` en Supabase):

```typescript
// src/data/clases.ts:29-33
function localISONow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// src/data/horario.ts:3-6  (idéntico)
function localISO(d: Date): string { ... }
```

Cuando Supabase recibe `"2026-06-30T20:45:00"` (sin `Z` ni offset), PostgreSQL lo interpreta según la zona horaria de la sesión del servidor (por defecto UTC). Si el admin creó una clase pensando en hora chilena (UTC-4), la clase queda registrada a las 20:45 UTC, que en Chile serían las 16:45 — o viceversa si la app envía UTC y el servidor interpreta como tal.

**Archivos afectados:**
- `src/data/clases.ts:57` — `.gte("clase.fecha_hora", localISONow())`
- `src/data/horario.ts:20-22` — `.gte("fecha_hora", localISO(desde))` y `.lte("fecha_hora", localISO(hasta))`
- `src/data/horario.ts:33` — `.lt("fecha_hora", localISO(new Date()))`

### Solución propuesta

```typescript
function localISONow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const tz = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${tz}`;
}
```

O más simple: siempre trabajar con UTC desde el servidor y enviar con `Z`:
```typescript
function utcISONow(): string {
  return new Date().toISOString();
}
```

---

## 3. BAJO: `plan.updated_at` no se actualiza automáticamente

### El problema

La migración `add_plan_fields.sql` agrega `updated_at TIMESTAMPTZ DEFAULT now()`, pero no hay un trigger `BEFORE UPDATE` que lo mantenga actualizado. Cualquier modificación de plan vía `PUT /api/admin/planes` deja `updated_at` congelado en el valor de creación.

### Solución propuesta

```sql
CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plan_updated_at
BEFORE UPDATE ON plan
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();
```

---

## 4. BAJO: Sin validación a nivel DB para formato de `mes`

### El problema

El campo `mes` es de tipo texto. Si la app envía cualquier string, PostgreSQL lo acepta. No hay un `CHECK` constraint que garantice el formato `YYYY-MM-01`. Esto permite que bugs como los descritos en el punto 1 pasen desapercibidos.

### Solución propuesta

```sql
ALTER TABLE membresia ADD CONSTRAINT chk_mes_formato
CHECK (mes ~ '^\d{4}-\d{2}-01$');
```

---

## Resumen de cambios necesarios

| # | Archivo | Línea | Cambio |
|---|---------|-------|--------|
| 1 | `src/app/api/flow/webhook/route.ts` | 140 | `new Date().toISOString()` → `formatearMes()` |
| 2 | `src/app/api/admin/students/status/route.ts` | 64 | `new Date(Y,M,1).toISOString()` → `formatearMes()` |
| 3 | `src/app/api/admin/students/route.ts` | 74 | `new Date(Y,M,1).toISOString()` → `formatearMes()` |
| 4 | `src/lib/fechas.ts` | (nuevo) | Agregar helper `formatearMes()` |
| 5 | `src/data/clases.ts` | 29-33 | `localISONow()` → incluir timezone offset |
| 6 | `src/data/horario.ts` | 3-6 | `localISO()` → incluir timezone offset |
| 7 | Supabase SQL | (nuevo) | Migración: normalizar datos + CHECK constraint |
| 8 | Supabase SQL | (nuevo) | Trigger `trg_plan_updated_at` |

---

*Informe generado el 29 de junio de 2026 — basado en análisis de código fuente y consulta directa a Supabase.*
