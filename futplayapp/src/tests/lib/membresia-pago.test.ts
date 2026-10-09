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

    it("MEMPAGO-FECHA-001: fecha_inicio es el instante real (no la hora de Chile disfrazada de UTC)", async () => {
        // Regresión: ahoraChile() guardaba fecha_inicio/fecha_vencimiento 3-4 h
        // antes de lo real y las membresías vencían antes de tiempo.
        __setTableData("plan", { id: "p1", tokens_mensuales: 8, dias: 30, tipo_plan: "normal" });
        const { client, inserts } = setup();

        const antes = Date.now();
        await crearMembresiaPorBoleta(client, "b1", "u1");
        const despues = Date.now();

        const inicio = new Date(inserts[0].fecha_inicio).getTime();
        const vencimiento = new Date(inserts[0].fecha_vencimiento).getTime();
        expect(inicio).toBeGreaterThanOrEqual(antes);
        expect(inicio).toBeLessThanOrEqual(despues);
        expect(vencimiento - inicio).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it("MEMPAGO-DUP-001: unique violation (webhook y /confirm en paralelo) cuenta como ya_existe", async () => {
        __setTableData("plan", { id: "p1", tokens_mensuales: 8, dias: 30, tipo_plan: "normal" });
        __setTableData("membresia", null, { message: "duplicate key", code: "23505" });

        const res = await crearMembresiaPorBoleta(createMockServerClient() as any, "b1", "u1");

        expect(res).toEqual({ creada: false, motivo: "ya_existe" });
    });
});
