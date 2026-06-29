import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";

vi.mock("@/utils/supabase/client", () => ({
    createClient: vi.fn(),
}));

import { createClient } from "@/utils/supabase/client";
import { userHasMembresia, getMembresiaByUser, createMembresia, devolverToken, getAllMembresiasConPlan, getAdminMembresias } from "@/data/membresia";

const USER_ID = "user-test-001";

beforeEach(() => {
    __resetMocks();
    vi.mocked(createClient).mockReturnValue(createMockServerClient() as any);
});

describe("userHasMembresia", () => {
    it("retorna true si hay membresías", async () => {
        __setTableData("membresia", [{ id: "m1", usuario_id: USER_ID }]);

        const result = await userHasMembresia(USER_ID);

        expect(result).toBe(true);
    });


    it("retorna false si no hay membresías", async () => {
        __setTableData("membresia", []);

        const result = await userHasMembresia(USER_ID);

        expect(result).toBe(false);
    });

    it("retorna false si hay error", async () => {
        __setTableData("membresia", null, { message: "Error" });

        const result = await userHasMembresia(USER_ID);

        expect(result).toBe(false);
    });
});

describe("getMembresiaByUser", () => {
    const RAW_MEMBRESIA = {
        id: "memb-1",
        usuario_id: USER_ID,
        plan_id: "p1",
        tokens_totales: 30,
        tokens_usados: 10,
        mes: "2026-06-01",

    };

    it("retorna membresía con plan", async () => {
        __setTableData("membresia", RAW_MEMBRESIA);
        __setTableData("plan", { id: "p1", nombre: "Premium", tokens_mensuales: 30, precio: 40000 });

        const result = await getMembresiaByUser(USER_ID);

        expect(result).not.toBeNull();
        expect(result!.plan_nombre).toBe("Premium");
        expect(result!.tokens_totales).toBe(30);
        expect(result!.tokens_usados).toBe(10);
        expect(result!.tokens_restantes).toBe(20);
        expect(result!.precio).toBe(40000);
    });


    it("retorna null si no hay membresía", async () => {
        __setTableData("membresia", null);

        const result = await getMembresiaByUser(USER_ID);

        expect(result).toBeNull();
    });

    it("retorna null si hay error en membresía", async () => {
        __setTableData("membresia", null, { message: "Error" });

        const result = await getMembresiaByUser(USER_ID);

        expect(result).toBeNull();
    });

});

describe("createMembresia", () => {
    it("retorna true si la inserción es exitosa", async () => {
        __setTableData("membresia", { id: "m-new" });

        const result = await createMembresia(USER_ID, "p1", 25);

        expect(result).toBe(true);
    });

    it("retorna false si hay error", async () => {
        __setTableData("membresia", null, { message: "Insert failed" });

        const result = await createMembresia(USER_ID, "p1", 25);

        expect(result).toBe(false);
    });

    it.each([
        { plan: "Plan Amateur", tokens: 4 },
        { plan: "Plan Pro", tokens: 6 },
        { plan: "Plan Selección", tokens: 12 },
    ])("asigna $tokens tokens totales al crear membresía de $plan", async ({ tokens }) => {
        __setTableData("membresia", { id: "m-new" });

        const result = await createMembresia(USER_ID, "p1", tokens);

        expect(result).toBe(true);
        const fromSpy = createClient().from as ReturnType<typeof vi.fn>;
        const chain = fromSpy.mock.results[0]?.value;
        const insertedData = chain.insert.mock.calls[0]?.[0];
        expect(insertedData?.tokens_totales).toBe(tokens);
        expect(insertedData?.tokens_usados).toBe(0);
        expect(insertedData?.plan_id).toBe("p1");
        expect(insertedData?.usuario_id).toBe(USER_ID);
    });
});

describe("devolverToken", () => {
    it("retorna true si la membresía actual tiene tokens usados", async () => {
        __setTableData("membresia", { id: "m1", tokens_usados: 5 });
        __setTableData("membresia_update", { id: "m1", tokens_usados: 4 });

        const result = await devolverToken(USER_ID);

        expect(result).toBe(true);
    });


    it("retorna false si no hay membresía", async () => {
        __setTableData("membresia", null);

        const result = await devolverToken(USER_ID);

        expect(result).toBe(false);
    });

    it("MB-009: retorna false si la membresía actual tiene tokens_usados=0 aunque haya una vieja con >0", async () => {
        __setTableData("membresia", [
            { id: "m-new", usuario_id: USER_ID, plan_id: "p1", tokens_totales: 30, tokens_usados: 0, mes: "2026-06-01" },
            { id: "m-old", usuario_id: USER_ID, plan_id: "p1", tokens_totales: 30, tokens_usados: 5, mes: "2026-05-01" },
        ]);

        const result = await devolverToken(USER_ID);

        expect(result).toBe(false);
    });
});

