import crypto from "node:crypto";

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────

function getConfig() {
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;
  const isSandbox = process.env.NEXT_PUBLIC_FLOW_SANDBOX !== "false";

  if (!apiKey || !secretKey) {
    throw new Error("Missing FLOW_API_KEY or FLOW_SECRET_KEY env vars");
  }

  return {
    apiUrl: isSandbox
      ? "https://sandbox.flow.cl/api"
      : "https://www.flow.cl/api",
    apiKey,
    secretKey,
  };
}

// ──────────────────────────────────────────────
// Signature (HMAC-SHA256)
// ──────────────────────────────────────────────

/**
 * Genera firma HMAC-SHA256 para la API de Flow.
 *
 * 1. Ordena keys alfabéticamente
 * 2. Concatena key+value para cada parámetro
 * 3. HMAC-SHA256 con secretKey → hex
 */
function generateSignature(
  params: Record<string, string | number>,
  secretKey: string,
): string {
  const keys = Object.keys(params)
    .filter((k) => k !== "s")
    .sort();
  const toSign = keys.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type CreateOrderParams = {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
  paymentMethod?: 1 | 2 | 3 | 9;
  timeout?: number;
  recurrence?: { period: number };
};

export type CreateOrderResponse = {
  url: string;
  token: string;
  flowOrder: number;
};

export type PaymentStatus = {
  flowOrder: number;
  commerceOrder: string;
  requestDate: string;
  /** 1=pendiente, 2=aprobado, 3=rechazado, 4=cancelado */
  status: number;
  subject: string;
  amount: number;
  currency: string;
  email: string;
  paymentMethod: string;
  pending_info?: unknown;
  merchant_id?: string;
  optional?: Record<string, string>;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function toUrlEncoded(params: Record<string, string | number>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    const k = encodeURIComponent(key)
      .replace(/%5B/gi, "[")
      .replace(/%5D/gi, "]");
    const v = encodeURIComponent(String(value))
      .replace(/%20/g, "+");
    pairs.push(`${k}=${v}`);
  }
  return pairs.join("&");
}

// ──────────────────────────────────────────────
// API calls
// ──────────────────────────────────────────────

/**
 * Crea una orden de pago en Flow.
 *
 * - Llama a POST /payment/create
 * - Devuelve url + token para redirigir al checkout
 *
 * @returns `{ url, token, flowOrder }` — concatenar `url + "?token=" + token`
 */
export async function createFlowOrder(
  params: CreateOrderParams,
): Promise<CreateOrderResponse> {
  const { apiKey, secretKey, apiUrl } = getConfig();

  const body: Record<string, string | number> = {
    apiKey,
    commerceOrder: params.commerceOrder,
    subject: params.subject,
    amount: params.amount,
    email: params.email,
    urlConfirmation: params.urlConfirmation,
    urlReturn: params.urlReturn,
  };
  if (params.paymentMethod) body.paymentMethod = params.paymentMethod;
  if (params.timeout) body.timeout = params.timeout;
  if (params.recurrence) {
    body.recurrence = params.recurrence.period;
  }

  body.s = generateSignature(body, secretKey);

  const payload = toUrlEncoded(body);

  const res = await fetch(`${apiUrl}/payment/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Flow createOrder failed: ${res.status} ${error}`);
  }

  return res.json();
}

/**
 * Consulta el estado de un pago en Flow.
 *
 * - Se llama desde el webhook `/api/flow/webhook`
 *   después de que Flow POSTee un token a urlConfirmation.
 *
 * @param token - Token recibido en el POST de Flow al webhook
 */
export async function getFlowPaymentStatus(
  token: string,
): Promise<PaymentStatus> {
  const { apiKey, secretKey, apiUrl } = getConfig();

  const body: Record<string, string | number> = {
    apiKey,
    token,
  };
  body.s = generateSignature(body, secretKey);

  const res = await fetch(`${apiUrl}/payment/getStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: toUrlEncoded(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Flow getStatus failed: ${res.status} ${error}`);
  }

  return res.json();
}
