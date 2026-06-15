import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, ".env.local") })

const crypto = await import("crypto")

const FLOW_API_KEY = process.env.FLOW_API_KEY
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY
const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL

if (!FLOW_API_KEY || !FLOW_SECRET_KEY || !BASE_URL) {
  console.error("Faltan variables de entorno: FLOW_API_KEY, FLOW_SECRET_KEY, BASE_URL")
  process.exit(1)
}

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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const headers = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" }

await fetch(`${SUPABASE_URL}/rest/v1/boleta?id=eq.${boletaId}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ transaccion_id: String(data.flowOrder) })
})
console.log("\nBoleta actualizada con flowOrder:", data.flowOrder)
