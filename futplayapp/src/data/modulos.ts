export type Modulo = {
  id: string;
  nombre: string;
  descripcion: string;
  categoria_id: string | null;
  categoria_nombre: string;
  total_capsulas: number;
};

export type Categoria = {
  id: string;
  nombre: string;
};

export async function getModulos(): Promise<Modulo[]> {
  const res = await fetch("/api/admin/modulos");
  if (!res.ok) {
    console.error("Error fetching modulos:", await res.text());
    return [];
  }
  return res.json();
}

export async function getCategorias(): Promise<Categoria[]> {
  const res = await fetch("/api/admin/modulos?tipo=categorias");
  if (!res.ok) {
    console.error("Error fetching categorias:", await res.text());
    return [];
  }
  return res.json();
}

export async function createModulo(data: {
  nombre: string;
  descripcion: string;
  categoria_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/modulos", {
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

export async function updateModulo(data: {
  id: string;
  nombre?: string;
  descripcion?: string;
  categoria_id?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/modulos", {
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

export async function deleteModulo(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/admin/modulos?id=${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  return { success: true };
}
