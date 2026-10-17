// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

vi.mock("@/context", () => ({ useAuthUser: () => ({ usuario: { id: "u1" } }) }));
vi.mock("@/data/membresia", () => ({ getMembresiaByUser: vi.fn(() => Promise.resolve({ tokens_restantes: 3 })) }));
vi.mock("@/data/fichaMedica", () => ({ userHasFichaMedica: vi.fn() }));
vi.mock("@/lib/fechas", () => ({ esSemanaActual: () => true }));
// El formulario real de la ficha no es parte de esta prueba.
vi.mock("@/components/checkout/FichaMedicaModal", () => ({
    default: ({ open, onSuccess }: { open: boolean; onSuccess: () => void }) =>
        open ? <button onClick={onSuccess}>Guardar ficha (mock)</button> : null,
}));

import { userHasFichaMedica } from "@/data/fichaMedica";
import ReservarClaseModal from "@/components/misclases/ReservarClaseModal";

const CLASE = { claseId: "c1", titulo: "Tecnico", descripcion: null, fecha_hora: "2026-10-17T21:00:00Z", sede: "Las Condes", tipo_evento: "entrenamiento" as const, cupo_maximo: 15, inscritos: 2 };

function renderModal() {
    return render(<ReservarClaseModal isOpen onClose={() => {}} clases={[CLASE]} onAgendada={() => {}} />);
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});

describe("Reservar clase: ficha médica obligatoria", () => {
    it("RES-FICHA-001: sin ficha, avisa, no deja agendar y ofrece completarla; al guardarla se puede agendar", async () => {
        vi.mocked(userHasFichaMedica).mockResolvedValue(false);
        renderModal();

        expect(await screen.findByRole("alert")).toHaveTextContent("Necesitas tu ficha médica para reservar");
        expect(screen.getByRole("button", { name: /Agendar clase/ })).toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Completar ficha médica" }));
        fireEvent.click(screen.getByRole("button", { name: "Guardar ficha (mock)" }));

        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.getByRole("button", { name: /Agendar clase/ })).toBeEnabled();
    });

    it("RES-FICHA-002: si la API responde FICHA_REQUERIDA, muestra el aviso en vez de un error genérico", async () => {
        vi.mocked(userHasFichaMedica).mockResolvedValue(true);
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: false,
            json: async () => ({ error: "Completa tu ficha médica antes de reservar una clase", codigo: "FICHA_REQUERIDA" }),
        })));
        renderModal();

        await waitFor(() => expect(screen.getByRole("button", { name: /Agendar clase/ })).toBeEnabled());
        fireEvent.click(screen.getByRole("button", { name: /Agendar clase/ }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Necesitas tu ficha médica para reservar");
    });
});
