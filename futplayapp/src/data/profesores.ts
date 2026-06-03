export type Profesor = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  especialidad: string;
  foto_url: string;
  created_at: string;
  total_clases: number;
  clases: { id: string; titulo: string }[];
  total_capsulas: number;
  capsulas: { id: string; titulo: string }[];
};

export type ProfesorDropdown = {
  id: string;
  nombre: string;
};

export async function getProfesores(): Promise<Profesor[]> {
  const res = await fetch("/api/admin/profesores");
  if (!res.ok) {
    console.error("Error fetching profesores:", await res.text());
    return [];
  }
  return res.json();
}

export async function getProfesoresDropdown(): Promise<ProfesorDropdown[]> {
  const res = await fetch("/api/admin/profesores?tipo=dropdown");
  if (!res.ok) {
    console.error("Error fetching profesores dropdown:", await res.text());
    return [];
  }
  return res.json();
}

export async function createProfesor(data: {
  nombre: string;
  email: string;
  telefono?: string;
  especialidad?: string;
  foto_url?: string;
}): Promise<{ success: boolean; error?: string; tempPassword?: string }> {
  const res = await fetch("/api/admin/profesores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  const body = await res.json();
  return { success: true, tempPassword: body.tempPassword };
}

export async function updateProfesor(data: {
  id: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  especialidad?: string;
  foto_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/profesores", {
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

export async function deleteProfesor(id: string): Promise<{
  success: boolean;
  error?: string;
  clases_asociadas?: number;
  capsulas_asociadas?: number;
}> {
  const res = await fetch(`/api/admin/profesores?id=${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json();
    return {
      success: false,
      error: body.error,
      clases_asociadas: body.clases_asociadas,
      capsulas_asociadas: body.capsulas_asociadas,
    };
  }
  return { success: true };
}
