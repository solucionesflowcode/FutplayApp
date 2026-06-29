import { createClient } from "@/utils/supabase/client";

function localISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export type ClaseHorario = {
  id: string;
  fecha_hora: string;
  clase_id: string;
};

export async function getHorariosEntre(desde: Date, hasta: Date) {
  const supabase = createClient();

  const { data } = await supabase
    .from("clase")
    .select("id, fecha_hora")
    .gte("fecha_hora", localISO(desde))
    .lte("fecha_hora", localISO(hasta));

  return (data ?? []).map((c) => ({ id: c.id, fecha_hora: c.fecha_hora, clase_id: c.id })) as ClaseHorario[];
}

export async function getHorariosPasados() {
  const supabase = createClient();

  const { data } = await supabase
    .from("clase")
    .select("id")
    .lt("fecha_hora", localISO(new Date()));

  return (data ?? []).map((c) => ({ id: c.id, clase_id: c.id })) as { id: string; clase_id: string }[];
}

export async function getHorario(id: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from("clase")
    .select("id")
    .eq("id", id)
    .single();

  return data ? { clase_id: data.id } : null;
}