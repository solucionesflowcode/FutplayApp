import { createClient } from "@/utils/supabase/client";

export type Sede = { id: string; nombre: string; activa: boolean };

/** Sedes de la academia (la política "Sedes: Lectura para todos" permite leerlas). */
export async function getSedes(): Promise<Sede[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("sede").select("id, nombre, activa").order("nombre");
  if (error) {
    console.error("Error fetching sedes:", error.message);
    return [];
  }
  return (data as Sede[]) || [];
}
