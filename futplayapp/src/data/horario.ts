<<<<<<< HEAD
﻿import { createClient } from "@/utils/supabase/client";
=======
import { createClient } from "@/utils/supabase/client";
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

function localISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

<<<<<<< HEAD
export type ClaseHorario = {
  id: string;
  fecha_hora: string;
  clase_id: string;
=======
export type Horario = {
  id: string;
  fecha_hora: string;
  clase_id: string;
  usuario_id?: string;
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
};

export async function getHorariosEntre(desde: Date, hasta: Date) {
  const supabase = createClient();

  const { data } = await supabase
<<<<<<< HEAD
    .from("clase")
    .select("id, fecha_hora")
    .gte("fecha_hora", localISO(desde))
    .lte("fecha_hora", localISO(hasta));

  return (data ?? []).map((c) => ({ id: c.id, fecha_hora: c.fecha_hora, clase_id: c.id })) as ClaseHorario[];
=======
    .from("horario")
    .select("id, fecha_hora, clase_id")
    .gte("fecha_hora", localISO(desde))
    .lte("fecha_hora", localISO(hasta));

  return (data ?? []) as Horario[];
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
}

export async function getHorariosPasados() {
  const supabase = createClient();

  const { data } = await supabase
<<<<<<< HEAD
    .from("clase")
    .select("id")
    .lt("fecha_hora", localISO(new Date()));

  return (data ?? []).map((c) => ({ id: c.id, clase_id: c.id })) as { id: string; clase_id: string }[];
=======
    .from("horario")
    .select("id, clase_id")
    .lt("fecha_hora", localISO(new Date()));

  return (data ?? []) as { id: string; clase_id: string }[];
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
}

export async function getHorario(id: string) {
  const supabase = createClient();

  const { data } = await supabase
<<<<<<< HEAD
    .from("clase")
    .select("id")
    .eq("id", id)
    .single();

  return data ? { clase_id: data.id } : null;
}
=======
    .from("horario")
    .select("clase_id")
    .eq("id", id)
    .single();

  return data as { clase_id: string } | null;
}
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
