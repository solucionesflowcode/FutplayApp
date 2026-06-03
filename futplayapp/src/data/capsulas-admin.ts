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
};

export type ModuloOption = {
  id: string;
  nombre: string;
};

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
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/capsulas", {
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

export async function updateCapsula(data: {
  id: string;
  titulo?: string;
  imagen?: string;
  creado?: string;
  duracion?: string;
  modulo_id?: string | null;
  profesor_id?: string | null;
  bunny_video_id?: string | null;
  order_index?: number;
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

export async function deleteCapsula(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/admin/capsulas?id=${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  return { success: true };
}
