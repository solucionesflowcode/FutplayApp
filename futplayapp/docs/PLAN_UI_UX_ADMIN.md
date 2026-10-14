# Plan de arreglo UI/UX — Panel de administrador

> Auditoría del 13/10/2026 sobre `src/app/(admin)/admin/**`, `src/components/admin/**` y las
> APIs que usan. Revisión de código (21 archivos, ~7.000 líneas) contrastada con la BD de
> producción (claves foráneas, triggers, datos reales). **No incluye pruebas visuales en el
> navegador**: cada ítem indica la causa en el código; antes de cerrarlo hay que verlo en pantalla.

## 1. Resumen

| Severidad | Qué significa | Cantidad |
|---|---|---|
| **P0** | El admin pierde datos, ve datos falsos o no puede hacer una tarea | 14 |
| **P1** | Funciona, pero confunde o lleva a errores | 26 |
| **P2** | Consistencia visual, accesibilidad, pulido | 13 |

Ya corregido en esta tanda (no se repite abajo): inscritos en 0 (`6490a34`), modal de reserva
sin inscritos (`e78ed54`), congelamiento en tabla de alumnos y doble clic (`b53f171`), modal
de congelar que decía "Eliminar" (`9d60c16`), filtro por estado en membresías (`b94b36b`).

**Problema de fondo:** cada pantalla resuelve a mano lo mismo (tabla, modal, confirmación,
avisos, paginación). Por eso los bugs se repiten de página en página. La fase 2 crea
componentes compartidos y las fases 3–4 migran las pantallas a ellos.

---

## 2. Bugs por pantalla

Formato: **ID · severidad · síntoma** → causa (`archivo:línea`) → arreglo.

### 2.1 Gestión de usuarios (`/admin`)

- **USR-01 · P0 · Solo se ven 4 usuarios por página y no se puede saltar más allá de la 3.**
  `components/admin/StudentsTable.tsx:47` (`itemsPerPage = 4`) y `:307` (botones fijos `[1, 2, 3]`).
  Con ~75 usuarios son 19 páginas, navegables solo con "Siguiente".
  → 20–25 por página, paginación con números alrededor de la actual (1 … 4 5 6 … 19) y selector de tamaño.
- **USR-02 · P0 · Buscar estando en la página 5 muestra la tabla vacía y "Mostrando 17 a 3 de 3".**
  `page` no se reinicia cuando cambia la lista (`StudentsTable.tsx:44`).
  → Volver a la página 1 al cambiar `students`; acotar `page` a `totalPages`.
- **USR-03 · P0 · No se puede borrar el RUT ni el teléfono de un alumno.**
  `EditStudentModal.tsx:48-49`: un campo vacío se envía como `undefined`, y la API lo trata como "no tocar".
  → Enviar `null` si el campo quedó vacío; la API debe aceptar `null`.
- **USR-04 · P0 · El teléfono se guarda tal como se escribe ("+56 9 1234 5678").**
  `EditStudentModal.tsx` no normaliza; el perfil del alumno sí (`normalizeTelefono` en `components/perfil/ProfileForm.tsx:18`).
  Si se guarda con espacios, **el bot no encuentra al alumno** (`buscarUsuarioPorTelefono` compara solo dígitos).
  → Usar `normalizeTelefono` + validar 8 dígitos tras +569; normalizar también en `PUT /api/admin/students`.
- **USR-05 · P1 · Tabla sin estado vacío:** con 0 resultados muestra "Mostrando 1 a 0 de 0" y "Siguiente" queda activo (`:330`, `totalPages = 0`).
- **USR-06 · P1 · La columna "Usuario" muestra el rol** (`:80`). → Renombrar a "Rol". Además, se muestra el UUID debajo del nombre: ruido, sacarlo de la tabla (dejarlo en "Ver").
- **USR-07 · P1 · Eliminar usa `alert()` y re-inserta al alumno al final de la lista si falla** (`app/(admin)/admin/page.tsx:52-56`).
  → Toast de error y restaurar en su posición (o recargar). El diálogo debe advertir que borra su cuenta y que falla si tiene pagos (409).
