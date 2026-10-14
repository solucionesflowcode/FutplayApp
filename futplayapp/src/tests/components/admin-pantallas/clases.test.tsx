// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

vi.mock("@/data/clases", () => ({
    getClases: vi.fn(),
    getSedes: vi.fn(),
    createClase: vi.fn(),
    updateClase: vi.fn(),
    deleteClase: vi.fn(),
    getAsistenciaPorClase: vi.fn(),
    registrarAsistencia: vi.fn(),
}));
vi.mock("@/data/profesores", () => ({ getProfesoresDropdown: vi.fn() }));

import { getClases, getSedes, updateClase, deleteClase, getAsistenciaPorClase, registrarAsistencia } from "@/data/clases";
import { getProfesoresDropdown } from "@/data/profesores";
import { ToastProvider } from "@/components/admin/ui";
import ClasesPage from "@/app/(admin)/admin/clases/page";

const DIA = 24 * 3600 * 1000;
const enDias = (d: number) => new Date(Date.now() + d * DIA).toISOString();
const base = { descripcion: "", sede_id: "s1", sede_nombre: "Cancha 1", profesor_id: null, profesor_nombre: "", tipo_evento: "entrenamiento" as const, created_at: "2026-01-01", presentes: 0, ausentes: 0 };
const CLASES = [
    { ...base, id: "pasada", titulo: "Fisico", fecha_hora: enDias(-2), cupo_maximo: 15, inscritos: 3, pendientes: 3 },
    { ...base, id: "manana", titulo: "Tecnico", fecha_hora: enDias(1), cupo_maximo: 15, inscritos: 6, pendientes: 6 },
    { ...base, id: "semana", titulo: "Tacticos", fecha_hora: enDias(5), cupo_maximo: 2, inscritos: 2, pendientes: 2 },
];

const tabla = () => screen.getByRole("table", { name: "Clases" });
const titulos = () => within(tabla()).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].querySelector("p")?.textContent);

function renderPagina() {
    return render(<ToastProvider><ClasesPage /></ToastProvider>);
}

beforeEach(() => {
    vi.mocked(getClases).mockResolvedValue(CLASES as never);
    vi.mocked(getSedes).mockResolvedValue([{ id: "s1", nombre: "Cancha 1" }]);
    vi.mocked(getProfesoresDropdown).mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("Gestión de clases (fase 3)", () => {
    it("ADM-CLA-001: por defecto muestra solo las próximas, de la más cercana a la más lejana (CLA-05)", async () => {
        renderPagina();
        await within(tabla()).findByText("Tecnico");

        expect(titulos()).toEqual(["Tecnico", "Tacticos"]);

        fireEvent.click(screen.getByRole("tab", { name: "Pasadas" }));
        expect(titulos()).toEqual(["Fisico"]);
    });

    it("ADM-CLA-002: 'por registrar' solo en clases ya ocurridas, sin parpadeo (CLA-06)", async () => {
        renderPagina();
        await within(tabla()).findByText("Tecnico");
        expect(within(tabla()).queryByText(/por registrar/)).toBeNull();

        fireEvent.click(screen.getByRole("tab", { name: "Pasadas" }));
        const aviso = within(tabla()).getByText("3 por registrar");
        expect(aviso.className).not.toContain("animate-pulse");
    });

    it("ADM-CLA-003: no deja bajar el cupo por debajo de los inscritos (CLA-08)", async () => {
        renderPagina();
        await within(tabla()).findByText("Tecnico");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Editar clase Tecnico" }));
        const dialogo = screen.getByRole("dialog", { name: "Editar clase" });
        fireEvent.change(within(dialogo).getByLabelText(/Cupo máximo/), { target: { value: "4" } });
        fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));

        expect(within(dialogo).getByRole("alert")).toHaveTextContent("6 alumnos ya inscritos");
        expect(updateClase).not.toHaveBeenCalled();
    });

    it("ADM-CLA-004: al cambiar la hora de una clase con inscritos avisa del recordatorio enviado (CLA-09)", async () => {
        renderPagina();
        await within(tabla()).findByText("Tecnico");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Editar clase Tecnico" }));
        const dialogo = screen.getByRole("dialog", { name: "Editar clase" });
        expect(within(dialogo).queryByRole("note")).toBeNull();
        fireEvent.change(within(dialogo).getByLabelText(/Hora/), { target: { value: "07:15" } });

        expect(within(dialogo).getByRole("note")).toHaveTextContent("6 alumnos inscritos");
    });

    it("ADM-CLA-005: eliminar explica que devuelve tokens y revierte si falla", async () => {
        vi.mocked(deleteClase).mockResolvedValue({ success: false, error: "Error de la BD" });
        renderPagina();
        await within(tabla()).findByText("Tecnico");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Eliminar clase Tecnico" }));
        const dialogo = screen.getByRole("dialog", { name: "Eliminar clase" });
        expect(dialogo).toHaveTextContent("se devuelve el token");
        fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Error de la BD");
        expect(titulos()).toContain("Tecnico");
    });

    it("ADM-CLA-006: la asistencia muestra lo marcado y revierte si falla al guardar (CLA-10)", async () => {
        vi.mocked(getAsistenciaPorClase).mockResolvedValue({
            clase: { id: "pasada", titulo: "Fisico", fecha_hora: enDias(-2), cupo_maximo: 15 },
            inscripciones: [
                { id: "i1", usuario_id: "u1", usuario_nombre: "Ana", asistencia: "confirmado_whatsapp" },
                { id: "i2", usuario_id: "u2", usuario_nombre: "Beto", asistencia: "pendiente" },
            ],
        });
        vi.mocked(registrarAsistencia).mockResolvedValue({ success: false, error: "Sin conexión con la BD" });
        renderPagina();
        await within(tabla()).findByText("Tecnico");
        fireEvent.click(screen.getByRole("tab", { name: "Pasadas" }));

        fireEvent.click(within(tabla()).getByText("Fisico"));
        const tablaAsistencia = await screen.findByRole("table", { name: "Asistencia" });
        // "Recordatorio enviado" ya no se confunde con "Sin confirmar".
        expect(within(tablaAsistencia).getByText("Recordatorio enviado")).toBeInTheDocument();

        const grupo = within(tablaAsistencia).getByRole("group", { name: "Asistencia de Ana" });
        fireEvent.click(within(grupo).getByRole("button", { name: /Presente/ }));

        expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo registrar la asistencia de Ana");
        expect(within(grupo).getByRole("button", { name: /Presente/ })).toHaveAttribute("aria-pressed", "false");
    });

    it("ADM-CLA-007: en una clase que no empezó no se puede marcar asistencia", async () => {
        vi.mocked(getAsistenciaPorClase).mockResolvedValue({
            clase: { id: "manana", titulo: "Tecnico", fecha_hora: enDias(1), cupo_maximo: 15 },
            inscripciones: [{ id: "i1", usuario_id: "u1", usuario_nombre: "Ana", asistencia: "sin_confirmar" }],
        });
        renderPagina();
        fireEvent.click(await within(tabla()).findByText("Tecnico"));

        const tablaAsistencia = await screen.findByRole("table", { name: "Asistencia" });
        expect(within(tablaAsistencia).queryByRole("button", { name: /Presente/ })).toBeNull();
        expect(within(tablaAsistencia).getByText("Se registra desde el inicio de la clase")).toBeInTheDocument();
    });
});
