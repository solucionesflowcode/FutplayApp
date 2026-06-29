import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cdhbfyqtubqnmgjdgkab.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE";
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // 1. Check all membesias
  console.log("=== MEMBRESIAS ===");
  const { data: m, error: em } = await supabase.from("membresia").select("*").limit(50);
  if (em) console.log("ERROR:", em.message);
  else console.log(`Count: ${m.length}`, JSON.stringify(m.slice(0, 5), null, 2));

  // 2. Check latest boletas pagado
  console.log("\n=== BOLETAS PAGADAS (últimas 10) ===");
  const { data: b, error: eb } = await supabase
    .from("boleta")
    .select("id, usuario_id, estado, created_at")
    .eq("estado", "pagado")
    .order("created_at", { ascending: false })
    .limit(10);
  if (eb) console.log("ERROR:", eb.message);
  else {
    console.log(`Count: ${b?.length || 0}`);
    for (const boleta of b || []) {
      const { data: mem } = await supabase
        .from("membresia")
        .select("id, boleta_id")
        .eq("boleta_id", boleta.id)
        .maybeSingle();
      console.log(`  Boleta ${boleta.id} (usr=${boleta.usuario_id}, estado=${boleta.estado}) -> membresia: ${mem ? mem.id : '*** NOT FOUND ***'}`);
    }
  }

  // 3. Try to insert a test membresia
  console.log("\n=== TEST INSERT ===");
  const testId = crypto.randomUUID();
  const { data: ins, error: ei } = await supabase
    .from("membresia")
    .insert({
      usuario_id: "00000000-0000-0000-0000-000000000000",
      plan_id: "test-plan",
      boleta_id: testId,
      mes: new Date().toISOString(),
      tokens_totales: 10,
      tokens_usados: 0,
      estado: true,
    })
    .select("id")
    .maybeSingle();
  if (ei) console.log("INSERT ERROR:", JSON.stringify(ei));
  else console.log("INSERT OK:", ins?.id);

  // Cleanup test
  if (ins?.id) {
    await supabase.from("membresia").delete().eq("id", ins.id);
    console.log("Cleaned up test insert");
  }
}

main().catch(console.error);
