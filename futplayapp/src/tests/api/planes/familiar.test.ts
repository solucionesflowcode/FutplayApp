import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { makeChain, __resetMocks, __setTableData } from "@/tests/mocks/supabase";
import { resetRateLimit } from "@/lib/rate-limit";

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

// Cliente con proyección de columnas (simula el select real de PostgREST),
// necesario para verificar que la ruta NO expone codigo_acceso.
function makeProjectedClient() {
    return {
        from: (table: string) => {
            let cols: string | undefined;
            const chain: any = makeChain(table);
            const origSelect = chain.select;
            const origMaybeSingle = chain.maybeSingle;
            chain.select = (c?: string, o?: any) => {
                cols = c;
                return origSelect(c, o);
            };
            chain.maybeSingle = () =>
                origMaybeSingle().then((r: any) => {
                    if (!cols || !r.data || typeof r.data !== "object" || cols.includes("*")) return r;
                    const picked = Object.fromEntries(
                        cols
                            .split(",")
                            .map((s) => s.trim())
                            .filter((c) => c in r.data)
                            .map((c) => [c, r.data[c]])
                    );
                    return { ...r, data: picked };
                });
            return chain;
        },
    };
}

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => (globalThis as any).__familiarProjectedClient()),
}));

import { GET } from "@/app/api/planes/familiar/route";

function makeRequest(query = ""): Request {
    return new Request(`http://localhost:3000/api/planes/familiar${query}`, {
        headers: { "x-forwarded-for": "1.2.3.4" },
    });
}

const FAMILIAR_PLAN = {
    id: "plan-fam",
    nombre: "Familiar",
    precio: 35000,
    tokens_mensuales: 40,
    dias_vigencia: 30,
    tipo_plan: "familiar",
    codigo_acceso: "tok-familiar-123",
};

describe("GET /api/planes/familiar", () => {
    beforeAll(() => {
        (globalThis as any).__familiarProjectedClient = makeProjectedClient;
    });

    beforeEach(() => {
        resetRateLimit();
        __resetMocks();
    });

    it("retorna 400 si falta el token", async () => {
        const res = await GET(makeRequest());

        expect(res.status).toBe(400);
    });

    it("retorna 404 si el token no corresponde a ningún plan familiar", async () => {
        __setTableData("plan", null);

        const res = await GET(makeRequest("?token=inexistente"));

        expect(res.status).toBe(404);
    });

    it("retorna el plan cuando el token es válido", async () => {
        __setTableData("plan", [FAMILIAR_PLAN]);

        const res = await GET(makeRequest("?token=tok-familiar-123"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.id).toBe("plan-fam");
        expect(json.nombre).toBe("Familiar");
    });

    it("nunca expone el codigo_acceso en la respuesta", async () => {
        __setTableData("plan", [FAMILIAR_PLAN]);

        const res = await GET(makeRequest("?token=tok-familiar-123"));
        const text = await res.text();

        expect(text).not.toContain("tok-familiar-123");
        expect(text).not.toContain("codigo_acceso");
    });
});
