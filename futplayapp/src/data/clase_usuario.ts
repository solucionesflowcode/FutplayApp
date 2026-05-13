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

export async function actualizarAsistenciaPorHorario(
  horarioId: string,
  desde: Asistencia,
  hacia: Asistencia
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("clase_usuario")
    .update({ asistencia: hacia })
    .eq("horario_id", horarioId)
    .eq("asistencia", desde);

  return !error;
}
