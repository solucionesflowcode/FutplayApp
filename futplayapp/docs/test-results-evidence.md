# Informe de Resultados — Pruebas Automatizadas

| Campo | Valor |
|-------|-------|
| **Proyecto** | FutPlayApp — Plataforma de Gestión de Academia Deportiva |
| **Framework** | Vitest v3.2.6 |
| **Entorno** | Node.js (Windows) |
| **Fecha de ejecución** | Junio 2026 |
| **Comando** | `npx vitest run` |

---

## Resumen global

| Métrica | Resultado |
|---------|-----------|
| **Archivos de prueba** | 18 |
| **Pruebas ejecutadas** | 160 |
| **Pruebas aprobadas** | 160 |
| **Pruebas fallidas** | 0 |
| **Tasa de éxito** | 100 % |
| **Duración total** | ~4.7 s |

---

## Resultados por suite

### 1. Data Layer — Membresías (`data/membresia.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| MEMBRESIA-001 | `userHasMembresia` — retorna true si hay membresías | ✅ |
| MEMBRESIA-002 | `userHasMembresia` — retorna false si no hay membresías | ✅ |
| MEMBRESIA-003 | `userHasMembresia` — retorna false si hay error | ✅ |
| MEMBRESIA-004 | `getMembresiaByUser` — retorna membresía con plan | ✅ |
| MEMBRESIA-005 | `getMembresiaByUser` — retorna null si no hay membresía | ✅ |
| MEMBRESIA-006 | `getMembresiaByUser` — retorna null si hay error | ✅ |
| MEMBRESIA-007 | `createMembresia` — retorna true si la inserción es exitosa | ✅ |
| MEMBRESIA-008 | `createMembresia` — retorna false si hay error | ✅ |
| MEMBRESIA-009 | `createMembresia` — asigna 4 tokens para Plan Amateur | ✅ |
| MEMBRESIA-010 | `createMembresia` — asigna 6 tokens para Plan Pro | ✅ |
| MEMBRESIA-011 | `createMembresia` — asigna 12 tokens para Plan Selección | ✅ |
| MEMBRESIA-012 | `devolverToken` — retorna true si puede devolver token | ✅ |
| MEMBRESIA-013 | `devolverToken` — retorna false sin membresía con tokens_usados > 0 | ✅ |

### 2. Data Layer — Pagos (`data/pagos.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| PAGOS-001 | `getMisBoletas` — retorna boletas con items mapeados | ✅ |
| PAGOS-002 | `getMisBoletas` — retorna array vacío si hay error | ✅ |
| PAGOS-003 | `getMisBoletas` — retorna array vacío sin boletas | ✅ |
| PAGOS-004 | `getMisBoletas` — maneja boleta sin items | ✅ |
| PAGOS-005 | `getMiMembresia` — retorna membresía con datos del plan | ✅ |
| PAGOS-006 | `getMiMembresia` — retorna null sin membresía | ✅ |
| PAGOS-007 | `getMiMembresia` — retorna null si hay error | ✅ |

### 3. Data Layer — Planes (`data/plans.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| PLANS-001 | `getPlanes` — retorna lista de planes | ✅ |
| PLANS-002 | `getPlanes` — retorna array vacío si hay error | ✅ |
| PLANS-003 | `getPlanes` — retorna array vacío sin datos | ✅ |
| PLANS-004 | `getPlanesLimit` — retorna N planes | ✅ |
| PLANS-005 | `getPlanesLimit` — retorna array vacío si hay error | ✅ |

