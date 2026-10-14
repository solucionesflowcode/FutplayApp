export type CapsulaAdmin = {
  id: string;
  titulo: string;
  imagen: string;
  creado: string;
  duracion: string | null;
  modulo_id: string | null;
  modulo_nombre: string;
  profesor_id: string | null;
  profesor_nombre: string;
  bunny_video_id: string | null;
  order_index: number | null;
  descripcion: string | null;
  destacada: boolean;
};

export type ModuloOption = {
  id: string;
  nombre: string;
  categoria_id: string | null;
};

export type CategoriaOption = {
  id: string;
  nombre: string;
};

export async function getCategoriasOptions(): Promise<CategoriaOption[]> {
  const res = await fetch("/api/admin/capsulas?tipo=categorias");
  if (!res.ok) {
    console.error("Error fetching categorias:", await res.text());
    return [];
  }
  return res.json();
}

export async function getCapsulasAdmin(): Promise<CapsulaAdmin[]> {
  const res = await fetch("/api/admin/capsulas");
  if (!res.ok) {
    console.error("Error fetching capsulas:", await res.text());
    return [];
  }
  return res.json();
}

export async function getModulosOptions(): Promise<ModuloOption[]> {
  const res = await fetch("/api/admin/capsulas?tipo=modulos");
  if (!res.ok) {
    console.error("Error fetching modulos:", await res.text());
    return [];
  }
  return res.json();
}

export async function createCapsula(data: {
  titulo: string;
  imagen?: string;
  creado?: string;
  duracion?: string;
  modulo_id?: string;
  profesor_id?: string;
  bunny_video_id?: string;
  order_index?: number;
  descripcion?: string;
}): Promise<{ success: boolean; error?: string; data?: { id: string } }> {
  const res = await fetch("/api/admin/capsulas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  const responseData = await res.json();
  return { success: true, data: { id: responseData.id } };
}

export async function updateCapsula(data: {
  id: string;
  titulo?: string;
  // null borra el dato (CAP-04)
  imagen?: string | null;
  creado?: string | null;
  duracion?: string | null;
  modulo_id?: string | null;
  profesor_id?: string | null;
  bunny_video_id?: string | null;
  order_index?: number;
  descripcion?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/capsulas", {
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

export async function setCapsulaDestacada(capsulaId: string | null): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/capsulas/destacada", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capsula_id: capsulaId }),
  });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  return { success: true };
}

/** avisos: el video o el PDF que no se pudieron borrar (la cápsula sí se borró). */
export async function deleteCapsula(id: string): Promise<{ success: boolean; error?: string; avisos?: string[] }> {
  const res = await fetch(`/api/admin/capsulas?id=${id}`, { method: "DELETE" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: body.error || "No se pudo eliminar la cápsula" };
  return { success: true, avisos: body.avisos ?? [] };
}

/**
 * CAP-02: borra de Bunny un video subido en el formulario que no se llegó a
 * guardar (se canceló o se reemplazó). Sin await en la UI: es limpieza.
 */
export async function descartarVideoSubido(videoId: string): Promise<void> {
  try {
    await fetch(`/api/bunny/delete?videoId=${encodeURIComponent(videoId)}`, { method: "DELETE" });
  } catch {
    // Sin conexión: queda en Bunny, no bloquea al admin.
  }
}
