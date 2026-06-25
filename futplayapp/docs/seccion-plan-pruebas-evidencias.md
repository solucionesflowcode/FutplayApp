## 5. Plan de Pruebas y Evidencias

### 5.1 Documentos de referencia

El presente apartado resume los hallazgos documentados en los siguientes informes, cuyo contenido detallado se encuentra en los anexos correspondientes:

- **informe_plan_de_pruebas**: Documento integral que describe el plan de pruebas completo del sistema FutPlayApp, incluyendo requerimientos funcionales y no funcionales, estrategia de testing, arquitectura de mocks, ejecución de pruebas y cobertura de código. Contiene el plan detallado de 281 pruebas distribuidas en 31 suites, de las cuales 18 ya han sido implementadas.

- **informe_resultados_tests**: Documento de evidencia que lista el resultado individual de cada una de las 160 pruebas automatizadas ejecutadas, organizadas por suite y módulo, con su estado de aprobación.

### 5.2 Resumen de ejecución

Se ejecutaron **160 pruebas automatizadas** distribuidas en **18 suites**, utilizando **Vitest v3.2.6** como framework de pruebas. Todas las pruebas operan sobre un entorno simulado mediante mocks de Supabase, sin conexión a base de datos real.

| Métrica | Resultado |
|---------|-----------|
| Archivos de prueba | 18 |
| Pruebas ejecutadas | 160 |
| Pruebas aprobadas | 160 |
| Pruebas fallidas | 0 |
| Tasa de éxito | **100 %** |
| Duración total | ~4.7 s |

Las 18 suites implementadas cubren los siguientes módulos:

| Categoría | Suites implementadas | Tests |
|-----------|---------------------|-------|
| Data Layer (membresías, pagos, planes, ficha médica) | 4 | 37 |
| Librería Flow (createFlowOrder, getFlowPaymentStatus, generateSignature) | 1 | 13 |
| API Flow (create-order, confirm, cancel, webhook) | 4 | 37 |
| API Admin (clases, profesores, módulos, cápsulas, documentos, estudiantes, upload, membresías) | 8 | 53 |
| Webhook WhatsApp (confirmar/cancelar asistencia, procesar mensajes) | 1 | 20 |

### 5.3 Pruebas aprobadas por módulo

**Data Layer** (37 tests): Se verificaron las operaciones CRUD y consultas de la capa de datos para membresías, pagos, planes y ficha médica. Todos los casos de borde fueron cubiertos: valores nulos, errores de base de datos, condiciones límite como 29 de febrero en `calcularEdad`, y devolución de tokens cuando `tokens_usados > 0`.

**Librería Flow** (13 tests): Se validó la generación de firmas HMAC-SHA256, codificación URL, manejo de parámetros opcionales (recurrencia, paymentMethod, timeout), y errores HTTP desde Flow sandbox.

**API Flow** (37 tests): Se cubrieron los cuatro endpoints de pago — creación de orden, confirmación, cancelación y webhook. Se verificaron autenticación, validación de entrada, ownership de boletas, idempotencia (boletas ya pagadas o anuladas no se modifican), recurrencia, sandbox fallback, y rollback ante fallo de Flow.

**API Admin** (53 tests): Se implementaron pruebas para los ocho endpoints administrativos. Se verificó que `verifyAdmin()` rechace usuarios no autenticados o sin rol administrador (retornando 401 o 403 según corresponda). Se probaron las operaciones CRUD completas de clases (GET, POST, PUT, DELETE, PATCH), profesores, módulos y cápsulas. Se incluyeron validaciones de entrada, dependencias (ej.: eliminar módulo con cápsulas asociadas retorna 409), y flujos complejos como la creación de profesores con creación simultánea de usuario de autenticación.

**Webhook WhatsApp** (20 tests): Se cubrieron los escenarios de confirmación y cancelación de asistencia, incluyendo casos borde como el límite de 1 hora para confirmar y 3 horas para cancelar con reembolso, así como la búsqueda de usuarios por teléfono en formatos con y sin prefijo "+".

