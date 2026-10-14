// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { Modal, ConfirmDialog } from "@/components/admin/ui";

afterEach(() => cleanup());

function ConAbridor({ bloquearCierre = false, cerrarConFondo = false }: { bloquearCierre?: boolean; cerrarConFondo?: boolean }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)}>Abrir</button>
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Editar plan"
                description="Cambia el precio"
                bloquearCierre={bloquearCierre}
                cerrarConFondo={cerrarConFondo}
                footer={<button>Guardar</button>}
            >
                <input aria-label="Nombre" />
            </Modal>
        </>
    );
}

describe("Modal (GEN-01)", () => {
    it("ADM-UI-MOD-001: es un diálogo accesible con título y descripción asociados", () => {
        render(<ConAbridor />);
        fireEvent.click(screen.getByText("Abrir"));

        const dialogo = screen.getByRole("dialog", { name: "Editar plan" });
        expect(dialogo).toHaveAttribute("aria-modal", "true");
        expect(dialogo).toHaveAccessibleDescription("Cambia el precio");
    });

    it("ADM-UI-MOD-002: el foco va al primer campo (no a la X) y vuelve al botón que lo abrió al cerrar", () => {
        render(<ConAbridor />);
        const abrir = screen.getByText("Abrir");
        abrir.focus();
        fireEvent.click(abrir);

        expect(screen.getByLabelText("Nombre")).toHaveFocus();

        fireEvent.keyDown(document, { key: "Escape" });
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(abrir).toHaveFocus();
    });

    it("ADM-UI-MOD-003: Escape no cierra mientras guarda (bloquearCierre)", () => {
        render(<ConAbridor bloquearCierre />);
        fireEvent.click(screen.getByText("Abrir"));

        fireEvent.keyDown(document, { key: "Escape" });

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cerrar" })).toBeDisabled();
    });

    it("ADM-UI-MOD-004: Tab no sale del modal (vuelve al principio desde el último botón)", () => {
        render(<ConAbridor />);
        fireEvent.click(screen.getByText("Abrir"));
        const guardar = screen.getByText("Guardar");
        guardar.focus();

        fireEvent.keyDown(document, { key: "Tab" });

        expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
    });

    it("ADM-UI-MOD-005: el clic en el fondo no cierra un formulario, salvo que se pida", () => {
        const { unmount } = render(<ConAbridor />);
        fireEvent.click(screen.getByText("Abrir"));
        fireEvent.mouseDown(screen.getByTestId("modal-fondo"));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        unmount();

        render(<ConAbridor cerrarConFondo />);
        fireEvent.click(screen.getByText("Abrir"));
        fireEvent.mouseDown(screen.getByTestId("modal-fondo"));
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("ADM-UI-MOD-006: bloquea el scroll de la página mientras está abierto", () => {
        render(<ConAbridor />);
        fireEvent.click(screen.getByText("Abrir"));
        expect(document.body.style.overflow).toBe("hidden");

        fireEvent.keyDown(document, { key: "Escape" });
        expect(document.body.style.overflow).toBe("");
    });
});

describe("ConfirmDialog v2", () => {
    it("ADM-UI-CONF-001: el botón dice lo que hace y muestra las consecuencias", () => {
        const onConfirm = vi.fn();
        render(
            <ConfirmDialog
                open
                title="Congelar membresía"
                message="El tiempo dejará de correr."
                confirmLabel="Congelar"
                variante="advertencia"
                consecuencias={["Se cancelan 2 reservas futuras", "Se devuelven sus tokens"]}
                onConfirm={onConfirm}
                onCancel={vi.fn()}
            />
        );

        expect(screen.queryByText("Eliminar")).toBeNull();
        expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
            "Se cancelan 2 reservas futuras",
            "Se devuelven sus tokens",
        ]);
        fireEvent.click(screen.getByRole("button", { name: "Congelar" }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("ADM-UI-CONF-002: mientras carga, deshabilita ambos botones (sin doble clic)", () => {
        render(
            <ConfirmDialog open title="Eliminar plan" message="¿Seguro?" confirmLabel="Eliminar" cargando textoCargando="Eliminando..." onConfirm={vi.fn()} onCancel={vi.fn()} />
        );

        expect(screen.getByRole("button", { name: /Eliminando/ })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    });
});
