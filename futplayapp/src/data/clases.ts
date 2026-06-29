import { createClient } from "@/utils/supabase/client";

export type ClaseRow = {
  id: string;
  titulo: string | null;
  descripcion: string;
  sede_id: string | null;
  cupo_maximo: number | null;
  profesor_id: string | null;
  fecha_hora: string | null;
  tipo_evento: "entrenamiento" | "partido";
  created_at: string;
};

export type ClaseConRelaciones = ClaseRow & {
  sede_nombre: string;
  profesor_nombre: string;
  inscritos: number;
  presentes: number;
  ausentes: number;
  pendientes: number;
};

export type Sede = {
  id: string;
  nombre: string;
};

function localISONow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function getProximaClase(userId: string): Promise<Array<{
  titulo: string;
  descripcion: string;
  fecha_hora: string;
  sede: string;
  tipo_evento: "entrenamiento" | "partido";
}>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clase_usuario")
    .select(`
            clase!inner (
                titulo,
                descripcion,
                fecha_hora,
                tipo_evento,
                sede (nombre)
            )
        `)
    .eq("usuario_id", userId)
    .gte("clase.fecha_hora", localISONow());

  if (error || !data?.length) return [];

  const rows: Array<{ titulo: string; descripcion: string; fecha_hora: string; sede: string; tipo_evento: "entrenamiento" | "partido" }> = [];
  for (const item of data) {
    const c = item.clase as Record<string, unknown>;
    if (!c || !c.titulo) continue;
    rows.push({
      titulo: (c.titulo as string) || "Partido",
      descripcion: c.descripcion as string,
      fecha_hora: c.fecha_hora as string,
      sede: ((c.sede as Record<string, string>)?.nombre ?? ""),
    });
  }

  rows.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

  return rows.slice(0, 1);
}

// ─── Admin CRUD ───

export async function getClases(): Promise<ClaseConRelaciones[]> {
  const res = await fetch("/api/admin/clases");
  if (!res.ok) {
    console.error("Error fetching clases:", await res.text());
    return [];
  }
  return res.json();
}

export async function getSedes(): Promise<Sede[]> {
  const res = await fetch("/api/admin/clases?tipo=sedes");
  if (!res.ok) {
    console.error("Error fetching sedes:", await res.text());
    return [];
  }
  return res.json();
}

export async function createClase(data: {
  titulo?: string;
  descripcion: string;
  sede_id?: string;
  cupo_maximo?: number;
  profesor_id?: string;
  fecha_hora?: string;
  tipo_evento?: "entrenamiento" | "partido";
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/clases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  return { success: true };
}

export async function updateClase(data: {
  id: string;
  titulo?: string;
  descripcion?: string;
  sede_id?: string;
  cupo_maximo?: number;
  profesor_id?: string | null;
  fecha_hora?: string | null;
  tipo_evento?: "entrenamiento" | "partido";
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/clases", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  return { success: true };
}

export async function deleteClase(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/admin/clases?id=${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  return { success: true };
}

// ─── Asistencia ───

export async function getAsistenciaGeneral(): Promise<any[]> {
  const res = await fetch("/api/admin/clases?tipo=asistencia-general");
  if (!res.ok) return [];
  return res.json();
}

export async function getAsistenciaPorClase(claseId: string): Promise<{
  clase: any;
  inscripciones: any[];
} | null> {
  const res = await fetch(`/api/admin/clases?tipo=asistencia&clase_id=${claseId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function registrarAsistencia(
  claseId: string,
  usuarioId: string,
  asistencia: boolean
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/clases", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accion: "registrar-asistencia",
      clase_id: claseId,
      usuario_id: usuarioId,
      asistencia,
    }),
  });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  return { success: true };
}
