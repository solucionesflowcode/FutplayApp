import { createClient } from "@supabase/supabase-js";

const s = createClient(
  "https://cdhbfyqtubqnmgjdgkab.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE"
);

async function main() {
  // Make a bogus insert into membresia and capture the ERROR DETAIL
  // This will tell us if any trigger/constraint is blocking it
  const testId = crypto.randomUUID();
  const { error } = await s.from("membresia").insert({
    id: testId,
    usuario_id: "00000000-0000-0000-0000-000000000000",
    plan_id: crypto.randomUUID(),
    boleta_id: crypto.randomUUID(),
    mes: new Date().toISOString(),
    tokens_totales: 10,
    tokens_usados: 0,
    estado: true,
  }).select().maybeSingle();
  
  if (error) {
    console.log("ERROR CODE:", error.code);
    console.log("MESSAGE:", error.message);
    console.log("DETAILS:", error.details || "(none)");
    console.log("HINT:", error.hint || "(none)");
  } else {
    console.log("INSERT OK - no constraints blocking");
  }

  // Now try inserting a row into clase_usuario to see if the trigger fires
  const testCuId = crypto.randomUUID();
  const { error: e2, data: d2 } = await s.from("clase_usuario").insert({
    id: testCuId,
    usuario_id: "00000000-0000-0000-0000-000000000000",
    clase_id: crypto.randomUUID(),
    asistencia: "sin_confirmar",
  }).select().maybeSingle();
  
  if (e2) {
    console.log("\nCLASE_USUARIO INSERT ERROR CODE:", e2.code);
    console.log("MESSAGE:", e2.message);
    console.log("DETAILS:", e2.details || "(none)");
    console.log("HINT:", e2.hint || "(none)");

    // Check if the error message contains our custom exception text
    if (e2.message && (e2.message.includes("membresía activa") || e2.message.includes("tokens"))) {
      console.log("\n*** ¡EL TRIGGER manejador_inscripcion_clase ESTÁ ACTIVO en clase_usuario! ***");
    }
  } else {
    console.log("\nCLASE_USUARIO INSERT OK - no trigger blocking");
    // Clean up
    await s.from("clase_usuario").delete().eq("id", testCuId);
  }

  // Clean up membresia test if it was created
  if (!error) {
    await s.from("membresia").delete().eq("id", testId);
  }
}

main().catch(console.error);