- **USR-08 · P1 · Tarjetas de estadísticas ilegibles en móvil:** 7 círculos en 4 columnas con texto de 7 px e íconos de 1,5 px (`page.tsx:98-183`).
  "Vencidos" dice "morosos" (`:181`), cuando incluye a quien se quedó sin tokens. Faltan los congelados.
  → Tarjetas rectangulares en grilla 2×N en móvil, etiquetas correctas, tarjeta "Congelados"; que cada tarjeta filtre la tabla al hacer clic.
- **USR-09 · P1 · "Ficha" aparece para profesores y admins**, que no tienen ficha médica (`StudentsTable.tsx:178`). → Mostrarla solo a alumnos.
- **USR-10 · P2 · Botones de acción con solo un ícono, sin `title` ni `aria-label`** (ver, editar y eliminar en la tabla).
- **USR-11 · P2 · El modal de edición no tiene etiquetas** (solo placeholders), dice "Editar Alumno" aunque sea profesor y no permite editar el email (la API sí sincroniza `auth.users`).

### 2.2 Gestión de membresías (`/admin/membresias`)

- **MEM-01 · P0 · No se pueden corregir los tokens usados de una membresía.**
  El formulario solo tiene "Tokens Totales" (`membresias/page.tsx:498`, grilla de 2 columnas con un solo campo). `tokens_usados` se envía sin cambios.
  La API `PUT /api/admin/membresias/gestion` sí lo soporta y recalcula `sin_tokens`/`estado`.
  → Campo "Tokens usados" con validación `0 ≤ usados ≤ totales` y vista previa de los restantes.
- **MEM-02 · P0 · Al crear o editar, cualquier error muestra solo "Error al guardar"** (`:218`).
  `createMembresiaGestion`/`updateMembresiaGestion` devuelven `boolean` y se pierde el mensaje real.
  Ejemplo: el trigger `bloquear_regalo_con_membresia_vigente` responde "El alumno ya tiene una membresía vigente" y el admin nunca lo ve.
  → Devolver `{ ok, error }` y mostrar el mensaje (vía `traducirError`).
- **MEM-03 · P1 · Editar fechas corre la hora a medianoche:** `dateToIso` (`:191-194`) convierte "2026-11-12" a 00:00 local. Una membresía que vence a las 05:15 pierde horas al guardar sin cambiar nada.
  → Solo enviar las fechas si el admin las modificó; o conservar la hora original.
- **MEM-04 · P1 · Pasar una membresía a "Inactiva" borra en silencio las reservas futuras del alumno** (trigger `limpiar_inscripciones_al_vencer`), sin devolver tokens.
  → Advertir en el formulario cuántas reservas se borrarán, o tratarlo como "Congelar".
- **MEM-05 · P1 · El selector de usuario incluye a profesores** (solo se excluye a `Admin`). → Solo alumnos.
- **MEM-06 · P1 · "Boleta ID" es un texto libre para pegar un UUID.** → Quitarlo del formulario (las boletas las crea el pago) o reemplazarlo por un buscador de boletas pagadas del alumno.
- **MEM-07 · P2 · "Tokens: 2/4" es ambiguo** (¿usados o restantes?). → "2 usados · 2 disponibles" o barra de progreso.
- **MEM-08 · P2 · Los avisos de éxito y error nunca desaparecen** y se acumulan entre acciones. → Toast con autocierre.

### 2.3 Gestión de clases (`/admin/clases`)

- **CLA-01 · P0 · El filtro "Hasta" excluye el último día y "Desde" se corre un día.**
  `clases/page.tsx:99-101`: `new Date("2026-10-14")` es medianoche UTC = 13/10 21:00 en Chile.
  → Comparar contra `fechaHoraChileAIso(fecha, "00:00")` y `"23:59"` (ya existe en `lib/fechas.ts`).
- **CLA-02 · P0 · No se puede editar una clase pasada** (para corregir el profesor o la descripción): la validación de "fecha pasada" (`:147`) corre también en modo edición.
  → Validar solo al crear o si se cambió la fecha.
- **CLA-03 · P0 · Después de las 21:00 no se puede crear una clase para hoy:** el `min` del date input usa la fecha UTC (`:645`, `toISOString().slice(0,10)`).
  → Calcular la fecha de hoy en America/Santiago.
