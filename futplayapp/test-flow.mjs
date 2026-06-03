const crypto = await import("crypto")

const FLOW_API_KEY = "5F29FF7C-188B-4413-AFB9-85465A15L7E6"
const FLOW_SECRET_KEY = "baf2d88c4b41a714aa993c66a27c494c40ceab2e"
const BASE_URL = "https://113dd18786e138.lhr.life"

// Already-created boleta
const boletaId = "621b8a40-c81d-4f51-b16b-1bbfa520e84e"

const params = {
  apiKey: FLOW_API_KEY,
  commerceOrder: boletaId,
  subject: "FutPlay - Plan Amateur",
  currency: "CLP",
  amount: 10990,
  email: "joaquin.lepe.seg@gmail.com",
  urlConfirmation: `${BASE_URL}/api/flow/webhook`,
  urlReturn: `${BASE_URL}/pagos`,
  timeout: 1800,
}

const keys = Object.keys(params).sort()
const toSign = keys.map(k => `${k}${params[k]}`).join("")
const s = crypto.createHmac("sha256", FLOW_SECRET_KEY).update(toSign).digest("hex")

const formBody = new URLSearchParams({ ...params, s })
const resp = await fetch("https://sandbox.flow.cl/api/payment/create", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: formBody.toString()
})
const data = await resp.json()
console.log(JSON.stringify(data, null, 2))

if (data.url && data.token) {
  const payUrl = data.url + "?token=" + data.token
  console.log("\n=== LINK DE PAGO ===")
  console.log(payUrl)
  console.log("\nFlow Order ID:", data.flowOrder)
  console.log("Boleta ID:", boletaId)
  console.log("\nFlujo: pagas en Flow -> Flow llama a", BASE_URL + "/api/flow/webhook -> webhook actualiza boleta a 'pagado' -> trigger crea membresia")
}

// Update boleta with flowOrder
const SUPABASE_URL = "https://cdhbfyqtubqnmgjdgkab.supabase.co"
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE"
const headers = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" }

await fetch(`${SUPABASE_URL}/rest/v1/boleta?id=eq.${boletaId}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ transaccion_id: String(data.flowOrder) })
})
console.log("\nBoleta actualizada con flowOrder:", data.flowOrder)
