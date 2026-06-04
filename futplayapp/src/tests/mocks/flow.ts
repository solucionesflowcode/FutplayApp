import { http, HttpResponse } from "msw";

// ── Default mock responses ─────────────────────────────────

const defaultCreateResponse = {
    url: "https://sandbox.flow.cl/checkout",
    token: "mock-token-123",
    flowOrder: 99999,
};

const defaultStatusResponse = {
    flowOrder: 99999,
    commerceOrder: "mock-boleta-id",
    requestDate: new Date().toISOString(),
    status: 2,
    subject: "FutPlay - Plan Test",
    amount: 10000,
    currency: "CLP",
    email: "test@example.com",
    paymentMethod: "VISA",
};

// ── Handlers ────────────────────────────────────────────────

export const flowHandlers = [
    http.post("https://sandbox.flow.cl/api/payment/create", () => {
        return HttpResponse.json(defaultCreateResponse);
    }),

    http.post("https://sandbox.flow.cl/api/payment/getStatus", () => {
        return HttpResponse.json(defaultStatusResponse);
    }),
];

export { defaultCreateResponse, defaultStatusResponse };
