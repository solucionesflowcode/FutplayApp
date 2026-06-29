import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cdhbfyqtubqnmgjdgkab.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("=== MEMBRESIAS ===");
  const { data: membresias, error: e1 } = await supabase.from("membresia").select("*");
  if (e1) console.error("Error:", e1.message);
  else console.log(JSON.stringify(membresias, null, 2));

  console.log("\n=== BOLETAS (últimas 5) ===");
  const { data: boletas, error: e2 } = await supabase.from("boleta").select("*").order("created_at", { ascending: false }).limit(5);
  if (e2) console.error("Error:", e2.message);
  else console.log(JSON.stringify(boletas, null, 2));

  console.log("\n=== TRIGGERS ===");
  const { data: triggers, error: e3 } = await supabase.rpc("pg_catalog", { query: "SELECT trigger_name, event_manipulation, action_timing FROM information_schema.triggers WHERE event_object_table = 'membresia'" });
  if (e3) {
    const { data: t2, error: e4 } = await supabase.from("membresia").select("id").limit(1);
    console.log("Triggers check skipped (rpc not available)");
  } else {
    console.log(JSON.stringify(triggers, null, 2));
  }

  console.log("\n=== TEST: create-order route frecuently used ===");
  console.log("Done");
}

main().catch(console.error);
