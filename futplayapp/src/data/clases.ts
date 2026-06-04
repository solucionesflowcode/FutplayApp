import { createClient } from "@/utils/supabase/client";

export type ClaseRow = {
  id: string;
  titulo: string;
  descripcion: string;
  sede_id: string;
  cupo_maximo: number;
  profesor_id: string | null;
  created_at: string;
};

export type ClaseConRelaciones = ClaseRow & {
  sede_nombre: string;
  profesor_nombre: string;
  fecha_hora: string | null;
  inscritos: number;
};

export type Sede = {
  id: string;
  nombre: string;
};

export async function getProximaClase(userId: string): Promise<Array<{
  titulo: string;
  descripcion: string;
  fecha_hora: string;
  sede: string;
}>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clase_usuario")
    .select(`
            clase!inner (
                titulo,
                descripcion,
                fecha_hora,
                sede!inner (nombre)
            )
        `)
    .eq("usuario_id", userId)
    .in("asistencia", ["sin_confirmar", "pendiente", "confirmado_whatsapp"])
    .gte("clase.fecha_hora", new Date().toISOString())
    .order("clase.fecha_hora", { ascending: true })
    .limit(1);

  if (error || !data?.length) return [];

  const c = data[0].clase;
  const row = c?.[0];
  if (!row) return [];
  return [{
    titulo: row.titulo,
    descripcion: row.descripcion,
    fecha_hora: row.fecha_hora,
    sede: (row.sede as { nombre: string }[])?.[0]?.nombre ?? "",
  }];
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
  titulo: string;
  descripcion: string;
  sede_id: string;
  cupo_maximo: number;
  profesor_id?: string;
  fecha_hora?: string;
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
