import { createClient } from "@/utils/supabase/client";

export type Asistencia =
  | "sin_confirmar"
  | "pendiente"
  | "confirmado_whatsapp"
  | "asistio"
  | "no_asistio"
  | "cancelado"
  | "cancelado_sin_reembolso";

export async function confirmarAsistencia(claseUsuarioId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("clase_usuario")
    .update({ asistencia: "confirmado_whatsapp" })
    .eq("id", claseUsuarioId);

  return !error;
}

export async function actualizarAsistencia(
  claseUsuarioId: string,
  estado: Asistencia
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("clase_usuario")
    .update({ asistencia: estado })
    .eq("id", claseUsuarioId);

  return !error;
}

export async function cancelarClase(
  inscripcionId: string,
  usuarioId: string,
  fechaHora: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/clases/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inscripcionId, fechaHora }),
    });

    return await res.json();
  } catch {
    return { success: false, message: "Error de conexión" };
  }
}
