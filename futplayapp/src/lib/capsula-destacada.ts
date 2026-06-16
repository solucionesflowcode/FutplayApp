const BUCKET = "modulos_miniaturas";
const FILE_PATH = "config/capsula-destacada.json";

function getStorageUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FILE_PATH}`;
}

function getStorageUploadUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${FILE_PATH}`;
}

export async function getCapsulaDestacadaId(): Promise<string | null> {
  try {
    const res = await fetch(getStorageUrl(), {
      next: { revalidate: 5 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.capsula_id || null;
  } catch {
    return null;
  }
}

export async function setCapsulaDestacadaId(capsulaId: string | null): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return false;

  const body = JSON.stringify(capsulaId ? { capsula_id: capsulaId } : {});

  const res = await fetch(getStorageUploadUrl(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "x-upsert": "true",
    },
    body,
  });

  return res.ok;
}