describe("getMembresiaByUser — múltiples membresías", () => {
    it("MB-007: elige la membresía más reciente cuando hay varias", async () => {
        __setTableData("membresia", [
            { id: "m-new", usuario_id: USER_ID, plan_id: "p1", tokens_totales: 30, tokens_usados: 5, mes: "2026-06-01" },
            { id: "m-old", usuario_id: USER_ID, plan_id: "p1", tokens_totales: 30, tokens_usados: 20, mes: "2026-05-01" },
        ]);
        __setTableData("plan", { id: "p1", nombre: "Premium", tokens_mensuales: 30, precio: 40000 });

        const result = await getMembresiaByUser(USER_ID);

        expect(result).not.toBeNull();
        expect(result!.membresia_id).toBe("m-new");
        expect(result!.tokens_restantes).toBe(25);
    });

    it("MB-008: usa membresía nueva aunque la vieja tenga más tokens restantes", async () => {
        __setTableData("membresia", [
            { id: "m-new", usuario_id: USER_ID, plan_id: "p1", tokens_totales: 30, tokens_usados: 0, mes: "2026-06-01" },
            { id: "m-old", usuario_id: USER_ID, plan_id: "p1", tokens_totales: 30, tokens_usados: 10, mes: "2026-05-01" },
        ]);
        __setTableData("plan", { id: "p1", nombre: "Premium", tokens_mensuales: 30, precio: 40000 });

        const result = await getMembresiaByUser(USER_ID);

        expect(result).not.toBeNull();
        expect(result!.membresia_id).toBe("m-new");
        expect(result!.tokens_restantes).toBe(30);
    });
});

describe("createMembresia — duplicados", () => {
    it("MB-010: crea membresía aunque exista una del mes pasado (no hay constraint único)", async () => {
        __setTableData("membresia", { id: "m1", usuario_id: USER_ID, plan_id: "p1", mes: "2026-05-01" });

        const result = await createMembresia(USER_ID, "p1", 30);

        expect(result).toBe(true);
    });
});

describe("getAllMembresiasConPlan", () => {
    const PLAN_A = { id: "pa", nombre: "Plan A", tokens_mensuales: 10, precio: 15000 };

    it("DATA-MEMB-TODAS-001: agrupa por usuario y elige la membresía con más tokens restantes", async () => {
        __setTableData("membresia", [
            { id: "m1", usuario_id: "u1", plan_id: "pa", tokens_totales: 10, tokens_usados: 2, mes: "2026-06-01" },
            { id: "m2", usuario_id: "u1", plan_id: "pa", tokens_totales: 10, tokens_usados: 0, mes: "2026-06-01" },
            { id: "m3", usuario_id: "u2", plan_id: "pa", tokens_totales: 10, tokens_usados: 5, mes: "2026-06-01" },
        ]);
        __setTableData("plan", [PLAN_A]);

        const result = await getAllMembresiasConPlan();

        expect(result).toHaveLength(2);
        const u1 = result.find((m) => m.usuario_id === "u1");
        const u2 = result.find((m) => m.usuario_id === "u2");
        expect(u1).not.toBeUndefined();
        expect(u2).not.toBeUndefined();
        expect(u1!.membresia_id).toBe("m2");
        expect(u1!.tokens_restantes).toBe(10);
        expect(u2!.membresia_id).toBe("m3");
        expect(u2!.tokens_restantes).toBe(5);
    });

    it("DATA-MEMB-TODAS-002: retorna array vacío si no hay membresías", async () => {
        __setTableData("membresia", []);

        const result = await getAllMembresiasConPlan();

        expect(result).toEqual([]);
    });

    it("DATA-MEMB-TODAS-003: retorna array vacío si hay error", async () => {
        __setTableData("membresia", null, { message: "DB error" });

        const result = await getAllMembresiasConPlan();

        expect(result).toEqual([]);
    });

    it("DATA-MEMB-TODAS-004: usa 'Sin plan' si el plan no existe", async () => {
        __setTableData("membresia", [
            { id: "m1", usuario_id: "u1", plan_id: "unknown", tokens_totales: 10, tokens_usados: 0, mes: "2026-06-01" },
        ]);
        __setTableData("plan", []);

        const result = await getAllMembresiasConPlan();

        expect(result).toHaveLength(1);
        expect(result[0].plan_nombre).toBe("Sin plan");
        expect(result[0].precio).toBe(0);
        expect(result[0].tokens_mensuales).toBe(0);
    });
});

describe("getAdminMembresias", () => {
    function mockFetch(response: object, status = 200) {
        return vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify(response), {
                status,
                headers: { "Content-Type": "application/json" },
            }),
        );
    }

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("DATA-MEMB-ADMIN-001: retorna lista de membresías desde fetch", async () => {
        mockFetch([{ membresia_id: "m1", usuario_id: "u1", plan_nombre: "Pro" }]);

        const result = await getAdminMembresias();

        expect(result).toHaveLength(1);
        expect(result[0].plan_nombre).toBe("Pro");
    });

    it("DATA-MEMB-ADMIN-002: retorna array vacío si fetch falla", async () => {
        mockFetch({ error: "No autorizado" }, 403);

        const result = await getAdminMembresias();

        expect(result).toEqual([]);
    });

    it("DATA-MEMB-ADMIN-003: retorna array vacío si fetch lanza error", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

        const result = await getAdminMembresias();

        expect(result).toEqual([]);
    });
});
