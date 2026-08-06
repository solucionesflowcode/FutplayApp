import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  confirmarAsistencia,
  cancelarAsistencia,
  procesarMensajeWhatsApp,
  horasHasta,
  buildReminderMessage,
  sendMessageWithRetry,
} from "../../../webhook/handlers";

type MockDb = {
  getProximaClaseUsuario: ReturnType<typeof vi.fn>;
  getProximaClaseUsuarioActioned: ReturnType<typeof vi.fn>;
  confirmarAsistencia: ReturnType<typeof vi.fn>;
  updateAsistencia: ReturnType<typeof vi.fn>;
  devolverToken: ReturnType<typeof vi.fn>;
  buscarUsuarioPorTelefono: ReturnType<typeof vi.fn>;
};

function createMockDb(): MockDb {
  return {
    getProximaClaseUsuario: vi.fn(),
    getProximaClaseUsuarioActioned: vi.fn(),
    confirmarAsistencia: vi.fn(),
    updateAsistencia: vi.fn(),
    devolverToken: vi.fn(),
    buscarUsuarioPorTelefono: vi.fn(),
  };
}

function classeFutura(horasOffset: number) {
  const d = new Date();
  d.setHours(d.getHours() + horasOffset);
  return {
    id: "insc-1",
    clase: { titulo: "Entrenamiento Funcional" },
    horario: { fecha_hora: d.toISOString() },
  };
}

function freezeTime(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}
function unfreezeTime() {
  vi.useRealTimers();
}

// ─── horasHasta ─────────────────────────────────────────────────────────

describe("horasHasta", () => {
  afterEach(unfreezeTime);

  it("retorna horas positivas para fecha futura", () => {
    freezeTime("2026-06-04T12:00:00Z");
    expect(horasHasta("2026-06-04T15:00:00Z")).toBe(3);
  });

  it("retorna horas negativas para fecha pasada", () => {
    freezeTime("2026-06-04T12:00:00Z");
    expect(horasHasta("2026-06-04T09:00:00Z")).toBe(-3);
  });

  it("retorna 0 para el mismo instante", () => {
    freezeTime("2026-06-04T12:00:00Z");
    expect(horasHasta("2026-06-04T12:00:00Z")).toBe(0);
  });

  it("retorna fracción para minutos", () => {
    freezeTime("2026-06-04T12:00:00Z");
    expect(horasHasta("2026-06-04T12:30:00Z")).toBe(0.5);
  });
});

// ─── confirmarAsistencia ────────────────────────────────────────────────

describe("confirmarAsistencia", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("retorna mensaje si no hay próximas clases", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(null);
    const res = await confirmarAsistencia("user-1", db);
    expect(res).toBe("No tienes clases próximas agendadas.");
    expect(db.confirmarAsistencia).not.toHaveBeenCalled();
  });

  it("retorna mensaje si falta menos de 1 hora", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(0.5));
    const res = await confirmarAsistencia("user-1", db);
    expect(res).toBe(
      "Ya no alcanzas a confirmar, la clase empieza en menos de 1 hora."
    );
    expect(db.confirmarAsistencia).not.toHaveBeenCalled();
  });

  it("permite confirmar con exactamente 1 hora (borde)", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(1));
    db.confirmarAsistencia.mockResolvedValue(true);
    const res = await confirmarAsistencia("user-1", db);
    expect(res).toContain("Asistencia confirmada");
    expect(db.confirmarAsistencia).toHaveBeenCalled();
  });

  it("retorna éxito si confirma correctamente", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.confirmarAsistencia.mockResolvedValue(true);
    const res = await confirmarAsistencia("user-1", db);
    expect(res).toBe(
      '✅ Asistencia confirmada! Nos vemos en "Entrenamiento Funcional".'
    );
    expect(db.confirmarAsistencia).toHaveBeenCalledWith("insc-1");
  });

  it("retorna error si confirmarAsistencia falla", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.confirmarAsistencia.mockResolvedValue(false);
    const res = await confirmarAsistencia("user-1", db);
    expect(res).toBe("Error al confirmar. Intentalo de nuevo.");
  });

  it("rechaza si falta 0.999 horas (menos de 1h, borde inferior)", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(0.999));
    const res = await confirmarAsistencia("user-1", db);
    expect(res).toBe("Ya no alcanzas a confirmar, la clase empieza en menos de 1 hora.");
    expect(db.confirmarAsistencia).not.toHaveBeenCalled();
  });
});

