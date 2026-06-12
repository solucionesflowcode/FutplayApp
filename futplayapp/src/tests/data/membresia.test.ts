import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";

vi.mock("@/utils/supabase/client", () => ({
    createClient: vi.fn(),
}));

import { createClient } from "@/utils/supabase/client";
import { userHasMembresia, getMembresiaByUser, createMembresia, devolverToken } from "@/data/membresia";

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
    it("retorna true si puede devolver token", async () => {
        __setTableData("membresia", { id: "m1", tokens_usados: 5 });
        __setTableData("membresia_update", { id: "m1", tokens_usados: 4 });

        const result = await devolverToken(USER_ID);

        expect(result).toBe(true);
    });

    it("retorna false si no hay membresía con tokens_usados > 0", async () => {
        __setTableData("membresia", null);

        const result = await devolverToken(USER_ID);

        expect(result).toBe(false);
    });
});
