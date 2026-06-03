import { createClient } from "@/utils/supabase/client";

export type ClaseEvent = {
  claseId: string;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string;
  sede: string;
  isMine: boolean;
};

export type AlumnoAsistencia = {
  claseUsuarioId: string;
  usuarioId: string;
  nombre: string;
  estado: string | boolean | null;
};

type ClaseRow = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string | null;
  sede: { nombre: string } | null;
};

type ClaseUsuarioRow = {
  id: string;
  asistencia: string | boolean | null;
  usuario_id: string;
};

async function fetchAllClases(): Promise<ClaseEvent[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clase")
    .select(`
      id,
      titulo,
      descripcion,
      fecha_hora,
      sede:sede_id ( nombre )
    `)
    .order("fecha_hora", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Error fetching all clases:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row: unknown) => {
      const r = row as ClaseRow;
      return r.fecha_hora !== null;
    })
    .map((row: unknown) => {
      const r = row as ClaseRow;
      return {
        claseId: r.id,
        titulo: r.titulo,
        descripcion: r.descripcion,
        fecha_hora: r.fecha_hora!,
        sede: r.sede?.nombre ?? "",
        isMine: false,
      };
    });
}

async function fetchProfesorClaseIds(profesorId: string): Promise<Set<string>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clase_usuario")
    .select("clase_id")
    .eq("usuario_id", profesorId);

  if (error) {
    console.error("Error fetching profesor clase ids:", error.message);
    return new Set();
  }

  return new Set(data?.map((r: { clase_id: string }) => r.clase_id) ?? []);
}

export async function getTodasLasClases(profesorId: string): Promise<ClaseEvent[]> {
  const [allClases, misClaseIds] = await Promise.all([
    fetchAllClases(),
    fetchProfesorClaseIds(profesorId),
  ]);

  return allClases.map((c) => ({
    ...c,
    isMine: misClaseIds.has(c.claseId),
  }));
}

export async function getAlumnosPorClase(claseId: string): Promise<AlumnoAsistencia[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clase_usuario")
    .select(`
      id,
      asistencia,
      usuario_id
    `)
    .eq("clase_id", claseId)
    .in("asistencia", ["confirmado_whatsapp", "asistio", "no_asistio"]);

  if (error) {
    console.error("Error fetching alumnos:", error.message);
    return [];
  }

  const rows = (data ?? []) as ClaseUsuarioRow[];
  const usuarioIds = [...new Set(rows.map((d) => d.usuario_id))];

  const { data: usuarios, error: usuariosError } = usuarioIds.length > 0
    ? await supabase
        .from("usuario")
        .select("id, nombre")
        .in("id", usuarioIds)
    : { data: [], error: null };

  if (usuariosError) {
    console.error("Error fetching usuarios:", usuariosError.message);
    return [];
  }

  const usuarioMap = new Map((usuarios as Array<{ id: string; nombre: string }> ?? []).map((u) => [u.id, u.nombre]));

  return rows.map((d) => ({
    claseUsuarioId: d.id,
    usuarioId: d.usuario_id,
    nombre: usuarioMap.get(d.usuario_id) ?? "Desconocido",
    estado: d.asistencia,
  }));
}

export async function updateAsistencia(
  claseUsuarioId: string,
  nuevoEstado: string,
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("clase_usuario")
    .update({ asistencia: nuevoEstado })
    .eq("id", claseUsuarioId);

  if (error) {
    console.error("Error updating asistencia:", error.message);
    return false;
  }
  return true;
}

export async function cerrarAsistencia(
  claseId: string,
  alumnosNoMarcados: string[],
): Promise<boolean> {
  if (alumnosNoMarcados.length === 0) return true;

  const supabase = createClient();

  const { error } = await supabase
    .from("clase_usuario")
    .update({ asistencia: "no asistio" })
    .in("id", alumnosNoMarcados);

  if (error) {
    console.error("Error closing asistencia:", error.message);
    return false;
  }
  return true;
}
