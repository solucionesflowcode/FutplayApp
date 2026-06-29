import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cdhbfyqtubqnmgjdgkab.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("=== MEMBRESIAS ===");
  const { data: membresias, error: e1 } = await supabase.from("membresia").select("*").limit(20);
  if (e1) console.error("Error membresia:", e1.message);
  else console.log(JSON.stringify(membresias, null, 2));

  console.log("\n=== TRIGGERS on membresia ===");
  const { data: tg1 } = await supabase
    .from("information_schema.triggers")
    .select("trigger_name, event_manipulation, action_timing, action_statement")
    .eq("event_object_table", "membresia");
  if (tg1?.length > 0) console.log(JSON.stringify(tg1, null, 2));
  else {
    const { data: tg1b, error: e1b } = await supabase.rpc("get_supabase_sql", { 
      query: "SELECT trigger_name, event_manipulation, action_timing FROM information_schema.triggers WHERE event_object_table = 'membresia'" 
    });
    if (e1b) {
      // Try raw query via rest
      const r = await fetch("https://cdhbfyqtubqnmgjdgkab.supabase.co/rest/v1/rpc/", {
        headers: { "apikey": serviceRoleKey }
      });
      console.log("No triggers found or cannot query");
    }
  }

  console.log("\n=== TRIGGERS on clase_usuario ===");
  // Use pg_catalog via SQL query
  const { data: t2, error: e2 } = await supabase.from("clase_usuario").select("id").limit(1);
  console.log("clase_usuario accessible:", !e2);

  console.log("\n=== último boleta pagada ===");
  const { data: boletas } = await supabase
    .from("boleta")
    .select("id, usuario_id, estado, created_at, transaccion_id")
    .eq("estado", "pagado")
    .order("created_at", { ascending: false })
    .limit(5);
  if (boletas) console.log(JSON.stringify(boletas, null, 2));

  console.log("\n=== conexión OK ===");
}

main().catch(console.error);