- **CLA-04 · P0 · Eliminar una clase no revisa el resultado** (`:218`): si falla, desaparece de la lista igual.
  → Esperar la respuesta, revertir y mostrar el error. Advertir que devuelve los tokens de las reservas activas.
- **CLA-05 · P1 · La lista mezcla clases pasadas y futuras, ordenadas por fecha de creación** (`api/admin/clases/route.ts:75`).
  → Ordenar por `fecha_hora`; por defecto mostrar "Próximas" con pestañas Próximas/Pasadas/Todas; paginar.
- **CLA-06 · P1 · Todas las clases futuras muestran "N Pendientes" en ámbar parpadeando** (`:424`, `:480`, `animate-pulse`).
  "Pendientes" cuenta cualquier reserva sin asistencia registrada, incluidas las confirmadas.
  → Mostrar "Asistencia por registrar" solo en clases ya ocurridas; sin parpadeo.
- **CLA-07 · P1 · Fecha y hora son opcionales:** se pueden crear clases "Sin horario", que el bot, el calendario y las reservas no saben manejar. → Obligatorias.
- **CLA-08 · P1 · Bajar el cupo por debajo de los inscritos no avisa.** → Validar o advertir.
- **CLA-09 · P1 · Cambiar la hora de una clase con recordatorios enviados no avisa:** los alumnos ya recibieron la hora anterior por WhatsApp.
  → Advertir y ofrecer reenviar el recordatorio (reservas a `sin_confirmar`).
- **CLA-10 · P1 · Asistencia:** los botones Presente/Ausente no muestran cuál está seleccionado, se pueden marcar antes de la clase y, si falla la API, se marca igual (`toggleAsistencia` sin manejo de errores).
  El badge "Pendiente" no distingue "Sin confirmar" de "Recordatorio enviado".

### 2.4 Gestión de planes (`/admin/planes`)

- **PLA-01 · P0 · Eliminar un plan pide confirmación dos veces** (`ConfirmDialog` + `confirm()` nativo, `planes/page.tsx:185`).
- **PLA-02 · P0 · Eliminar un plan en uso "funciona" y vuelve al recargar.** Las claves foráneas `membresia`, `boleta_item` y `recurrencia → plan` no tienen cascada: la BD rechaza el borrado, pero la página no revisa el resultado (`:187`). El aviso "los alumnos quedarán sin referencia" es falso.
  → Bloquear el borrado si tiene membresías o boletas (mostrar cuántas) y ofrecer **desactivar** (la columna `plan.activo` existe y no se usa).
- **PLA-03 · P0 · No se puede crear ni cambiar el tipo de plan** (normal/familiar/kids/liga): el formulario no tiene el campo y la API (`api/admin/planes/route.ts:40-76`) lo ignora. Los planes familiar y kids actuales se crearon por SQL.
  Además, la validación `tokens_mensuales <= 0` (`:101`) impide guardar un plan Liga (0 tokens).
  → Selector de tipo en el formulario y la API; la validación de tokens depende del tipo.
- **PLA-04 · P1 · Los campos numéricos no se pueden vaciar:** al borrar, "Tokens" salta a 1 y "Días" a 30 (`:378`, `:390`). → Guardar el texto del input y validar al guardar.
- **PLA-05 · P2 · Si el portapapeles falla, el link se copia con `window.prompt`** (`:166`). → Modal con el link y botón "Copiar".

### 2.5 Gestión de profesores (`/admin/profesores`)

- **PRO-01 · P1 · "Eliminar" borra la cuenta completa** (`auth.users`): el profesor ya no puede iniciar sesión. No existe la opción "quitar rol de profesor" (volver a jugador).
  → Dos acciones separadas, con textos claros.
- **PRO-02 · P1 · No se puede borrar el teléfono ni la foto** (`profesores/page.tsx:162-163`, `|| undefined`). El teléfono no se normaliza.
- **PRO-03 · P2 · "Convertir a profesor" no pide confirmación** y busca entre todos los usuarios, incluidos admins.

### 2.6 Gestión de módulos y cápsulas

