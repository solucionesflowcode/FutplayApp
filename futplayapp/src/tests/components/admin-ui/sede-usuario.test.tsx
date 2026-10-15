// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import EditStudentModal from "@/components/admin/EditStudentModal";
import { ToastProvider } from "@/components/admin/ui";

const SEDES = [
    { id: "s1", nombre: "Las Condes", activa: true },
    { id: "s2", nombre: "Vieja", activa: false },
];
const ALUMNO = { id: "u1", name: "Ana", role: "Alumno", email: "ana@test.cl", plan: "", tokens: 0, status: "Activo", sedeId: null };

// Body JSON del primer fetch.
const cuerpo = (fetchMock: ReturnType<typeof vi.fn>) => JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("Sede principal del usuario", () => {
    it("ADM-SEDE-UI-001: se elige en Editar usuario y viaja como sede_id; las inactivas no se ofrecen", async () => {
        const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
        vi.stubGlobal("fetch", fetchMock);
        render(<ToastProvider><EditStudentModal student={ALUMNO} sedes={SEDES} open onClose={() => {}} onSaved={() => {}} /></ToastProvider>);

        const select = screen.getByLabelText(/Sede principal/);
        expect(select).toHaveValue("");
        expect(screen.queryByRole("option", { name: /Vieja/ })).toBeNull();
        fireEvent.change(select, { target: { value: "s1" } });
        fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(cuerpo(fetchMock).sede_id).toBe("s1");
    });

    it("ADM-SEDE-UI-002: 'Sin asignar' envía null", async () => {
        const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
        vi.stubGlobal("fetch", fetchMock);
        render(<ToastProvider><EditStudentModal student={{ ...ALUMNO, sedeId: "s1" }} sedes={SEDES} open onClose={() => {}} onSaved={() => {}} /></ToastProvider>);

        fireEvent.change(screen.getByLabelText(/Sede principal/), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(cuerpo(fetchMock).sede_id).toBeNull();
    });
});
