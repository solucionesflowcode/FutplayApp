import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

vi.mock("@/utils/supabase/client", () => ({
    createClient: vi.fn(),
}));

import { createClient } from "@/utils/supabase/client";
import { getMisBoletas, getMiMembresia } from "@/data/pagos";

const USER_ID = "user-test-001";

beforeEach(() => {
    __resetMocks();
    vi.mocked(createClient).mockReturnValue(createMockServerClient() as any);
});

describe("getMisBoletas", () => {
    const BOLETA_ITEM = {
        id: "item-1",
        boleta_id: "boleta-1",
        plan_id: "p1",
        cantidad: 1,
        precio: 15000,
        total: 15000,
        plan: { nombre: "Básico" },
    };

    const RAW_BOLETA = {
        id: "boleta-1",
        usuario_id: USER_ID,
        estado: "pagado",
        total: 15000,
        created_at: "2026-06-01T12:00:00Z",
        transaccion_id: "flow-123",
        boleta_item: [BOLETA_ITEM],
    };

    it("retorna boletas con items mapeados correctamente", async () => {
        __setTableData("boleta", [RAW_BOLETA]);

        const result = await getMisBoletas(USER_ID);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("boleta-1");
        expect(result[0].estado).toBe("pagado");
        expect(result[0].total).toBe(15000);
        expect(result[0].items).toHaveLength(1);
        expect(result[0].items[0].plan_nombre).toBe("Básico");
        expect(result[0].items[0].precio).toBe(15000);
    });

    it("retorna array vacío si hay error", async () => {
        __setTableData("boleta", null, { message: "Error" });

        const result = await getMisBoletas(USER_ID);

        expect(result).toEqual([]);
    });

    it("retorna array vacío si no hay boletas", async () => {
        __setTableData("boleta", []);

        const result = await getMisBoletas(USER_ID);

        expect(result).toEqual([]);
    });

    it("maneja boleta sin items", async () => {
        __setTableData("boleta", [{ ...RAW_BOLETA, boleta_item: null }]);

        const result = await getMisBoletas(USER_ID);

        expect(result).toHaveLength(1);
        expect(result[0].items).toEqual([]);
    });
});

describe("getMiMembresia", () => {
    const RAW_MEMBRESIA = {
        id: "memb-1",
        usuario_id: USER_ID,
        plan_id: "p1",
        tokens_totales: 25,
        tokens_usados: 5,
        mes: "2026-06-01",
        created_at: "2026-06-01T12:00:00Z",
        plan: {
            nombre: "Pro",
            tokens_mensuales: 25,
            precio: 25000,
        },
    };

    it("retorna membresía con datos del plan", async () => {
        __setTableData("membresia", RAW_MEMBRESIA);

        const result = await getMiMembresia(USER_ID);

        expect(result).not.toBeNull();
        expect(result!.id).toBe("memb-1");
        expect(result!.plan_nombre).toBe("Pro");
        expect(result!.tokens_totales).toBe(25);
        expect(result!.tokens_usados).toBe(5);
        expect(result!.tokens_restantes).toBe(20);
        expect(result!.precio).toBe(25000);
    });

    it("retorna null si no hay membresía", async () => {
        __setTableData("membresia", null);

        const result = await getMiMembresia(USER_ID);

        expect(result).toBeNull();
    });

    it("retorna null si hay error en la consulta", async () => {
        __setTableData("membresia", null, { message: "Error" });

        const result = await getMiMembresia(USER_ID);

        expect(result).toBeNull();
    });
});
