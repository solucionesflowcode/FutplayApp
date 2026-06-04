# FutPlay WebApp — Project Context AI

## Descripción General

FutPlay WebApp es una plataforma web desarrollada para digitalizar y centralizar la operación de una escuela deportiva llamada FutPlay, enfocada principalmente en la gestión de alumnos, membresías, pagos, cápsulas de contenido educativo, control de asistencia y administración interna.

El proyecto nace para resolver problemas operativos reales de una PYME deportiva en Chile:

* Falta de automatización
* Manejo manual de pagos
* Ausencia de canal digital de ventas
* Gestión ineficiente de alumnos y suscripciones
* Control manual de asistencia
* Dificultad para administrar contenido educativo

La plataforma busca funcionar como un ecosistema híbrido entre:

* Sistema administrativo
* LMS (Learning Management System)
* Plataforma de pagos
* Sistema de reservas/agendamiento
* Dashboard analítico
* Control presencial mediante QR

---

# Objetivo del Sistema

El objetivo principal es permitir que una escuela deportiva pueda administrar completamente su operación desde una sola plataforma:

* Gestión de alumnos
* Gestión de profesores
* Gestión de membresías
* Venta de productos y cápsulas
* Control de acceso
* Control de asistencia
* Analíticas del negocio
* Streaming de contenido educativo

---

# Stack Tecnológico

## Frontend

* Next.js
* React
* Tailwind CSS v4
* Bootstrap Components
* TypeScript

## Backend

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* Edge Functions

## Infraestructura

* Vercel (deploy)
* GitHub (repositorio)
* Bunny.net (streaming de videos)

## Pagos

* Webpay Plus
* PayPal

---

# Arquitectura General

La arquitectura está basada en Supabase como núcleo central:

* Base de datos PostgreSQL
* Autenticación
* Policies RLS
* Triggers
* Funciones SQL
* Storage
* Realtime

La lógica crítica de negocio está implementada directamente en PostgreSQL mediante:

* Functions
* Triggers
* Policies RLS

Esto permite:

* Seguridad a nivel de base de datos
* Automatización
* Validaciones robustas
* Evitar lógica crítica en frontend

---

# Roles del Sistema

## Jugador

Usuario final/alumno.

Puede:

* Ver clases
* Inscribirse
* Comprar membresías
* Comprar productos
* Ver cápsulas
* Gestionar ficha médica
* Ver historial de pagos

---

## Profesor

Puede:

* Ver alumnos inscritos
* Gestionar asistencia
* Acceder a información médica relevante
* Gestionar contenido educativo

---

## Administrador

Control total del sistema.

Puede:

* Gestionar productos
* Gestionar planes
* Gestionar cápsulas
* Gestionar finanzas
* Gestionar usuarios
* Acceder a dashboards
* Ver fichas médicas

---

# Dominio del Negocio

## Membresías

El sistema utiliza membresías mensuales con tokens.

Cada plan posee:

* Tokens mensuales
* Precio
* Estado
* Fecha

Los tokens representan reservas/clases disponibles.

---

## Sistema de Tokens

Cuando un usuario se inscribe a una clase:

1. Se valida membresía activa
2. Se verifica disponibilidad de tokens
3. Se consume automáticamente 1 token
4. Se registra inscripción

Esto ocurre mediante triggers automáticos en PostgreSQL.

---

## Control de Capacidad

Cada clase posee:

* Cupo máximo
* Horarios
* Sede

Un trigger evita automáticamente sobrepasar la capacidad.

---

## Sistema de Pagos

El flujo esperado:

1. Usuario compra plan/producto
2. Se genera boleta
3. Webpay/PayPal confirma pago
4. Estado cambia a "pagado"
5. Trigger procesa automáticamente:

   * creación de membresía
   * asignación de tokens
   * compra de extras

---

## Cápsulas Educativas

El sistema incluye un módulo LMS:

* Módulos
* Cápsulas
* Videos
* Categorías

Los videos son almacenados en Bunny.net.

Las cápsulas pueden pertenecer a:

* cursos
* módulos
* categorías

---

# Modelo de Datos

## Entidades Principales

### usuario

Representa usuarios autenticados del sistema.

Campos relevantes:

* id
* nombre
* email
* telefono
* rol
* rut

---

### membresia

Representa planes activos mensuales.

Campos:

* usuario_id
* plan_id
* tokens_totales
* tokens_usados
* estado
* mes

---

### plan

Define tipos de suscripción.

Campos:

* nombre
* precio
* tokens_mensuales

---

### clase

Clase presencial agendable.

Campos:

* nombre
* descripcion
* sede_id
* cupo_maximo

---

### clase_usuario

Relación entre usuario y clase.

Representa:

* inscripción
* asistencia
* consumo de token

---

### horario

Horario asociado a clases.

---

### sede

Sucursal física.

---

### ficha_medica

Información médica obligatoria del alumno.

Campos:

* grupo_sanguineo
* enfermedades
* alergias
* medicamentos
* IMC
* peso
* estatura

---

### producto

Productos adicionales.

Ejemplo:

* token_extra
* accesorios
* contenido

---

### boleta

Registro financiero.

---

### boleta_item

Detalle de productos/planes comprados.

---

### modulo

Agrupador de cápsulas.

---

### capsula

Contenido educativo individual.

---

### categoria

Categorías de contenido.

---

# Seguridad y RLS

El sistema utiliza Row Level Security (RLS) extensivamente.

## Principios

