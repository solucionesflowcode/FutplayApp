import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";
import { tieneAccesoContenido } from "@/lib/acceso-contenido";
import { getSignedEmbedUrl } from "@/lib/bunny";

const DIA = 24 * 60 * 60 * 1000;
const USER = "u1";

function membresia(over: Record<string, unknown> = {}) {
    return {
        id: "m1",
        usuario_id: USER,
        congelada: false,
        tokens_totales: 4,
        estado: true,
        sin_tokens: false,
        fecha_inicio: new Date(Date.now() - 10 * DIA).toISOString(),
        fecha_vencimiento: new Date(Date.now() + 20 * DIA).toISOString(),
        ...over,
    };
}

describe("tieneAccesoContenido", () => {
    beforeEach(() => {
        __resetMocks();
        __setTableData("usuario", { id: USER, rol: "jugador" });
    });

    const cliente = () => createMockServerClient() as never;

    it("ACC-001: alumno con membresía vigente que empezó el MES ANTERIOR tiene acceso", async () => {
        // Regresión: antes se exigía fecha_inicio dentro del mes calendario actual.
        __setTableData("membresia", [membresia({ fecha_inicio: new Date(Date.now() - 40 * DIA).toISOString(), fecha_vencimiento: new Date(Date.now() + 50 * DIA).toISOString() })]);

        expect(await tieneAccesoContenido(cliente(), USER)).toBe(true);
    });

    it("ACC-002: sin membresía vigente no tiene acceso", async () => {
        __setTableData("membresia", [membresia({ fecha_vencimiento: new Date(Date.now() - DIA).toISOString() })]);

        expect(await tieneAccesoContenido(cliente(), USER)).toBe(false);
    });

    it("ACC-003: membresía congelada no da acceso", async () => {
        __setTableData("membresia", [membresia({ congelada: true })]);

        expect(await tieneAccesoContenido(cliente(), USER)).toBe(false);
    });

    it("ACC-004: registro de Plan Liga (0 tokens) no da acceso", async () => {
        __setTableData("membresia", [membresia({ tokens_totales: 0, estado: false })]);

        expect(await tieneAccesoContenido(cliente(), USER)).toBe(false);
    });

    it("ACC-005: profesor y administrador tienen acceso sin membresía", async () => {
        __setTableData("membresia", []);

        __setTableData("usuario", { id: USER, rol: "profesor" });
        expect(await tieneAccesoContenido(cliente(), USER)).toBe(true);

        __setTableData("usuario", { id: USER, rol: "administrador" });
        expect(await tieneAccesoContenido(cliente(), USER)).toBe(true);
    });
});

describe("getSignedEmbedUrl", () => {
    const VIDEO = "video-guid-123";

    beforeEach(() => {
        process.env.BUNNY_LIBRARY_ID = "999";
        delete process.env.BUNNY_TOKEN_KEY;
    });

    it("BUNNY-SIG-001: firma con SHA256(key + videoId + expires) y agrega expires", () => {
        process.env.BUNNY_TOKEN_KEY = "clave-secreta";
        const antes = Math.floor(Date.now() / 1000);

        const url = new URL(getSignedEmbedUrl(VIDEO, 3600));

        expect(url.origin + url.pathname).toBe(`https://player.mediadelivery.net/embed/999/${VIDEO}`);
        const expires = Number(url.searchParams.get("expires"));
        expect(expires).toBeGreaterThanOrEqual(antes + 3600);
        expect(expires).toBeLessThanOrEqual(antes + 3601);
        const esperado = createHash("sha256").update("clave-secreta" + VIDEO + expires).digest("hex");
        expect(url.searchParams.get("token")).toBe(esperado);
    });

    it("BUNNY-SIG-002: sin BUNNY_TOKEN_KEY devuelve la URL sin firma (no rompe la reproducción)", () => {
        expect(getSignedEmbedUrl(VIDEO)).toBe(`https://player.mediadelivery.net/embed/999/${VIDEO}`);
    });
});