### 4. Data Layer — Ficha Médica (`data/fichaMedica.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| FICHA-001 | `calculateIMC` — calcula IMC correctamente (70 kg, 175 cm) | ✅ |
| FICHA-002 | `calculateIMC` — retorna 0 para valores extremos | ✅ |
| FICHA-003 | `calculateIMC` — redondea a 1 decimal | ✅ |
| FICHA-004 | `getIMCStatus` — Bajo peso para IMC < 18.5 | ✅ |
| FICHA-005 | `getIMCStatus` — Normal para IMC 18.5–24.9 | ✅ |
| FICHA-006 | `getIMCStatus` — Sobrepeso para IMC 25–29.9 | ✅ |
| FICHA-007 | `getIMCStatus` — Obesidad para IMC ≥ 30 | ✅ |
| FICHA-008 | `userHasFichaMedica` — retorna true cuando existe | ✅ |
| FICHA-009 | `userHasFichaMedica` — retorna false cuando no existe | ✅ |
| FICHA-010 | `userHasFichaMedica` — retorna false si hay error | ✅ |
| FICHA-011 | `createFichaMedica` — retorna true en inserción exitosa | ✅ |
| FICHA-012 | `createFichaMedica` — retorna false si hay error | ✅ |

### 5. Librería Flow (`lib/flow.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| FLOW-LIB-001 | `createFlowOrder` — llama a sandbox /payment/create con POST y content-type correcto | ✅ |
| FLOW-LIB-002 | `createFlowOrder` — incluye apiKey, commerceOrder, amount, email y firma | ✅ |
| FLOW-LIB-003 | `createFlowOrder` — codifica espacios como + (no %20) | ✅ |
| FLOW-LIB-004 | `createFlowOrder` — no escapa brackets [] en keys | ✅ |
| FLOW-LIB-005 | `createFlowOrder` — incluye recurrence como flat param | ✅ |
| FLOW-LIB-006 | `createFlowOrder` — no incluye recurrence si no se especifica | ✅ |
| FLOW-LIB-007 | `createFlowOrder` — incluye paymentMethod y timeout si se pasan | ✅ |
| FLOW-LIB-008 | `createFlowOrder` — retorna url, token y flowOrder | ✅ |
| FLOW-LIB-009 | `createFlowOrder` — lanza error si Flow responde con HTTP error | ✅ |
| FLOW-LIB-010 | `getFlowPaymentStatus` — llama a sandbox /payment/getStatus | ✅ |
| FLOW-LIB-011 | `getFlowPaymentStatus` — retorna el estado del pago | ✅ |
| FLOW-LIB-012 | `getFlowPaymentStatus` — lanza error si Flow responde con HTTP error | ✅ |
| FLOW-LIB-013 | `generateSignature` — formato hexadecimal de 64 caracteres | ✅ |

### 6. API Flow — Create Order (`api/flow/create-order.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| FLOW-API-CO-001 | retorna 401 si no hay usuario autenticado | ✅ |
| FLOW-API-CO-002 | retorna 400 si falta planId | ✅ |
| FLOW-API-CO-003 | retorna 404 si el usuario no existe | ✅ |
| FLOW-API-CO-004 | retorna 404 si el plan no existe | ✅ |
| FLOW-API-CO-005 | retorna 409 si ya hay membresía activa en el mes | ✅ |
| FLOW-API-CO-006 | permite comprar si membresía anterior está vencida | ✅ |
| FLOW-API-CO-007 | retorna 200 con url, token y boletaId en éxito | ✅ |
| FLOW-API-CO-008 | llama a createFlowOrder con parámetros correctos | ✅ |
| FLOW-API-CO-009 | retorna 200 y crea recurrencia si se solicita pago automático | ✅ |
| FLOW-API-CO-010 | retorna 502 si Flow falla y hace rollback | ✅ |

### 7. API Flow — Confirm (`api/flow/confirm.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| FLOW-API-CF-001 | retorna 400 si falta boletaId | ✅ |
| FLOW-API-CF-002 | retorna 404 si la boleta no existe | ✅ |
| FLOW-API-CF-003 | retorna pagado si Flow aprueba y boleta estaba pendiente | ✅ |
| FLOW-API-CF-004 | retorna rechazado si Flow no aprueba (status !== 2) | ✅ |
| FLOW-API-CF-005 | retorna 403 si commerceOrder no coincide con boletaId | ✅ |
| FLOW-API-CF-006 | retorna pendiente si getFlowPaymentStatus lanza error (sandbox) | ✅ |
| FLOW-API-CF-007 | retorna pagado si boleta ya estaba pagada en Supabase | ✅ |
| FLOW-API-CF-008 | retorna pagado con token literal `{token}` si boleta ya pagada | ✅ |
| FLOW-API-CF-009 | retorna pendiente con token literal `{token}` si boleta no pagada | ✅ |