* Cada usuario solo accede a sus datos
* Profesores poseen acceso limitado
* Admins poseen acceso total
* Toda seguridad ocurre en DB

---

## Ejemplos de Policies

### usuario

* Usuarios actualizan solo su perfil
* Staff puede leer perfiles

### ficha_medica

* Dueño administra su ficha
* Staff puede leer fichas
* Admin acceso completo

### clase_usuario

* Jugador ve sus clases
* Profesor gestiona asistencia

### producto / plan

* Lectura pública
* Gestión solo admin

---

# Automatizaciones SQL

## Trigger: manejar_inscripcion_clase

Automatiza:

* validación de membresía
* validación de tokens
* consumo automático

---

## Trigger: limitar_15_alumnos

Evita sobrecupo automáticamente.

---

## Trigger: procesar_boleta_pagada

Cuando una boleta pasa a pagado:

* crea membresía
* agrega tokens
* procesa extras

---

## Trigger: check_membresia_activa

Evita múltiples membresías activas para el mismo período.

---

## Trigger: handle_new_user

Sincroniza automáticamente usuarios de Supabase Auth con tabla `usuario`.

---

# Flujo Principal del Usuario

## Registro

1. Usuario se registra
2. Supabase Auth crea cuenta
3. Trigger crea perfil automáticamente

---

## Compra

1. Usuario compra plan
2. Webpay confirma
3. Trigger crea membresía

---

## Reserva de Clase

1. Usuario selecciona clase
2. Sistema valida tokens
3. Sistema valida capacidad
4. Se registra asistencia pendiente

---

## Asistencia QR

1. Profesor escanea QR
2. Sistema verifica:

   * membresía
   * inscripción
   * estado
3. Marca asistencia

---

# Objetivos Técnicos del Proyecto

## Escalabilidad

Diseñado para:

* múltiples sedes
* múltiples profesores
* múltiples tipos de contenido

---

## Seguridad

Seguridad centrada en:

* RLS
* funciones SQL
* triggers
* auth.uid()

---

## Automatización

La mayoría de reglas de negocio críticas viven en PostgreSQL.

---

# Filosofía Arquitectónica

El proyecto prioriza:

* Backend robusto
* Seguridad a nivel DB
* Automatización SQL
* Minimizar lógica sensible en frontend
* Arquitectura híbrida LMS + gestión deportiva

---

# Contexto para IA

## Qué es FutPlay

FutPlay NO es solamente una app de reservas.

Es una plataforma híbrida que combina:

* administración deportiva
* LMS
* pagos
* control presencial
* dashboard analítico
* automatizaciones

---

## Qué tecnologías dominan el proyecto

La IA debe asumir que el proyecto gira principalmente alrededor de:

* Supabase
* PostgreSQL
* Next.js
* TypeScript
* RLS
* Triggers SQL
* Edge Functions

---

## Cómo pensar el proyecto

Toda nueva feature debe respetar:

* seguridad RLS
* automatizaciones SQL existentes
* consumo de tokens
* arquitectura modular
* escalabilidad multi-sede
* separación por roles

---

# Convenciones Importantes

## Roles válidos

* jugador
* profesor
* administrador

---

## Reglas importantes

* Una membresía por mes
* Tokens limitan reservas
* Cupos limitan clases
* Pagos disparan automatizaciones
* QR valida estado del alumno

---

# Estado Actual del Proyecto

Actualmente el proyecto ya posee:

* Base de datos avanzada
* Policies RLS
* Triggers
* Funciones SQL
* Modelo relacional
* Sistema de membresías
* LMS básico
* Sistema financiero

El enfoque actual es continuar evolucionando:

* frontend
* automatizaciones
* dashboards
* QR
* integración de pagos
* experiencia de usuario

---

## Features Completadas

### 1. Función `get_proxima_clase`

Regenerada para el esquema actual donde `clase_usuario` ya no tiene `clase_id` directo, sino que se relaciona con `clase` a través de `horario`:

```
clase_usuario.horario_id → horario.id → horario.clase_id → clase.id → clase.sede_id → sede.id
```

Compatible con la llamada existente en `src/data/clases.ts`.

### 2. Calendario de Mis Clases

Visualización mensual en grilla de las clases inscritas con código de colores según estado de asistencia:

| Estado | Color | Valores del enum `asistencia` |
|---|---|---|
| Asistido | Verde | `asistio`, `confirmado_whatsapp` |
| Próxima / Pendiente | Naranja | `sin_confirmar`, `pendiente` (futuras) |
| Inasistencia | Rojo | `no_asistio`, `cancelado`, `cancelado_sin_reembolso` |
| Sin confirmar pasada | Neutro | `sin_confirmar`, `pendiente` (pasadas) |

Incluye:
- Navegación entre meses
- Indicador "Hoy" con anillo
- Iconos por estado (CheckCircle, XCircle, Clock)
- Resumen mensual con anillo de progreso
- Tabla de detalle de sesiones recientes
- Leyenda rápida de colores

### 3. Query corregida en `getMisClasesInscripciones`

Adaptada al nuevo esquema relacional: la consulta ahora atraviesa `horario:horario_id → clase:clase_id` y reestructura el resultado para mantener la interfaz `ClaseInscripcionRow` existente.

### 4. Normalización del enum `asistencia`

La función `normalizeAsistencia` mapea los valores del enum y booleanos legacy a un estado visual consistente (`presente`, `ausente`, `pendiente`, `sin_confirmar`), usado tanto en la grilla del calendario como en la tabla de detalle.
