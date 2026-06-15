export type DocumentoAdmin = {
  id: string;
  capsula_id: string;
  nombre: string;
  url_archivo: string;
  created_at: string;
};

export async function getDocumentosByCapsula(capsulaId: string): Promise<DocumentoAdmin[]> {
  const res = await fetch(`/api/admin/documentos?capsula_id=${capsulaId}`);
  if (!res.ok) {
    console.error("Error fetching documentos:", await res.text());
    return [];
  }
  return res.json();
}

export async function createDocumento(data: {
  capsula_id: string;
  nombre: string;
  url_archivo: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/documentos", {
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

export async function deleteDocumento(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/admin/documentos?id=${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error };
  }
  return { success: true };
}
