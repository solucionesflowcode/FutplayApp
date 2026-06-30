import { getAdminClient } from "@/utils/supabase/admin";

const BUCKET = "modulos_miniaturas";
const FILE_PATH = "config/capsula-destacada.json";

export async function getCapsulaDestacadaId(): Promise<string | null> {
  try {
    const admin = await getAdminClient();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .download(FILE_PATH);

    if (error || !data) return null;

    const text = await data.text();
    const json = JSON.parse(text);
    return json.capsula_id ?? null;
  } catch {
    return null;
  }
}

export async function setCapsulaDestacadaId(capsulaId: string | null): Promise<boolean> {
  try {
    const admin = await getAdminClient();
    const content = JSON.stringify(capsulaId ? { capsula_id: capsulaId } : {});
    const blob = new Blob([content], { type: "application/json" });

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(FILE_PATH, blob, { upsert: true, contentType: "application/json" });

    return !error;
  } catch {
    return false;
  }
}
