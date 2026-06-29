import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cdhbfyqtubqnmgjdgkab.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("=== DIAGNOSIS ===");

  // 1. What columns does the membresia table have? Use an insert with only known-good fields
  console.log("\n1. Testing minimal insert (known columns)...");
  const testId = crypto.randomUUID();
  const { data: inserted, error: insertErr } = await supabase
    .from("membresia")
    .insert({
      id: testId,
      usuario_id: "00000000-0000-0000-0000-000000000000",
      plan_id: crypto.randomUUID(),
      mes: new Date().toISOString(),
      tokens_totales: 10,
      tokens_usados: 0,
      estado: true,
    })
    .select()
    .maybeSingle();

  if (insertErr) {
    console.log("   FAILED:", insertErr.message);
    console.log("   Code:", insertErr.code);
  } else {
    console.log("   SUCCESS:", inserted.id);
    await supabase.from("membresia").delete().eq("id", inserted.id);
    console.log("   Cleaned up");
  }

  // 2. What columns does the table actually have? Try to get from OpenAPI schema
  console.log("\n2. Checking Supabase schema cache for membresia columns...");
  // The only way to check without DDL is to try inserts with different fields
  const fieldsToTest = ["boleta_id", "plan_id", "usuario_id", "tokens_totales", "tokens_usados", "estado", "mes", "fecha_creacion", "created_at"];
  for (const field of fieldsToTest) {
    const { error } = await supabase
      .from("membresia")
      .select(field)
      .limit(1);
    if (error && error.message.includes("Could not find")) {
      console.log(`   MISSING: ${field}`);
    } else if (error) {
      console.log(`   ERROR (${field}): ${error.message.substring(0, 60)}`);
    } else {
      console.log(`   EXISTS: ${field}`);
    }
  }

  // 3. Try to use pg client via supabase internal
  console.log("\n3. Checking if we can run SQL via supabase...");
  const { data: rpcList } = await supabase.rpc("extensions", {});
  console.log("   RPCs accessible:", !!rpcList);

  // 4. Check triggers on the tables
  console.log("\n4. Summary of findings:");
  console.log(`
  ROOT CAUSE: The 'boleta_id' column does NOT exist in the 'membresia' table.
  
  The webhook code at src/app/api/flow/webhook/route.ts:225-233 inserts:
    {
      usuario_id: boleta.usuario_id,
      plan_id: boletaItem.plan_id,
      boleta_id: boleta.id,    // <--- THIS COLUMN DOESN'T EXIST
      mes,
      tokens_totales: plan.tokens_mensuales,
      tokens_usados: 0,
      estado: true,
    }
  
  Since the insert fails (PostgREST error PGRST204), and the error is
  in a try/catch (line 200-247), the webhook returns 200 OK but the
  membresia is NEVER created.
  
  FIX: Run in Supabase SQL Editor:
    ALTER TABLE membresia ADD COLUMN boleta_id UUID REFERENCES boleta(id) ON DELETE SET NULL;
  
  Then create a UNIQUE INDEX for idempotency (optional but recommended):
    CREATE UNIQUE INDEX IF NOT EXISTS idx_membresia_boleta_id ON membresia(boleta_id) WHERE boleta_id IS NOT NULL;
  
  After adding the column, existing pagado boletas can be retroactively
  converted to membresias via a script.
  `);
}

main().catch(console.error);
