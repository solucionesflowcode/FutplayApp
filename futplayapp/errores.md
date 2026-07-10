# Plan de Resolución de Errores de Lint

## Estado actual
- **Build:** ✅ Pasa correctamente (`npm run build`)
- **Lint:** ❌ 142 errores, 105 warnings (`npm run lint`)

## Estrategia: de mayor a menor riesgo de romper la app

---

### ✅ Fase 0 — COMPLETADA (4 errores)
- `EditStudentModal.tsx` — mover `useState` antes del `useEffect` (immutability)
- `admin/page.tsx` — `@ts-ignore` → `@ts-expect-error`
- `api/auth/callback/route.ts` — `let` → `const`
- `ProfileForm.tsx` — `let` → `const` en formatRut

### ⬜ Fase 1 — SIN RIESGO (config ESLint)
- [ ] Agregar `webhook/**` a `globalIgnores`
- [ ] Deshabilitar `no-explicit-any` para `src/tests/**`
- [ ] Eliminar `children?: any[]` en `StudentsTable.tsx`

### ⬜ Fase 2 — RIESGO MUY BAJO (catch blocks + patrones seguros)
- [ ] ~25 catch blocks: `any` → `unknown` con guard `instanceof Error`
- [ ] `misclases-client.tsx`: arreglar `preserve-manual-memoization`

### ⬜ Fase 3 — RIESGO BAJO (suprimir regla agresiva)
- [ ] Deshabilitar `react-hooks/set-state-in-effect` (8 archivos)

### ⬜ Fase 4 — CONSULTAR SUPABASE (tipos exactos)
- [ ] Consultar Management API de Supabase para tipos de tablas
- [ ] Reemplazar `no-explicit-any` en source con interfaces precisas

### ⬜ Fase 5 — VERIFICACIÓN FINAL
- [ ] `npm run lint` → 0 errores
- [ ] `npm run build` → sigue pasando

---

## Total: ~142 errores a eliminar