// ─── cancelarAsistencia ────────────────────────────────────────────────

describe("cancelarAsistencia", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("retorna mensaje si no hay próximas clases", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(null);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toBe("No tienes clases próximas agendadas.");
    expect(db.updateAsistencia).not.toHaveBeenCalled();
  });

  it("cancela con reembolso si faltan >= 3 horas", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.updateAsistencia.mockResolvedValue(true);
    db.devolverToken.mockResolvedValue(true);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toBe("❌ Clase cancelada. Te devolvimos el token.");
    expect(db.updateAsistencia).toHaveBeenCalledWith("insc-1", "cancelado");
    expect(db.devolverToken).toHaveBeenCalledWith("user-1");
  });

  it("cancela con reembolso si faltan exactamente 3 horas (borde)", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(3));
    db.updateAsistencia.mockResolvedValue(true);
    db.devolverToken.mockResolvedValue(true);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toContain("Te devolvimos el token");
    expect(db.updateAsistencia).toHaveBeenCalledWith("insc-1", "cancelado");
    expect(db.devolverToken).toHaveBeenCalledWith("user-1");
  });

  it("cancela sin reembolso si faltan menos de 3 horas", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(1));
    db.updateAsistencia.mockResolvedValue(true);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toBe(
      "❌ Clase cancelada. Como faltan menos de 3h, no se devuelve el token."
    );
    expect(db.updateAsistencia).toHaveBeenCalledWith(
      "insc-1",
      "cancelado_sin_reembolso"
    );
    expect(db.devolverToken).not.toHaveBeenCalled();
  });

  it("responde igual aunque updateAsistencia falle silenciosamente", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.updateAsistencia.mockResolvedValue(false);
    db.devolverToken.mockResolvedValue(true);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toBe("❌ Clase cancelada. Te devolvimos el token.");
    expect(db.updateAsistencia).toHaveBeenCalledWith("insc-1", "cancelado");
    expect(db.devolverToken).toHaveBeenCalledWith("user-1");
  });

  it("responde distinto si devolverToken falla", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.updateAsistencia.mockResolvedValue(true);
    db.devolverToken.mockResolvedValue(false);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toBe("❌ Clase cancelada. No se pudo devolver el token.");
  });

  it("cancela sin reembolso si faltan exactamente 2.999 horas (< 3h, borde inferior)", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(2.999));
    db.updateAsistencia.mockResolvedValue(true);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toContain("no se devuelve el token");
    expect(db.updateAsistencia).toHaveBeenCalledWith("insc-1", "cancelado_sin_reembolso");
    expect(db.devolverToken).not.toHaveBeenCalled();
  });

  it("intenta devolverToken aunque updateAsistencia falle (>= 3h)", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.updateAsistencia.mockResolvedValue(false);
    db.devolverToken.mockResolvedValue(true);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toContain("Te devolvimos el token");
    expect(db.devolverToken).toHaveBeenCalledWith("user-1");
  });

  it("avisa si update y devolverToken fallan ambos", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.updateAsistencia.mockResolvedValue(false);
    db.devolverToken.mockResolvedValue(false);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toBe("❌ Clase cancelada. No se pudo devolver el token.");
  });
});

// ─── procesarMensajeWhatsApp ────────────────────────────────────────────