- **MOD-01 · P1 · Al editar un módulo, la tabla sigue mostrando la categoría anterior** (se actualiza `categoria_id` pero no `categoria_nombre`, `modulos/page.tsx:116`). Tampoco se puede dejar sin categoría.
- **CAP-01 · P0 · Si falla guardar el PDF de la cápsula, solo queda un `console.error`** (`capsulas/page.tsx:698`): el admin cree que lo adjuntó.
- **CAP-02 · P1 · Cerrar el modal durante la subida no cancela el upload:** el XHR sigue y queda un video huérfano en Bunny. No hay aviso al salir de la página.
  → `xhr.abort()` al cerrar, confirmación si hay una subida en curso y `beforeunload`.
- **CAP-03 · P1 · Al editar, la tabla queda desactualizada:** imagen (`:714` usa `form.imagen` en vez de la final), descripción, nombre del módulo y del profesor.
- **CAP-04 · P1 · No se pueden vaciar los campos opcionales** (descripción, duración, módulo, profesor: `:659-663`, `|| undefined`).
- **CAP-05 · P2 · Verificar que eliminar la cápsula borre también el video en Bunny y el PDF del storage.**

### 2.7 Analíticas (`/admin/analiticas`)

- **ANA-01 · P1 · "Retención" no es retención:** es membresías activas ÷ total de alumnos (`analiticas/page.tsx:118`). → Renombrar ("% de alumnos con plan activo") o calcular retención real (renovaron este mes ÷ vencían este mes).
- **ANA-02 · P1 · Si falla la API de ingresos, se muestra una estimación sin avisar** (`:114-116` suma precios de membresías creadas en el mes, incluidas las regaladas por el admin). → Mostrar el error; no inventar el número.

### 2.8 Estructura común (layout, menú, perfil)

- **GEN-01 · P1 · Ningún modal se cierra con Escape, ninguno atrapa el foco** y ninguno tiene `role="dialog"`/`aria-modal`.
- **GEN-02 · P1 · Avisos inconsistentes:** `alert()`, `confirm()`, `prompt()` y banners que no se cierran. En profesores, un error de la página queda tapado por el modal abierto.
- **GEN-03 · P2 · Cada página tiene su propio encabezado:** "Directorio de Usuarios" con el buscador *arriba* del título (`AdminHeader.tsx`), títulos `text-2xl` en otras, barra de gradiente en Perfil. El menú dice "Gestión de usuarios" y la página "Directorio de Usuarios".
- **GEN-04 · P2 · Colores sin criterio:** botones primarios `blue-600` en todas las pantallas, mientras la marca es naranja `#F28C28` / azul `#00305B`. Bordes mezclados (`rounded`, `rounded-lg`, sin borde).
- **GEN-05 · P2 · Menú lateral colapsado:** solo íconos, sin tooltip; el estado no se recuerda; los botones de menú, colapsar y cerrar no tienen `aria-label`.
- **GEN-06 · P2 · Doble edición de perfil:** el menú del avatar abre su propio modal (nombre y foto) y además existe `/admin/perfil` con `ProfileForm`. → Una sola vía (el menú lleva a `/admin/perfil`).
- **GEN-07 · P2 · `AuthGuard` duplicado** en `layout.tsx` y `page.tsx` de usuarios; `AuthProvider` dentro del layout del admin. → Dejar uno.
- **GEN-08 · P2 · Carga y errores de datos:** solo hay un spinner la primera vez, sin skeletons. Si falla `getUsers()` (o similares), se muestra "0 registros" sin explicar que hubo un error.

---

## 3. Componentes compartidos (base del rediseño)

Crear en `src/components/admin/ui/` y migrar las pantallas a ellos. Sin dependencias nuevas
(Tailwind + lucide, como hoy).