### 8. API Flow — Cancel (`api/flow/cancel.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| FLOW-API-CA-001 | retorna 400 si falta boletaId | ✅ |
| FLOW-API-CA-002 | retorna 404 si la boleta no existe | ✅ |
| FLOW-API-CA-003 | retorna 403 si la boleta no pertenece al usuario | ✅ |
| FLOW-API-CA-004 | retorna 200 con estado anulado si boleta estaba pendiente | ✅ |
| FLOW-API-CA-005 | no modifica boleta ya pagada | ✅ |
| FLOW-API-CA-006 | no modifica boleta ya anulada | ✅ |

### 9. API Flow — Webhook (`api/flow/webhook.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| FLOW-API-WH-001 | retorna 400 si falta token | ✅ |
| FLOW-API-WH-002 | retorna 400 si content-type no es soportado | ✅ |
| FLOW-API-WH-003 | marca boleta como pagada si status=2 (form-urlencoded) | ✅ |
| FLOW-API-WH-004 | marca boleta como pagada si status=2 (JSON) | ✅ |
| FLOW-API-WH-005 | retorna 404 si la boleta no existe | ✅ |
| FLOW-API-WH-006 | retorna "Ya procesado" si boleta ya pagada sin recurrencia | ✅ |
| FLOW-API-WH-007 | marca boleta como rechazada si status=3 | ✅ |
| FLOW-API-WH-008 | marca boleta como rechazada si status=4 | ✅ |
| FLOW-API-WH-009 | crea nueva boleta para cobro recurrente si recurrencia activa | ✅ |
| FLOW-API-WH-010 | no crea nueva boleta si recurrencia no está activa | ✅ |
| FLOW-API-WH-011 | usa datos del POST body como fallback si getFlowPaymentStatus falla | ✅ |
| FLOW-API-WH-012 | retorna OK sin procesar si falla getFlowPaymentStatus y faltan datos POST | ✅ |

### 10. API Admin — Clases (`api/admin/clases.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| API-ADM-CLASES-GET-001 | retorna 403 si el usuario no es admin | ✅ |
| API-ADM-CLASES-GET-002 | retorna lista completa con joins | ✅ |
| API-ADM-CLASES-GET-003 | `?tipo=sedes` retorna sedes | ✅ |
| API-ADM-CLASES-GET-004 | `?tipo=asistencia-general` retorna con nombres | ✅ |
| API-ADM-CLASES-GET-005 | `?tipo=asistencia` sin clase_id retorna 400 | ✅ |
| API-ADM-CLASES-GET-005 | `?tipo=asistencia` con clase_id retorna 200 | ✅ |
| API-ADM-CLASES-POST-001 | retorna 400 si faltan campos requeridos | ✅ |
| API-ADM-CLASES-POST-002 | crea clase exitosamente | ✅ |
| API-ADM-CLASES-POST-003 | usa horarios[0] como fecha_hora si se provee | ✅ |
| API-ADM-CLASES-PUT-001 | retorna 400 si falta id | ✅ |
| API-ADM-CLASES-PUT-002 | actualiza campos enviados | ✅ |
| API-ADM-CLASES-DEL-001 | elimina clase y retorna tokens devueltos | ✅ |
| API-ADM-CLASES-PATCH-001 | registrar-asistencia upsert crea si no existe | ✅ |
| API-ADM-CLASES-PATCH-002 | retorna 400 para acción inválida | ✅ |
| API-ADM-CLASES-PATCH-003 | retorna 400 si faltan clase_id o usuario_id | ✅ |

