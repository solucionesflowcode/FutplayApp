import { createClient } from "@supabase/supabase-js";

const s = createClient(
  "https://cdhbfyqtubqnmgjdgkab.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE"
);

async function main() {
  const { data: boletas } = await s
    .from("boleta")
    .select("id, estado, created_at, usuario_id, flow_confirmada")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!boletas || boletas.length === 0) {
    console.log("No hay boletas");
    return;
  }

  console.log(`Total: ${boletas.length}`);
  const now = new Date();
  console.log(`Hora actual (local): ${now.toString()}`);
  console.log(`Hora actual (UTC):   ${now.toISOString()}`);
  console.log("");
  
  for (const b of boletas) {
    const created = new Date(b.created_at);
    const diff = (now.getTime() - created.getTime()) / 3600000;
    console.log(`${b.id.substring(0, 8)}... | ${b.estado.padEnd(12)} | created: ${b.created_at} (${diff.toFixed(1)}h ago) | flow_confirmada: ${b.flow_confirmada}`);
  }

  // Check membresias
  console.log("\n--- Membresias ---");
  const { data: mems } = await s.from("membresia").select("id, boleta_id, mes, created_at");
  console.log(`Total: ${mems?.length || 0}`);
  for (const m of mems || []) {
    console.log(`${m.id.substring(0, 8)}... | boleta: ${m.boleta_id?.substring(0, 8)}... | mes: ${m.mes} | created: ${m.created_at}`);
  }
}

main().catch(console.error);
