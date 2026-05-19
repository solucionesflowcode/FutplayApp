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
  horarios: { id: string; fecha_hora: string }[];
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
    const { data, error } = await supabase.rpc("get_proxima_clase", {
        p_usuario_id: userId,
    });
    if (error) {
        console.error("Error fetching proxima clase:", error.message);
        return [];
    }
    return (data ?? []) as Array<{
        titulo: string;
        descripcion: string;
        fecha_hora: string;
        sede: string;
    }>;
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
  horarios: string[];
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
  horarios?: string[];
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
  horarios: any[];
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
