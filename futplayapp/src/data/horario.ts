import { createClient } from "@/utils/supabase/client";

export type Horario = {
  id: string;
  fecha_hora: string;
  clase_id: string;
};

export async function getHorariosEntre(desde: Date, hasta: Date) {
  const supabase = createClient();

  const { data } = await supabase
    .from("horario")
    .select("id, fecha_hora, clase_id")
    .gte("fecha_hora", desde.toISOString())
    .lte("fecha_hora", hasta.toISOString());

  return (data ?? []) as Horario[];
}

export async function getHorariosPasados() {
  const supabase = createClient();

  const { data } = await supabase
    .from("horario")
    .select("id, clase_id")
    .lt("fecha_hora", new Date().toISOString());

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
