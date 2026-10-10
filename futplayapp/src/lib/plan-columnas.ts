// Columnas de `plan` legibles por usuarios (anon/authenticated). codigo_acceso
// y codigo_acceso_hash NO: son el secreto del link de planes familiares/liga y
// la BD les revoca el SELECT (docs/migrations/2026-10-auditoria-plan-columnas.sql).
// Con ese permiso revocado, `select("*")` sobre plan falla para el usuario.
export const PLAN_COLUMNAS_PUBLICAS =
    "id, nombre, precio, tokens_mensuales, dias, dias_vigencia, tipo_plan, activo, created_at";
