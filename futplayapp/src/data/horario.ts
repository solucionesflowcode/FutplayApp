import { createClient } from "@/utils/supabase/client";

function localISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export type Horario = {
  id: string;
  fecha_hora: string;
  clase_id: string;
  usuario_id?: string;
};

export async function getHorariosEntre(desde: Date, hasta: Date) {
  const supabase = createClient();

  const { data } = await supabase
    .from("horario")
    .select("id, fecha_hora, clase_id")
    .gte("fecha_hora", localISO(desde))
    .lte("fecha_hora", localISO(hasta));

  return (data ?? []) as Horario[];
}

export async function getHorariosPasados() {
  const supabase = createClient();

  const { data } = await supabase
    .from("horario")
    .select("id, clase_id")
    .lt("fecha_hora", localISO(new Date()));

  return (data ?? []) as { id: string; clase_id: string }[];
}

export async function getHorario(id: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from("horario")
    .select("clase_id")
    .eq("id", id)
    .single();

  return data as { clase_id: string } | null;
}
