import type { PaymentStatus } from "@/lib/flow";

export function mockPaymentStatus(overrides: Partial<PaymentStatus>): PaymentStatus {
  return {
    flowOrder: 12345,
    commerceOrder: "BOLETA-001",
    requestDate: "2026-01-01 12:00:00",
    status: 2,
    subject: "Plan Mensual",
    amount: 15000,
    currency: "CLP",
    email: "test@example.com",
    paymentMethod: "1",
    ...overrides,
  };
}
