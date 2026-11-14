// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import ProfileForm from "@/components/perfil/ProfileForm";

// Las sedes se leen de Supabase: se simulan para no mezclarlas con el fetch de /api/perfil.
vi.mock("@/data/sedes", () => ({
    getSedes: vi.fn(async () => [
        { id: "s-renaca", nombre: "Reñaca", activa: true },
        { id: "s-kids", nombre: "Kids", activa: true },
        { id: "s-cerrada", nombre: "Cerrada", activa: false },
    ]),
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("Mi Perfil: posición", () => {
    it("PER-POS-UI-001: carga la posición guardada y envía la elegida", async () => {
        const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
            ok: true,
            json: async () => init?.method === "PUT"
                ? { success: true }
                : { id: "u1", nombre: "Ana", email: "ana@test.cl", rol: "jugador", rut: null, telefono: null, posicion: "arquero" },
        }));
        vi.stubGlobal("fetch", fetchMock);
        render(<ProfileForm />);

        const select = await screen.findByLabelText("Posición");
        expect(select).toHaveValue("arquero");
        expect(screen.getByRole("option", { name: "Volante de contención" })).toBeInTheDocument();

        fireEvent.change(select, { target: { value: "delantero_centro" } });
        fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/ }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        const body = JSON.parse(fetchMock.mock.calls[1][1]!.body as string);
        expect(body.posicion).toBe("delantero_centro");
    });
});

describe("Mi Perfil: sede", () => {
    it("PER-SEDE-UI-001: carga la sede guardada, solo ofrece sedes activas y envía la elegida", async () => {
        const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
            ok: true,
            json: async () => init?.method === "PUT"
                ? { success: true }
                : { id: "u1", nombre: "Ana", email: "ana@test.cl", rol: "jugador", rut: null, telefono: null, posicion: null, sede_id: "s-renaca" },
        }));
        vi.stubGlobal("fetch", fetchMock);
        render(<ProfileForm />);

        const select = await screen.findByLabelText("Sede");
        await waitFor(() => expect(select).toHaveValue("s-renaca"));
        expect(screen.getByRole("option", { name: "Kids" })).toBeInTheDocument();
        expect(screen.queryByRole("option", { name: "Cerrada" })).not.toBeInTheDocument();

        fireEvent.change(select, { target: { value: "s-kids" } });
        fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/ }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        const body = JSON.parse(fetchMock.mock.calls[1][1]!.body as string);
        expect(body.sede_id).toBe("s-kids");
    });
});
