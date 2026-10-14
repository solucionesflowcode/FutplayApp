// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { ToastProvider, useToast, useAdminMutation, fueExitoso, DURACION_AVISO_MS } from "@/components/admin/ui";

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

function Botones() {
    const toast = useToast();
    return (
        <>
            <button onClick={() => toast.exito("Plan guardado")}>exito</button>
            <button onClick={() => toast.error("No se pudo eliminar", "El plan tiene 32 membresías")}>error</button>
        </>
    );
}

describe("Toast (GEN-02)", () => {
    it("ADM-UI-TOAST-001: el aviso de éxito se cierra solo", () => {
        vi.useFakeTimers();
        render(<ToastProvider><Botones /></ToastProvider>);

        fireEvent.click(screen.getByText("exito"));
        expect(screen.getByRole("status")).toHaveTextContent("Plan guardado");

        act(() => { vi.advanceTimersByTime(DURACION_AVISO_MS + 10); });
        expect(screen.queryByText("Plan guardado")).toBeNull();
    });

    it("ADM-UI-TOAST-002: el error queda hasta cerrarlo y se anuncia como alerta", () => {
        vi.useFakeTimers();
        render(<ToastProvider><Botones /></ToastProvider>);

        fireEvent.click(screen.getByText("error"));
        act(() => { vi.advanceTimersByTime(DURACION_AVISO_MS * 5); });

        const alerta = screen.getByRole("alert");
        expect(alerta).toHaveTextContent("No se pudo eliminar");
        expect(alerta).toHaveTextContent("El plan tiene 32 membresías");

        fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("ADM-UI-TOAST-003: un aviso nuevo no reinicia el temporizador de los anteriores", () => {
        vi.useFakeTimers();
        render(<ToastProvider><Botones /></ToastProvider>);

        fireEvent.click(screen.getByText("exito"));
        act(() => { vi.advanceTimersByTime(DURACION_AVISO_MS - 500); });
        fireEvent.click(screen.getByText("error"));
        act(() => { vi.advanceTimersByTime(600); });

        expect(screen.queryByText("Plan guardado")).toBeNull();
    });

    it("ADM-UI-TOAST-004: usarlo fuera del layout del admin da un error claro", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Botones />)).toThrow("ToastProvider");
    });
});

// ── useAdminMutation ────────────────────────────────

function Accion({ accion, revertir }: { accion: () => Promise<unknown>; revertir?: () => void }) {
    const { ejecutar, pendiente } = useAdminMutation();
    return (
        <button disabled={pendiente} onClick={() => ejecutar(accion as never, { exito: "Listo", revertir })}>
            hacer
        </button>
    );
}

describe("useAdminMutation (CLA-04, PLA-02, MEM-02)", () => {
    it("ADM-UI-MUT-001: si sale bien, avisa éxito y no revierte", async () => {
        const revertir = vi.fn();
        render(<ToastProvider><Accion accion={async () => ({ ok: true })} revertir={revertir} /></ToastProvider>);

        await act(async () => { fireEvent.click(screen.getByText("hacer")); });

        expect(screen.getByRole("status")).toHaveTextContent("Listo");
        expect(revertir).not.toHaveBeenCalled();
    });

    it("ADM-UI-MUT-002: si la API falla, revierte el cambio optimista y muestra su motivo", async () => {
        const revertir = vi.fn();
        render(
            <ToastProvider>
                <Accion accion={async () => ({ success: false, error: "No se puede eliminar: el plan tiene 32 membresía(s)" })} revertir={revertir} />
            </ToastProvider>
        );

        await act(async () => { fireEvent.click(screen.getByText("hacer")); });

        expect(revertir).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("alert")).toHaveTextContent("32 membresía(s)");
    });

    it("ADM-UI-MUT-003: si no hay conexión (excepción), también revierte", async () => {
        const revertir = vi.fn();
        render(<ToastProvider><Accion accion={async () => { throw new Error("offline"); }} revertir={revertir} /></ToastProvider>);

        await act(async () => { fireEvent.click(screen.getByText("hacer")); });

        expect(revertir).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("alert")).toHaveTextContent("Error de conexión");
    });

    it("ADM-UI-MUT-004: entiende las dos formas de resultado de src/data ({ ok } y { success })", () => {
        expect(fueExitoso({ ok: true })).toBe(true);
        expect(fueExitoso({ ok: false, error: "x" })).toBe(false);
        expect(fueExitoso({ success: true })).toBe(true);
        expect(fueExitoso({ success: false })).toBe(false);
        expect(fueExitoso(undefined)).toBe(true);
    });
});
