import { describe, it, expect } from "vitest";
import {
  decidirWatchdog,
  INACTIVIDAD_MAX_MS,
  INICIALIZACION_MAX_MS,
} from "../../../webhook/watchdog";

const T0 = 1_000_000_000;
const base = { conectado: false, inicializando: false, ultimoIntento: T0, ultimaActividad: 0 };

describe("decidirWatchdog", () => {
  it("BOT-WD-001: conectado nunca se reinicia", () => {
    expect(decidirWatchdog({ ...base, conectado: true, ahora: T0 + 60 * 60 * 1000 })).toBe("nada");
  });

  it("BOT-WD-002: no reinicia mientras el QR se sigue renovando", () => {
    // Lleva 10 min sin escanear, pero el último QR llegó hace 20 s.
    const ahora = T0 + 10 * 60 * 1000;
    expect(decidirWatchdog({ ...base, ahora, ultimaActividad: ahora - 20_000 })).toBe("nada");
  });

  it("BOT-WD-003: reinicia cuando el QR dejó de renovarse", () => {
    const ultimaActividad = T0 + 60_000;
    const ahora = ultimaActividad + INACTIVIDAD_MAX_MS + 1;
    expect(decidirWatchdog({ ...base, ahora, ultimaActividad })).toBe("reiniciar");
  });

  it("BOT-WD-004: sin ningún QR cuenta desde el último intento", () => {
    expect(decidirWatchdog({ ...base, ahora: T0 + INACTIVIDAD_MAX_MS })).toBe("nada");
    expect(decidirWatchdog({ ...base, ahora: T0 + INACTIVIDAD_MAX_MS + 1 })).toBe("reiniciar");
  });

  it("BOT-WD-005: actividad de un cliente anterior no evita reiniciar el actual", () => {
    // ultimaActividad es anterior al último intento: manda el intento.
    const ahora = T0 + INACTIVIDAD_MAX_MS + 1;
    expect(decidirWatchdog({ ...base, ahora, ultimaActividad: T0 - 5000 })).toBe("reiniciar");
  });

  it("BOT-WD-006: no interrumpe un initialize() en curso", () => {
    const ahora = T0 + INACTIVIDAD_MAX_MS + 1;
    expect(decidirWatchdog({ ...base, inicializando: true, ahora })).toBe("nada");
  });

  it("BOT-WD-007: fuerza el reinicio si initialize() se colgó", () => {
    const ahora = T0 + INICIALIZACION_MAX_MS + 1;
    expect(decidirWatchdog({ ...base, inicializando: true, ahora })).toBe("forzar");
  });

  it("BOT-WD-008: initialize() lenta pero con avance de carga no se fuerza", () => {
    const ahora = T0 + INICIALIZACION_MAX_MS + 60_000;
    expect(
      decidirWatchdog({ ...base, inicializando: true, ahora, ultimaActividad: ahora - 30_000 })
    ).toBe("nada");
  });
});
