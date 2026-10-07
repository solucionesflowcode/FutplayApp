import { describe, it, expect, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";
import { crearMembresiaPorBoleta } from "@/lib/membresia-pago";

function setup() {
    const client = createMockServerClient();
    const inserts: any[] = [];
    const origFrom = client.from;
    client.from = ((table: string) => {
        const chain = origFrom(table);
        if (table === "membresia") {
            chain.insert = (row: any) => { inserts.push(row); return chain; };
        }
        return chain;
    }) as any;
    return { client: client as any, inserts };
}

describe("crearMembresiaPorBoleta", () => {
    beforeEach(() => {
        __resetMocks();
        __setTableData("boleta_item", { boleta_id: "b1", plan_id: "p1" });
    });

    it("plan normal: crea membresía activa con los tokens del plan", async () => {
        __setTableData("plan", { id: "p1", tokens_mensuales: 8, dias: 30, tipo_plan: "normal" });
        const { client, inserts } = setup();

        const res = await crearMembresiaPorBoleta(client, "b1", "u1");

        expect(res).toEqual({ creada: true, liga: false });
        expect(inserts[0]).toMatchObject({ usuario_id: "u1", plan_id: "p1", boleta_id: "b1", tokens_totales: 8, estado: true });
    });

    it("plan liga: crea registro inactivo sin tokens", async () => {
        __setTableData("plan", { id: "p1", tokens_mensuales: 1, dias: 90, tipo_plan: "liga" });
        const { client, inserts } = setup();

        const res = await crearMembresiaPorBoleta(client, "b1", "u1");

        expect(res).toEqual({ creada: true, liga: true });
        expect(inserts[0]).toMatchObject({ tokens_totales: 0, tokens_usados: 0, estado: false });
    });

    it("no duplica si ya existe membresía para la boleta", async () => {
        __setTableData("plan", { id: "p1", tokens_mensuales: 8, dias: 30, tipo_plan: "normal" });
        __setTableData("membresia", { id: "m1", boleta_id: "b1" });
        const { client, inserts } = setup();

        const res = await crearMembresiaPorBoleta(client, "b1", "u1");

        expect(res).toEqual({ creada: false, motivo: "ya_existe" });
        expect(inserts).toHaveLength(0);
    });
});