describe("procesarMensajeWhatsApp", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("retorna null (silencio total) si el usuario no está registrado y no procesa nada más", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue(null);
    const res = await procesarMensajeWhatsApp("56912345678", "1", db);
    expect(res).toBeNull();
    expect(db.getProximaClaseUsuario).not.toHaveBeenCalled();
    expect(db.confirmarAsistencia).not.toHaveBeenCalled();
    expect(db.updateAsistencia).not.toHaveBeenCalled();
  });

  it("confirma asistencia con '1'", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.confirmarAsistencia.mockResolvedValue(true);
    const res = await procesarMensajeWhatsApp("56912345678", "1", db);
    expect(res).toContain("Asistencia confirmada");
  });

  it("cancela asistencia con '2'", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.updateAsistencia.mockResolvedValue(true);
    db.devolverToken.mockResolvedValue(true);
    const res = await procesarMensajeWhatsApp("56912345678", "2", db);
    expect(res).toContain("Clase cancelada");
  });

  it("retorna null para mensaje desconocido", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    const res = await procesarMensajeWhatsApp("56912345678", "HOLA", db);
    expect(res).toBeNull();
  });

  it("busca usuario con teléfono sin +", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    await procesarMensajeWhatsApp("56987654321", "1", db);
    expect(db.buscarUsuarioPorTelefono).toHaveBeenCalledWith("56987654321");
  });

  it("tolera espacios alrededor del texto", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.confirmarAsistencia.mockResolvedValue(true);
    const res = await procesarMensajeWhatsApp("56912345678", "  1  ", db);
    expect(res).toContain("Asistencia confirmada");
  });

  it("tolera minúsculas (1 en minúscula funciona)", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.confirmarAsistencia.mockResolvedValue(true);
    const res = await procesarMensajeWhatsApp("56912345678", "1", db);
    expect(res).toContain("Asistencia confirmada");
  });

  it("BOT-RESP-006: si manda otro texto teniendo clase pendiente, recuerda opciones", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    const res = await procesarMensajeWhatsApp("56912345678", "hola", db);
    expect(res).toContain("Para confirmar");
    expect(res).toContain("1");
    expect(res).toContain("2");
    expect(db.confirmarAsistencia).not.toHaveBeenCalled();
    expect(db.updateAsistencia).not.toHaveBeenCalled();
  });

  it("BOT-RESP-007: si manda otro texto sin clase pendiente, no responde", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(null);
    const res = await procesarMensajeWhatsApp("56912345678", "hola", db);
    expect(res).toBeNull();
  });

  it("BOT-RESP-001: retorna null si no hay clases pendientes ni actionadas", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(null);
    db.getProximaClaseUsuarioActioned.mockResolvedValue(null);

    const res1 = await procesarMensajeWhatsApp("56912345678", "1", db);
    expect(res1).toBeNull();

    const res2 = await procesarMensajeWhatsApp("56912345678", "2", db);
    expect(res2).toBeNull();
  });

  it("BOT-RESP-002: avisa si la clase ya fue cancelada desde la web", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(null);
    db.getProximaClaseUsuarioActioned.mockResolvedValue({
      id: "insc-1",
      clase: { titulo: "Spinning" },
      horario: { fecha_hora: new Date(Date.now() + 86400000).toISOString() },
      asistencia: "cancelado",
    });

    const res = await procesarMensajeWhatsApp("56912345678", "1", db);
    expect(res).toContain("Ya cancelaste");
    expect(res).toContain("Spinning");
    expect(res).toContain("desde la página web");
    expect(db.confirmarAsistencia).not.toHaveBeenCalled();
    expect(db.updateAsistencia).not.toHaveBeenCalled();
  });

  it("BOT-RESP-003: avisa si la clase ya fue confirmada desde la web", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(null);
    db.getProximaClaseUsuarioActioned.mockResolvedValue({
      id: "insc-1",
      clase: { titulo: "Yoga" },
      horario: { fecha_hora: new Date(Date.now() + 86400000).toISOString() },
      asistencia: "confirmado",
    });

    const res = await procesarMensajeWhatsApp("56912345678", "2", db);
    expect(res).toContain("Ya confirmaste");
    expect(res).toContain("Yoga");
    expect(res).toContain("Nos vemos allí");
    expect(db.confirmarAsistencia).not.toHaveBeenCalled();
    expect(db.updateAsistencia).not.toHaveBeenCalled();
  });

  it("BOT-RESP-004: detecta cancelado_sin_reembolso como cancelación previa", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(null);
    db.getProximaClaseUsuarioActioned.mockResolvedValue({
      id: "insc-1",
      clase: { titulo: "Funcional" },
      horario: { fecha_hora: new Date(Date.now() + 86400000).toISOString() },
      asistencia: "cancelado_sin_reembolso",
    });

    const res = await procesarMensajeWhatsApp("56912345678", "2", db);
    expect(res).toContain("Ya cancelaste");
    expect(db.updateAsistencia).not.toHaveBeenCalled();
  });

  it("BOT-RESP-005: flujo normal sigue funcionando si hay clase pendiente (no llama actioned)", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue({ id: "user-1", nombre: "Juan", rol: "jugador" });
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.confirmarAsistencia.mockResolvedValue(true);

    const res = await procesarMensajeWhatsApp("56912345678", "1", db);
    expect(res).toContain("Asistencia confirmada");
    expect(db.getProximaClaseUsuarioActioned).not.toHaveBeenCalled();
  });
});