### 11. API Admin — Profesores (`api/admin/profesores.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| API-ADM-PROFESORES-GET-001 | retorna lista de profesores con joins | ✅ |
| API-ADM-PROFESORES-POST-001 | retorna 400 si falta email | ✅ |
| API-ADM-PROFESORES-POST-002 | crea profesor exitosamente | ✅ |
| API-ADM-PROFESORES-POST-003 | retorna 409 si el usuario ya existe como profesor | ✅ |
| API-ADM-PROFESORES-PUT-001 | actualiza profesor exitosamente | ✅ |
| API-ADM-PROFESORES-PUT-002 | retorna 400 si falta id | ✅ |
| API-ADM-PROFESORES-DEL-001 | elimina profesor y su usuario | ✅ |
| API-ADM-PROFESORES-DEL-002 | retorna 400 si falta id | ✅ |
| API-ADM-PROFESORES-DEL-003 | retorna 200 si profesor no existe | ✅ |

### 12. API Admin — Módulos (`api/admin/modulos.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| API-ADM-MODULOS-GET-001 | retorna lista de módulos | ✅ |
| API-ADM-MODULOS-POST-001 | crea módulo exitosamente | ✅ |
| API-ADM-MODULOS-POST-002 | retorna 400 si falta título | ✅ |
| API-ADM-MODULOS-PUT-001 | actualiza módulo exitosamente | ✅ |
| API-ADM-MODULOS-PUT-002 | retorna 400 si falta id | ✅ |
| API-ADM-MODULOS-DEL-001 | elimina módulo exitosamente | ✅ |
| API-ADM-MODULOS-DEL-002 | retorna 400 si falta id | ✅ |

### 13. API Admin — Cápsulas (`api/admin/capsulas.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| API-ADM-CAPSULAS-GET-001 | retorna lista con modulo_nombre y profesor_nombre | ✅ |
| API-ADM-CAPSULAS-GET-002 | `?tipo=modulos` retorna módulos para dropdown | ✅ |
| API-ADM-CAPSULAS-POST-001 | retorna 400 si falta título | ✅ |
| API-ADM-CAPSULAS-POST-002 | crea cápsula exitosamente | ✅ |
| API-ADM-CAPSULAS-PUT-001 | retorna 400 si falta id | ✅ |
| API-ADM-CAPSULAS-PUT-002 | actualiza cápsula exitosamente | ✅ |
| API-ADM-CAPSULAS-DEL-001 | elimina cápsula exitosamente | ✅ |

### 14. API Admin — Documentos (`api/admin/documentos.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| API-ADM-DOCUMENTOS-GET-001 | retorna 400 si falta capsula_id | ✅ |
| API-ADM-DOCUMENTOS-GET-002 | retorna documentos por capsula_id | ✅ |
| API-ADM-DOCUMENTOS-POST-001 | retorna 400 si faltan campos requeridos | ✅ |
| API-ADM-DOCUMENTOS-POST-002 | crea documento exitosamente | ✅ |
| API-ADM-DOCUMENTOS-DEL-001 | retorna 400 si falta id | ✅ |
| API-ADM-DOCUMENTOS-DEL-002 | elimina documento exitosamente | ✅ |

### 15. API Admin — Estudiantes (`api/admin/students.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| API-ADM-STUDENTS-POST-001 | crea estudiante exitosamente | ✅ |
| API-ADM-STUDENTS-POST-002 | retorna 400 si faltan campos requeridos | ✅ |
| API-ADM-STUDENTS-POST-003 | retorna 400 si rol es inválido | ✅ |

### 16. API Admin — Upload (`api/admin/upload.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| API-ADM-UPLOAD-001 | sube archivo exitosamente (imagen JPEG) | ✅ |
| API-ADM-UPLOAD-002 | retorna 400 si no se envía archivo | ✅ |
| API-ADM-UPLOAD-003 | retorna 400 si formato no permitido (PDF) | ✅ |

### 17. API Admin — Membresías (`api/admin/membresias.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| API-ADM-MEMBRESIAS-GET-001 | retorna lista de membresías | ✅ |
| API-ADM-MEMBRESIAS-GET-002 | retorna 401 si no está autenticado | ✅ |
| API-ADM-MEMBRESIAS-GET-003 | retorna 403 si no es admin/profesor | ✅ |

### 18. Webhook WhatsApp (`webhook/handlers.test.ts`)