### 5.4 Mejoras detectadas y propuestas

Durante el diseño e implementación de las pruebas, se identificaron las siguientes oportunidades de mejora sobre el código base:

| # | Ubicación | Hallazgo | Mejora propuesta |
|---|-----------|----------|------------------|
| 1 | `src/data/clase_usuario.ts` | Función `actualizarAsistenciaPorHorario()` utiliza el campo `horario_id`, el cual pertenece a una tabla (`horario`) que fue eliminada durante una migración anterior. | Eliminar la función por estar en desuso, o migrar su lógica para operar directamente sobre `clase.fecha_hora`. |
| 2 | `src/app/api/admin/students/status/route.ts` | El flujo "Inactivo" elimina físicamente los registros de membresía mediante `DELETE`. | Implementar soft-delete agregando una columna `activa BOOLEAN` en la tabla `membresia`, preservando el historial. |
| 3 | `src/app/api/admin/students/status/route.ts` | El flujo "Activo" selecciona el plan más barato por defecto cuando el usuario no tiene membresía, pero no valida que existan planes disponibles, pudiendo retornar 400 sin mensaje claro. | Agregar un plan "Gratuito" por defecto o retornar un error explícito cuando no haya planes configurados. |
| 4 | `src/tests/webhook/handlers.test.ts` | Los datos de prueba del mock utilizaban `horario.fecha_hora` en lugar de `clase.fecha_hora`, reflejando la estructura anterior a la migración. | Actualizar los datos del mock para alinearlos con el esquema actual de base de datos. |

Adicionalmente, se proponen las siguientes mejoras no críticas para versiones futuras:

| # | Mejora | Impacto | Prioridad |
|---|--------|---------|-----------|
| 1 | Validar `tokens_restantes > 0` tanto en frontend como en API antes de permitir la inscripción a una clase. | Evita error silencioso del trigger DB al inscribir sin tokens. | Alta |
| 2 | Implementar auditoría de cambios en `usuario.rol` para trazabilidad de promociones a profesor. | Trazabilidad y seguridad. | Media |
| 3 | Cachear `getAllClasesConInscripcion()` con SWR para mejorar rendimiento del calendario. | Rendimiento. | Baja |
| 4 | Migrar `verifyAdmin()` a un middleware global de Next.js para evitar su invocación manual en cada ruta administrativa. | Reducción de duplicación en 7 rutas. | Media |
| 5 | Validar que `plan.tokens_mensuales > 0` antes de crear una membresía. | Evita membresías sin tokens. | Media |
| 6 | Configurar integración continua con GitHub Actions que ejecute `vitest run --coverage` en cada push. | Calidad continua y prevención de regresiones. | Alta |

### 5.5 Prueudas planificadas no implementadas

Del plan completo documentado en el **informe_plan_de_pruebas** (281 pruebas distribuidas en 31 suites), quedan **13 suites pendientes de implementación**, que corresponden aproximadamente a **121 pruebas**. Estas incluyen:

- Autenticación y roles (data layer y API callback)
- Clases, clase_usuario y profesor-clases (data layer)
- Mis clases y calendario
- Cápsulas admin y comentarios
- Profesores (data layer)
- Documentos y módulos (data layer)
- Bunny Stream (libería y API)
- Escenarios E2E

### 5.6 Conclusión

El sistema FutPlayApp cuenta con **160 pruebas automatizadas aprobadas al 100 %**, cubriendo los módulos críticos de pagos (Flow.cl), administración CRUD, webhook WhatsApp, y capa de datos (membresías, planes, fichas médicas). La infraestructura de mocks de Supabase permite la ejecución de pruebas sin dependencia de base de datos real, garantizando robustez y repetibilidad. Se detectaron 4 hallazgos que derivaron en correcciones o mejoras documentadas, y se propusieron 6 mejoras adicionales para incrementar la calidad y mantenibilidad del sistema. El detalle completo de cada prueba, su resultado individual y los datos de ejecución se encuentran en el **informe_resultados_tests**.
