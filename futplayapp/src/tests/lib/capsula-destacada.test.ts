import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

const ref = vi.hoisted(() => ({ client: null as unknown as ReturnType<typeof import("@/tests/mocks/supabase").createMockServerClient> }));

vi.mock("@/utils/supabase/admin", () => ({
    getAdminClient: vi.fn(() => Promise.resolve(ref.client)),
}));

import { getCapsulaDestacadaId, setCapsulaDestacadaId } from "@/lib/capsula-destacada";

/** Payloads de update sobre capsula, en orden. */
function updates(): unknown[] {
    const fromSpy = ref.client.from as ReturnType<typeof vi.fn>;
    const payloads: unknown[] = [];
    fromSpy.mock.calls.forEach((call: unknown[], i: number) => {
        if (call[0] !== "capsula") return;
        for (const c of fromSpy.mock.results[i].value.update.mock.calls) payloads.push(c[0]);
    });
    return payloads;
}

beforeEach(() => {
    __resetMocks();
    ref.client = createMockServerClient();
});

describe("Cápsula destacada en la BD (antes en un archivo local)", () => {
    it("DEST-001: lee la cápsula con destacada = true", async () => {
        __setTableData("capsula", [{ id: "k1", destacada: false }, { id: "k2", destacada: true }]);

        expect(await getCapsulaDestacadaId()).toBe("k2");
    });

    it("DEST-002: sin destacada devuelve null", async () => {
        __setTableData("capsula", [{ id: "k1", destacada: false }]);

        expect(await getCapsulaDestacadaId()).toBeNull();
    });

    it("DEST-003: marcar quita primero la actual (índice único) y luego marca la nueva", async () => {
        __setTableData("capsula", [{ id: "k1", destacada: true }, { id: "k2", destacada: false }]);

        expect(await setCapsulaDestacadaId("k2")).toBe(true);
        expect(updates()).toEqual([{ destacada: false }, { destacada: true }]);
    });

    it("DEST-004: null solo quita la destacada", async () => {
        __setTableData("capsula", [{ id: "k1", destacada: true }]);

        expect(await setCapsulaDestacadaId(null)).toBe(true);
        expect(updates()).toEqual([{ destacada: false }]);
    });

    it("DEST-005: si la cápsula no existe devuelve false", async () => {
        __setTableData("capsula", [{ id: "k1", destacada: false }]);

        expect(await setCapsulaDestacadaId("no-existe")).toBe(false);
    });
});
