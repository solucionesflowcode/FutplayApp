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

export type InscripcionRow = {
  id: string;
  usuario_id: string;
  asistencia: string | null;
  usuario_nombre: string;
};

function localISONow(): string {
  return new Date().toISOString();
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
      ),
      asistencia
    `)
    .eq("usuario_id", userId)
    .gte("clase.fecha_hora", localISONow());

  if (error || !data?.length) return [];

  const excluded = new Set(["cancelado", "cancelado_sin_reembolso", "presente", "ausente"]);
  const rows: Array<{ titulo: string; descripcion: string; fecha_hora: string; sede: string; tipo_evento: "entrenamiento" | "partido" }> = [];
  for (const item of data) {
    if (excluded.has((item as { asistencia: string | null }).asistencia ?? "")) continue;
    const raw = item.clase;
    const c = (Array.isArray(raw) ? (raw as Record<string, unknown>[])[0] : raw) as Record<string, unknown>;
    if (!c || (!c.titulo && c.tipo_evento !== "partido")) continue;
    rows.push({
      titulo: (c.titulo as string) || "Partido",
      descripcion: c.descripcion as string,
      fecha_hora: c.fecha_hora as string,
      sede: ((c.sede as Record<string, string>)?.nombre ?? ""),
      tipo_evento: c.tipo_evento as "entrenamiento" | "partido",
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

type AsistenciaGeneralRow = {
  id: string;
  asistencia: string | null;
  clase_id: string;
  usuario_id: string;
  clase_titulo: string;
  usuario_nombre: string;
};

export type AsistenciaDetalleClase = {
  clase: {
    id: string;
    titulo: string | null;
    fecha_hora: string | null;
    cupo_maximo: number | null;
    [key: string]: unknown;
  };
  inscripciones: Array<InscripcionRow>;
};

export async function getAsistenciaGeneral(): Promise<AsistenciaGeneralRow[]> {
  const res = await fetch("/api/admin/clases?tipo=asistencia-general");
  if (!res.ok) return [];
  return res.json();
}

export async function getAsistenciaPorClase(claseId: string): Promise<AsistenciaDetalleClase | null> {
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
