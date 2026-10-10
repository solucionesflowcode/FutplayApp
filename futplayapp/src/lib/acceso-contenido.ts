import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ¿Puede el usuario ver contenido pago (videos y documentos de cápsulas)?
 *
 * - Staff (profesor/administrador): siempre.
 * - Alumno: con una membresía VIGENTE por fechas (fecha_inicio <= ahora <=
 *   fecha_vencimiento), no congelada, con tokens_totales > 0 (el registro de
 *   Plan Liga no da acceso) y activa o cerrada solo por agotar tokens.
 *
 * Antes se exigía que la membresía hubiera EMPEZADO en el mes calendario
 * actual: un plan comprado el mes anterior o uno trimestral dejaba sin acceso
 * a alumnos vigentes, y el staff también quedaba bloqueado.
 */
export async function tieneAccesoContenido(
    supabase: SupabaseClient,
    userId: string,
): Promise<boolean> {
    const { data: usuario } = await supabase
        .from("usuario")
        .select("rol")
        .eq("id", userId)
        .maybeSingle();

    if (usuario?.rol === "profesor" || usuario?.rol === "administrador") return true;

    const ahora = new Date().toISOString();
    const { data, error } = await supabase
        .from("membresia")
        .select("id")
        .eq("usuario_id", userId)
        .eq("congelada", false)
        .gt("tokens_totales", 0)
        .or("estado.eq.true,sin_tokens.eq.true")
        .lte("fecha_inicio", ahora)
        .gte("fecha_vencimiento", ahora)
        .limit(1);

    if (error) return false;
    return (data?.length ?? 0) > 0;
}
