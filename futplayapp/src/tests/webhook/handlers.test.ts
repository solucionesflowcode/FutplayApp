import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  confirmarAsistencia,
  cancelarAsistencia,
  procesarMensajeWhatsApp,
  horasHasta,
} from "../../../webhook/handlers";

type MockDb = {
  getProximaClaseUsuario: ReturnType<typeof vi.fn>;
  confirmarAsistencia: ReturnType<typeof vi.fn>;
  updateAsistencia: ReturnType<typeof vi.fn>;
  devolverToken: ReturnType<typeof vi.fn>;
  buscarUsuarioPorTelefono: ReturnType<typeof vi.fn>;
};

function createMockDb(): MockDb {
  return {
    getProximaClaseUsuario: vi.fn(),
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
    expect(res).toBe("No tenés clases próximas agendadas.");
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

  it("responde igual aunque devolverToken falle silenciosamente", async () => {
    db.getProximaClaseUsuario.mockResolvedValue(classeFutura(5));
    db.updateAsistencia.mockResolvedValue(true);
    db.devolverToken.mockResolvedValue(false);
    const res = await cancelarAsistencia("user-1", db);
    expect(res).toBe("❌ Clase cancelada. Te devolvimos el token.");
  });
});

// ─── procesarMensajeWhatsApp ────────────────────────────────────────────

describe("procesarMensajeWhatsApp", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("retorna mensaje si el usuario no está registrado", async () => {
    db.buscarUsuarioPorTelefono.mockResolvedValue(null);
    const res = await procesarMensajeWhatsApp("56912345678", "1", db);
    expect(res).toBe(
      "No estás registrado en la academia. Contactate con la administración."
    );
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
});
