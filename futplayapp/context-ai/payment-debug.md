# Payment Gateway Debug - Flow.cl

## Files

| File | Path |
|------|------|
| Create order API | `src/app/api/flow/create-order/route.ts` |
| Webhook (payment confirmation) | `src/app/api/flow/webhook/route.ts` |
| Confirm (poll) | `src/app/api/flow/confirm/route.ts` |
| Cancel orphan | `src/app/api/flow/cancel/route.ts` |
| Flow lib | `src/lib/flow.ts` |
| Plan selection UI | `src/app/(dashboard)/planes/page.tsx` |
| Checkout + payments UI | `src/app/(dashboard)/pagos/pagos-client.tsx` |
| Plan data | `src/data/plans.ts` |
| Membresia data | `src/data/membresia.ts` |
| Pagos data | `src/data/pagos.ts` |
| Admin planes CRUD API | `src/app/api/admin/planes/route.ts` |
| Admin membresias API | `src/app/api/admin/membresias/route.ts` |
| Dashboard PlanesRender | `src/components/userDashboard/PlanesRender.tsx` |
| ProximaRenovacion | `src/components/userDashboard/ProximaRenovacion.tsx` |
| FichaMedicaModal | `src/components/checkout/FichaMedicaModal.tsx` |

## Flow

```
User Browser -> /planes -> /pagos?id=X (checkout)
  -> POST /api/flow/create-order -> INSERT boleta + boleta_item + recurrencia
  -> redirect to Flow checkout
  -> (async) Flow POST /api/flow/webhook?boletaId=X -> UPDATE boleta estado="pagado"
  -> User returns to /pagos?boletaId=X&flowReturn=1&token=Y
  -> Poll GET /api/flow/confirm -> sees "pagado" -> success screen
```

## Issues by Severity

### 🔴 Critical

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Webhook marks boleta as paid but NEVER creates `membresia` row | `webhook/route.ts` | After marking paid, insert membresia with plan's tokens |
| 2 | Recurring charges also skip membresia creation | `webhook/route.ts` (recurrence block) | Same as #1 for recurrence path |

### 🟠 High

| # | Issue | File | Fix |
|---|-------|------|-----|
| 3 | Sandbox fallback trusts POST body unconditionally | `webhook/route.ts:45-59` | Validate `NEXT_PUBLIC_FLOW_SANDBOX` in production |
| 4 | Rollback without transaction in create-order (orphan records) | `create-order/route.ts:174-179` | Add `flow_confirmada` flag to boleta |
| 5 | No way to cancel recurrence | Missing endpoint | Create `POST /api/flow/cancel-recurrence` |

### 🟡 Medium

| # | Issue | File | Fix |
|---|-------|------|-----|
| 6 | No webhook idempotency (race condition on duplicate webhook) | `webhook/route.ts` | Use `transaccion_id` as idempotency key |
| 7 | Payment method hardcoded to 1 (cards only) | `create-order/route.ts:160` | Add selector in checkout UI |
| 8 | Expiration logic duplicated in 3 places | `create-order/route.ts`, `planes/page.tsx`, `pagos-client.tsx` | Centralize `calcularVencimiento()` in `src/lib/fechas.ts` |

### 🟢 Low

| # | Issue | File | Fix |
|---|-------|------|-----|
| 9 | No rate limiting on create-order | `create-order/route.ts` | Add rate limiter |
| 10 | No notifications on failed recurring payments | `webhook/route.ts` | Add WhatsApp/email alert |
| 11 | `{token}` literal in Flow sandbox return URL | `confirm/route.ts`, `pagos-client.tsx` | Handled but ugly UX |
| 12 | No startup validation for Flow env vars | `src/lib/flow.ts` | Validate at app startup |

## DB Tables Involved

- `plan` — available plans (precio, tokens_mensuales, activo, tipo)
- `boleta` — payment invoice (usuario_id, estado, total, transaccion_id, recurrencia_id)
- `boleta_item` — line items (boleta_id, plan_id, cantidad, precio, total)
- `membresia` — active membership (usuario_id, plan_id, mes, tokens_totales, tokens_usados, estado)
- `recurrencia` — auto-renewal subscription (usuario_id, plan_id, activa)
- `ficha_medica` — medical form required before purchase