| ID | Caso de prueba | Resultado |
|----|----------------|-----------|
| WH-001 | `horasHasta` — retorna horas positivas para fecha futura | ✅ |
| WH-002 | `horasHasta` — retorna horas negativas para fecha pasada | ✅ |
| WH-003 | `horasHasta` — retorna 0 para el mismo instante | ✅ |
| WH-004 | `horasHasta` — retorna fracción para minutos | ✅ |
| WH-005 | `confirmarAsistencia` — mensaje si no hay próximas clases | ✅ |
| WH-006 | `confirmarAsistencia` — mensaje si falta menos de 1 hora | ✅ |
| WH-007 | `confirmarAsistencia` — permite confirmar con exactamente 1 hora (borde) | ✅ |
| WH-008 | `confirmarAsistencia` — retorna éxito si confirma correctamente | ✅ |
| WH-009 | `confirmarAsistencia` — retorna error si confirmar falla | ✅ |
| WH-010 | `cancelarAsistencia` — mensaje si no hay próximas clases | ✅ |
| WH-011 | `cancelarAsistencia` — cancela con reembolso si faltan ≥ 3 horas | ✅ |
| WH-012 | `cancelarAsistencia` — cancela con reembolso si faltan exactamente 3 horas | ✅ |
| WH-013 | `cancelarAsistencia` — cancela sin reembolso si faltan < 3 horas | ✅ |
| WH-014 | `cancelarAsistencia` — responde igual si updateAsistencia falla | ✅ |
| WH-015 | `cancelarAsistencia` — responde distinto si devolverToken falla | ✅ |
| WH-016 | `procesarMensajeWhatsApp` — mensaje si usuario no registrado | ✅ |
| WH-017 | `procesarMensajeWhatsApp` — confirma asistencia con "1" | ✅ |
| WH-018 | `procesarMensajeWhatsApp` — cancela asistencia con "2" | ✅ |
| WH-019 | `procesarMensajeWhatsApp` — null para mensaje desconocido | ✅ |
| WH-020 | `procesarMensajeWhatsApp` — busca usuario con teléfono sin + | ✅ |

---

## Estadísticas por módulo

| Módulo | Suite | Tests | Resultado |
|--------|-------|-------|-----------|
| Data Layer | membresia.test.ts | 13 | ✅ 100 % |
| Data Layer | pagos.test.ts | 7 | ✅ 100 % |
| Data Layer | plans.test.ts | 5 | ✅ 100 % |
| Data Layer | fichaMedica.test.ts | 12 | ✅ 100 % |
| Librería | flow.test.ts | 13 | ✅ 100 % |
| API Flow | create-order.test.ts | 10 | ✅ 100 % |
| API Flow | confirm.test.ts | 9 | ✅ 100 % |
| API Flow | cancel.test.ts | 6 | ✅ 100 % |
| API Flow | webhook.test.ts | 12 | ✅ 100 % |
| API Admin | clases.test.ts | 15 | ✅ 100 % |
| API Admin | profesores.test.ts | 9 | ✅ 100 % |
| API Admin | modulos.test.ts | 7 | ✅ 100 % |
| API Admin | capsulas.test.ts | 7 | ✅ 100 % |
| API Admin | documentos.test.ts | 6 | ✅ 100 % |
| API Admin | students.test.ts | 3 | ✅ 100 % |
| API Admin | upload.test.ts | 3 | ✅ 100 % |
| API Admin | membresias.test.ts | 3 | ✅ 100 % |
| Webhook | handlers.test.ts | 20 | ✅ 100 % |
| **Total** | **18 suites** | **160** | **✅ 100 %** |

---

## Distribución por categoría

| Categoría | Suites | Tests |
|-----------|--------|-------|
| Data Layer (`src/tests/data/`) | 4 | 37 |
| Librería (`src/tests/lib/`) | 1 | 13 |
| API Flow (`src/tests/api/flow/`) | 4 | 37 |
| API Admin (`src/tests/api/admin/`) | 8 | 53 |
| Webhook (`src/tests/webhook/`) | 1 | 20 |
| **Total** | **18** | **160** |

---

*Documento generado automáticamente a partir de la ejecución de `npx vitest run` — Junio 2026.*