| Componente | Resuelve | Notas |
|---|---|---|
| `PageHeader` | GEN-03 | Título, subtítulo, acciones a la derecha, migas opcionales. |
| `DataTable` | USR-01/02/05/06, CLA-05, MEM-07 | Columnas declarativas, vista de tarjetas en móvil, paginación real, estado vacío, orden por columna, skeleton. |
| `Modal` | GEN-01 | `role="dialog"`, `aria-modal`, Escape, foco atrapado y devuelto, bloqueo de scroll; `onClose` bloqueable mientras guarda. |
| `ConfirmDialog` (v2) | PLA-01, USR-07 | Variantes `danger`/`warning`/`info`, `confirmLabel` **obligatorio**, texto de consecuencias, estado de carga. |
| `Toast` / `useToast` | GEN-02, MEM-08, CAP-01 | Reemplaza `alert`, `confirm`, `prompt` y los banners. Éxito con autocierre; error persistente con detalle. |
| `FormField` + `NumberInput` | USR-11, PLA-04 | Label, ayuda y error asociados (`aria-describedby`); el número guarda el texto y valida al guardar. |
| `PhoneInput` | USR-04, PRO-02 | Prefijo fijo +569 y `normalizeTelefono`. |
| `StatCard` | USR-08 | Rectangular, legible en móvil, clic para filtrar. |
| `StatusBadge` | coherencia | Un único mapa estado → color/etiqueta (Activa, Inactiva, Sin tokens, Congelada, Vencido…). |
| `useAdminMutation` | CLA-04, PLA-02, MEM-02 | Patrón común: llamada → error tipado → toast → revertir el cambio optimista. |

**Tokens de diseño** (en `tailwind`/CSS variables): primario `#00305B`, acento `#F28C28`,
estados (éxito, alerta, error, info), un solo radio (`rounded-lg`) y escala tipográfica
(`text-2xl` títulos, `text-sm` tablas). Los botones primarios usan el azul de marca, no `blue-600`.

---

## 4. Plan por fases

### Fase 1 — Correcciones urgentes, sin rediseño (≈ 1–2 días)
Arreglos puntuales en el código actual, cada uno con su prueba:

USR-01, USR-02, USR-03, USR-04, MEM-01, MEM-02, CLA-01, CLA-02, CLA-03, CLA-04,
PLA-01, PLA-02, PLA-03, CAP-01.

*Criterio de salida:* ningún bug P0 abierto; pruebas en `src/tests/**` que fallan sin el arreglo.

**Estado (13/10/2026): implementada, sin commitear.** Los 14 P0 corregidos. De paso: MEM-03
(fechas que perdían la hora), CLA-07 (fecha y hora obligatorias), el diálogo de eliminar
membresía que no se cerraba tras confirmar, y la fila "No se encontraron usuarios" (USR-05).
Pruebas nuevas: `src/tests/lib/admin-fase1.test.ts`, `src/tests/api/admin/admin-fase1.test.ts`
y `DATA-MEMB-GEST-*` en `src/tests/data/membresia.test.ts` (644 en verde).
Funciones nuevas reutilizables: `lib/paginacion.ts`, `lib/telefono.ts` (`telefonoParaGuardar`),
`lib/fechas.ts` (`hoyChile`, `claseEnFiltroFechas`, `errorFechaClase`).
**Pendiente de revisión visual** (sin pruebas de componente): paginación de usuarios, campo
"Tokens usados", selector de tipo de plan, restauración al fallar el borrado de clase/plan,
aviso del PDF en cápsulas. PLA-02 solo bloquea el borrado: desactivar planes queda para la
fase 3 (decisión pendiente 1).

### Fase 2 — Componentes base (≈ 2–3 días)
Construir los componentes de la sección 3 con pruebas propias (`@testing-library/react`,
como `src/tests/components/**`). Primero `Modal`, `Toast`, `ConfirmDialog` v2 y `DataTable`.

*Criterio de salida:* componentes probados (teclado incluido) y documentados en este archivo.

**Estado (13/10/2026): implementada.** Componentes en `src/components/admin/ui/` (importar desde
`@/components/admin/ui`), 31 pruebas en `src/tests/components/admin-ui/`. `ToastProvider` ya
está en `app/(admin)/admin/layout.tsx`. Colores de marca como tokens de Tailwind en
`app/globals.css`: `bg-marca`, `hover:bg-marca-hover`, `text-acento`, `border-t-acento`.
Ninguna pantalla los usa todavía: la migración es la fase 3.

