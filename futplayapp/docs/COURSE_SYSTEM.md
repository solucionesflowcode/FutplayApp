# Documentación del Sistema de Reproductor de Cursos (Premium)

Este documento detalla el funcionamiento técnico, la procedencia de los datos y la integración de video para el nuevo sistema de reproducción de cápsulas/cursos.

## 1. Arquitectura del Sistema

El sistema utiliza el **App Router** de Next.js y está dividido en tres capas principales:

1.  **Capa de Datos (`src/data`)**: Funciones del lado del servidor para interactuar con Supabase.
2.  **Capa de Ruta Dinámica (`src/app/(dashboard)/capsules/[id]`)**: Un *Server Component* que valida la sesión, obtiene los datos y verifica la membresía antes de renderizar.
3.  **Capa de Interfaz (`src/components/videoPlayer`)**: Un *Client Component* que maneja la interactividad (reproductor, pestañas, comentarios, progreso).

---

## 2. Origen de los Datos

### Datos Reales (Desde Base de Datos)
Estos datos se extraen de las tablas de Supabase en cada carga de página:

*   **Cápsula**: `id`, `titulo`, `imagen`, `duracion`, `bunny_video_id` (Tabla `capsula`).
*   **Información del Coach**: Campo `creado` en la tabla `capsula` (alias para el nombre del autor).
*   **Categoría**: Obtenida mediante el `modulo_id` -> `categoria_id` (Tablas `modulo` y `categoria`).
*   **Estado de Membresía**: Se consulta la tabla `membresia` filtrando por el `usuario_id` de la sesión actual.

### Datos Mockeados / Hardcodeados (Pendientes de Base de Datos)
Para ofrecer una experiencia visual de "alto nivel" (estilo Masterclass), los siguientes elementos están actualmente simulados en el código:

*   **Comentarios**: El feed de comentarios y los avatares son estáticos. Se requiere crear una tabla `comentario_capsula` para persistirlos.
*   **Guía Minuto a Minuto**: El índice de momentos clave es un array estático dentro de `VideoPlayerView.tsx`.
*   **Recursos Descargables**: Los enlaces a PDF y ZIP son botones visuales. Se requiere una tabla `recurso_capsula`.
*   **Descripción del Curso**: La sección "Acerca de" utiliza un texto genérico. Se recomienda añadir un campo `descripcion` a la tabla `capsula`.
*   **Nivel de Dificultad**: Se muestra como "Intermedio" por defecto.

---

## 3. Integración con Bunny Stream

El reproductor de video se implementa mediante un **Iframe Embebido**.

### Implementación Técnica:
1.  **Identificador de Video**: Cada cápsula en Supabase debe tener un `bunny_video_id` (GUID de Bunny.net).
2.  **Variables de Entorno**: Se requiere `NEXT_PUBLIC_BUNNY_LIBRARY_ID` definida en el archivo `.env`.
3.  **Construcción de URL**:
    ```text
    https://player.mediadelivery.net/embed/${LIBRARY_ID}/${VIDEO_ID}
    ```
4.  **Seguridad**: El reproductor solo se renderiza si el servidor confirma que `hasMembresia` es `true`. De lo contrario, se muestra un "Overlay de Bloqueo" con un Call to Action (CTA).

---

## 4. Flujo de Autenticación y Acceso

1.  **Entrada**: El usuario hace clic en una cápsula desde `/capsules`.
2.  **Validación Server-Side**:
    *   Se obtiene el ID de la URL.
    *   Se utiliza `supabase.auth.getUser()` con el cliente de servidor para asegurar que la sesión es válida.
    *   Se consulta la tabla `membresia`.
3.  **Renderizado**:
    *   Si hay sesión y membresía: Se envía `hasMembership={true}` al componente.
    *   Si no hay membresía: Se envía `hasMembership={false}` (Muestra candado).
    *   Si no hay sesión: Redirige a `/login`.

---

## 5. Próximos Pasos Recomendados

1.  **Migración de SQL**: Crear las tablas para `comentarios` y `recursos` para eliminar el hardcode.
2.  **Tracking de Progreso**: Actualmente el botón "Marcar como completado" solo cambia el estado local (React State). Se debe implementar una tabla `progreso_usuario` para guardar esto en la DB.
3.  **Webhooks de Bunny**: Implementar lógica para actualizar automáticamente la duración del video cuando se sube a Bunny.