// ─── buildReminderMessage ───────────────────────────────────────────────

describe("buildReminderMessage", () => {
  it("BOT-REMINDER-001: arma el recordatorio con nombre y título de la clase", () => {
    const msg = buildReminderMessage(
      { nombre: "Pedro" },
      { titulo: "Yoga" },
      new Date("2026-08-06T21:00:00Z")
    );
    expect(msg).toContain("Hola Pedro!");
    expect(msg).toContain("mañana a las");
    expect(msg).toContain("Yoga");
    expect(msg).toContain("Responde *1* para confirmar o *2* para cancelar.");
  });

  it("BOT-REMINDER-002: usa 'tu clase' si el título falta", () => {
    const msg = buildReminderMessage(
      { nombre: "Ana" },
      {},
      new Date("2026-08-06T21:00:00Z")
    );
    expect(msg).toContain('"tu clase"');
  });

  it("BOT-REMINDER-003: incluye la hora formateada en America/Santiago", () => {
    const msg = buildReminderMessage(
      { nombre: "Pedro" },
      { titulo: "Yoga" },
      new Date("2026-08-06T21:00:00Z")
    );
    expect(msg).toMatch(/a las \d{1,2}:\d{2}( ?(a\.? ?m\.?|p\.? ?m\.?))?/);
  });
});

// ─── sendMessageWithRetry ───────────────────────────────────────────────

describe("sendMessageWithRetry", () => {
  afterEach(unfreezeTime);

  it("BOT-RETRY-001: envía en el primer intento", async () => {
    const whatsapp = { sendMessage: vi.fn().mockResolvedValue(undefined) };
    await sendMessageWithRetry(whatsapp as any, "56912345678@c.us", "hola");
    expect(whatsapp.sendMessage).toHaveBeenCalledTimes(1);
    expect(whatsapp.sendMessage).toHaveBeenCalledWith("56912345678@c.us", "hola");
  });

  it("BOT-RETRY-002: reintenta en 'detached Frame' y luego tiene éxito", async () => {
    freezeTime("2026-08-01T12:00:00Z");
    const whatsapp = {
      sendMessage: vi
        .fn()
        .mockRejectedValueOnce(
          new Error("Failed to execute 'evaluate' on 'Page': target closed; detached Frame")
        )
        .mockResolvedValueOnce(undefined),
    };
    const promise = sendMessageWithRetry(whatsapp as any, "id", "msg");
    await vi.advanceTimersByTimeAsync(2000);
    await promise;
    expect(whatsapp.sendMessage).toHaveBeenCalledTimes(2);
  });

  it("BOT-RETRY-003: relanza errores que no son 'detached Frame'", async () => {
    const whatsapp = { sendMessage: vi.fn().mockRejectedValue(new Error("boom")) };
    await expect(sendMessageWithRetry(whatsapp as any, "id", "msg")).rejects.toThrow("boom");
    expect(whatsapp.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("BOT-RETRY-004: lanza tras agotar intentos si siempre falla con 'detached Frame'", async () => {
    freezeTime("2026-08-01T12:00:00Z");
    const whatsapp = { sendMessage: vi.fn().mockRejectedValue(new Error("detached Frame")) };
    const promise = sendMessageWithRetry(whatsapp as any, "id", "msg", 3);
    const assertion = expect(promise).rejects.toThrow("detached Frame");
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    await assertion;
    expect(whatsapp.sendMessage).toHaveBeenCalledTimes(3);
  });
});