| Componente | Uso |
|---|---|
| `PageHeader` | `<PageHeader titulo descripcion acciones>{filtros}</PageHeader>` — un único `h1`. |
| `DataTable<T>` | `columnas: Columna<T>[]` (`id`, `encabezado`, `celda`, `valorOrden?`), `getId`, `tarjetaMovil?`, `resetKey` (= texto buscado), `vacio`, `cargando`, `onFilaClick?`, `ordenInicial?`. 20 por página. |
| `Modal` | `open`, `onClose`, `title`, `description?`, `footer?`, `size` (`sm`/`md`/`lg`), `bloquearCierre` (mientras guarda), `cerrarConFondo` (por defecto no). |
| `ConfirmDialog` | `confirmLabel` **obligatorio**, `variante` (`peligro`/`advertencia`/`info`), `consecuencias?: ReactNode[]`, `cargando`. Reemplaza a `components/admin/ConfirmDialog`. |
| `useToast()` | `toast.exito(msg)`, `toast.error(msg, detalle?)`, `toast.info(msg)`. Los errores no se cierran solos. |
| `useAdminMutation()` | `ejecutar(() => api(), { exito, error?, revertir? })` → `boolean`. Entiende `{ ok }` y `{ success }`; revierte y avisa si falla o no hay red. |
| `FormField` | `<FormField label required ayuda error>{(p) => <input {...p} className={CLASE_INPUT} />}</FormField>` |
| `NumberInput` | `value: number \| null`, `onChange(n \| null)`: se puede vaciar; validar al guardar. |
| `PhoneInput` | Prefijo +569 fijo; entrega `+569XXXXXXXX` o `""`. Validar con `telefonoParaGuardar` (`lib/telefono`). |
| `StatCard` | `etiqueta`, `valor`, `detalle?`, `tono`, `onClick?` + `activa` (filtro con `aria-pressed`). |
| `StatusBadge` | `<StatusBadge estado="congelada" />`: un solo mapa de estados (membresía, alumno, asistencia). |
| `Button` | `variante` (`primario`/`secundario`/`peligro`/`advertencia`/`fantasma`), `cargando`, `textoCargando`, `icono`. |

Nota: los íconos `Info`, `AlertTriangle` y `ChevronsUpDown` de lucide-react existen en runtime
pero no en los tipos que resuelve TypeScript en este proyecto; usar `AlertCircle`,
`TriangleAlert` y `ChevronDown`.

### Fase 3 — Migración por pantalla (≈ 4–5 días, una pantalla por PR)
Orden por uso diario del club:
1. **Membresías** (MEM-03…08), 2. **Usuarios** (USR-05…11), 3. **Clases** (CLA-05…10),
4. **Planes** (PLA-04, PLA-05), 5. **Profesores** (PRO-01…03), 6. **Cápsulas y módulos**
(CAP-02…05, MOD-01), 7. **Analíticas** (ANA-01/02).

*Criterio de salida por pantalla:* usa `PageHeader`, `DataTable`, `Modal` y `Toast`; sin
`alert`/`confirm`/`prompt`; revisada en escritorio y a 375 px de ancho.

### Fase 4 — Pulido y accesibilidad (≈ 1–2 días)
GEN-04…08: colores de marca, menú lateral (tooltips, estado guardado, `aria-label`), un solo
flujo de perfil, skeletons y estados de error, contraste AA en textos grises.

---

## 5. Verificación

- **Pruebas automáticas:** `npx vitest run --exclude "src/tests/e2e/**"` en verde en cada PR; cada bug corregido trae una prueba que falla sin el arreglo.
- **Revisión visual por pantalla** (escritorio 1440 px y móvil 375 px): crear, editar, eliminar, error de la API (cortar la red), lista vacía y búsqueda sin resultados.
- **Teclado:** Tab recorre la pantalla, Escape cierra el modal y el foco vuelve al botón que lo abrió.
- **Datos reales:** probar con una cuenta de admin de prueba; los cambios en producción se revierten como en la prueba del bot (anotar el estado original antes).

## 6. Decisiones pendientes

1. **Planes:** ¿se permite eliminar, o solo desactivar (`plan.activo`)? Recomendado: solo desactivar si tiene uso.
2. **Profesores:** ¿"quitar rol" deja al usuario como jugador sin membresía?
3. **Membresía inactiva (MEM-04):** ¿debe comportarse como "Congelar" (cancelar reservas con devolución) o bloquearse si tiene reservas futuras?
4. **Cambio de hora de una clase (CLA-09):** ¿reenviar el recordatorio automáticamente o solo avisar?
5. **Analíticas (ANA-01):** ¿renombrar la métrica o calcular retención real?
