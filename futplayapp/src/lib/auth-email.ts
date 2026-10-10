import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mantiene el email de auth.users igual al de la tabla `usuario`.
 *
 * Las rutas admin editaban el email solo en `usuario`: el alumno o profesor
 * seguía iniciando sesión con el email viejo y quedaba desvinculado de su
 * perfil. Devuelve un mensaje de error, o null si todo salió bien (o si no
 * hay email que sincronizar, o el usuario no existe en auth.users).
 */
export async function sincronizarEmailAuth(
    admin: SupabaseClient,
    userId: string,
    email: string | undefined,
): Promise<string | null> {
    if (email === undefined) return null;

    const { error } = await admin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
    });

    if (error && error.status !== 404) return error.message;
    return null;
}
