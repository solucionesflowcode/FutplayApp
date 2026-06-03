import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

vi.mock("@/utils/supabase/client", () => ({
    createClient: vi.fn(),
}));

import { createClient } from "@/utils/supabase/client";
import { getPlanes, getPlanesLimit } from "@/data/plans";

const MOCK_PLANS = [
    { id: "p1", nombre: "básico", tokens_mensuales: 10, precio: 15000 },
    { id: "p2", nombre: "pro", tokens_mensuales: 25, precio: 25000 },
    { id: "p3", nombre: "premium", tokens_mensuales: 50, precio: 40000 },
];

beforeEach(() => {
    __resetMocks();
    vi.mocked(createClient).mockReturnValue(createMockServerClient() as any);
});

describe("getPlanes", () => {
    it("retorna lista de planes", async () => {
        __setTableData("plan", MOCK_PLANS);

        const result = await getPlanes();

        expect(result).toHaveLength(3);
        expect(result[0].nombre).toBe("básico");
    });

    it("retorna array vacío si hay error", async () => {
        __setTableData("plan", null, { message: "Connection error" });

        const result = await getPlanes();

        expect(result).toEqual([]);
    });

    it("retorna array vacío si no hay datos", async () => {
        __setTableData("plan", []);

        const result = await getPlanes();

        expect(result).toEqual([]);
    });
});

describe("getPlanesLimit", () => {
    it("retorna N planes", async () => {
        __setTableData("plan", MOCK_PLANS);

        const result = await getPlanesLimit(2);

        expect(result).toHaveLength(3);
    });

    it("retorna array vacío si hay error", async () => {
        __setTableData("plan", null, { message: "Error" });

        const result = await getPlanesLimit(5);

        expect(result).toEqual([]);
    });
});
