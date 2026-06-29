import { createClient } from "@supabase/supabase-js";

const s = createClient(
  "https://cdhbfyqtubqnmgjdgkab.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE"
);

async function main() {
  // Get all pagado boletas
  const { data: boletas } = await s
    .from("boleta")
    .select("id, usuario_id, estado, recurrencia_id, created_at")
    .eq("estado", "pagado")
    .order("created_at", { ascending: false });

  if (!boletas || boletas.length === 0) {
    console.log("No hay boletas pagadas");
    return;
  }

  console.log("Total pagado boletas:", boletas.length);
  for (const b of boletas) {
    console.log(`  ${b.id} | usr=${b.usuario_id?.substring(0, 8)}... | recurrencia=${b.recurrencia_id || "null"} | created=${b.created_at}`);
  }

  // Check recurrencias
  const recIds = [...new Set(boletas.filter((b) => b.recurrencia_id).map((b) => b.recurrencia_id))];
  if (recIds.length > 0) {
    const { data: recs } = await s.from("recurrencia").select("*").in("id", recIds);
    console.log("\nRecurrencias encontradas:", JSON.stringify(recs, null, 2));
  }

  // Check boleta_items
  const boletaIds = boletas.map((b) => b.id);
  const { data: items } = await s
    .from("boleta_item")
    .select("boleta_id, plan_id")
    .in("boleta_id", boletaIds);
  console.log(`\nBoleta_items: ${items?.length || 0}`);

  // Check if any usuario has a plan or membresia
  const userIds = [...new Set(boletas.map((b) => b.usuario_id))];
  for (const uid of userIds) {
    const { data: user } = await s.from("usuario").select("id, nombre").eq("id", uid).maybeSingle();
    console.log(`\nUsuario ${uid.substring(0, 8)}...: ${user?.nombre || "not found"}`);
  }
}

main().catch(console.error);
