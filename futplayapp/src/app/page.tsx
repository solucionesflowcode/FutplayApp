import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Página raíz de la aplicación (Server Component).
 * Detecta si hay un usuario autenticado vía cookie y redirige según su rol.
 * 
 * Redirecciones:
 * - Sin usuario → /home
 * - administrador → /admin
 * - profesor → /dashboard
 * - jugador → /dashboard
 */
export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/home");
  }

  const { data: usuario } = await supabase
    .from("usuario")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario) {
    redirect("/login");
  }

  switch (usuario.rol) {
    case "administrador":
      redirect("/admin");
    case "profesor":
      redirect("/dashboard");
    case "jugador":
      redirect("/dashboard");
    default:
      redirect("/login");
  }
}
