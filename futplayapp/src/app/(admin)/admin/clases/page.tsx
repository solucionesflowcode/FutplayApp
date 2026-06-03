"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarCheck,
  Eye,
  Loader2,
  Search,
  X,
  Check,
  ChevronLeft,
  Clock,
  Users,
  PersonStanding,
} from "lucide-react";
import {
  getClases,
  getSedes,
  createClase,
  updateClase,
  deleteClase,
  getAsistenciaGeneral,
  getAsistenciaPorClase,
  registrarAsistencia,
  type ClaseConRelaciones,
  type Sede,
} from "@/data/clases";
import { getProfesoresDropdown, type ProfesorDropdown } from "@/data/profesores";

type ViewMode = "list" | "asistencia" | "asistencia-detalle";

type ModalMode = "create" | "edit" | null;

type ClaseForm = {
  id?: string;
  titulo: string;
  descripcion: string;
  sede_id: string;
  cupo_maximo: number;
  profesor_id: string;
  horarios: string[];
};

const emptyForm: ClaseForm = {
  titulo: "",
  descripcion: "",
  sede_id: "",
  cupo_maximo: 15,
  profesor_id: "",
  horarios: [],
};

export default function ClasesPage() {
  const [clases, setClases] = useState<ClaseConRelaciones[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [profesores, setProfesores] = useState<ProfesorDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<ClaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [asistenciaData, setAsistenciaData] = useState<any[]>([]);
  const [detalleClase, setDetalleClase] = useState<any>(null);

  const fetchClases = useCallback(async () => {
    const [c, s, p] = await Promise.all([getClases(), getSedes(), getProfesoresDropdown()]);
    setClases(c);
    setSedes(s);
    setProfesores(p);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClases(); }, [fetchClases]);

  const filtered = clases.filter(
    (c) =>
      c.titulo.toLowerCase().includes(search.toLowerCase()) ||
      c.sede_nombre.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setForm(emptyForm); setError(null); };

  const openCreate = () => {
    resetForm();
    setModal("create");
  };

  const openEdit = (c: ClaseConRelaciones) => {
    setForm({
      id: c.id,
      titulo: c.titulo,
      descripcion: c.descripcion,
      sede_id: c.sede_id,
      cupo_maximo: c.cupo_maximo,
      profesor_id: c.profesor_id || "",
      horarios: c.horarios.map((h) => h.fecha_hora.slice(0, 16)),
    });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.titulo || !form.sede_id) {
      setError("Título y sede son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      horarios: form.horarios.filter(Boolean),
    };

    const res = modal === "create"
      ? await createClase(payload)
      : await updateClase({ ...payload, id: payload.id! });

    if (!res.success) {
      setError(res.error || "Error al guardar");
      setSaving(false);
      return;
    }

    setSaving(false);
    setModal(null);
    resetForm();
    fetchClases();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta clase? También se eliminarán sus horarios e inscripciones.")) return;
    setLoading(true);
    await deleteClase(id);
    fetchClases();
  };

  const handleVerAsistencia = async () => {
    setLoading(true);
    const data = await getAsistenciaGeneral();
    setAsistenciaData(data);
    setView("asistencia");
    setLoading(false);
  };

  const handleAsistenciaClase = async (claseId: string) => {
    setLoading(true);
    const data = await getAsistenciaPorClase(claseId);
    setDetalleClase(data);
    setView("asistencia-detalle");
    setLoading(false);
  };

  const toggleAsistencia = async (usuarioId: string, asistencia: boolean) => {
    if (!detalleClase) return;
    await registrarAsistencia(detalleClase.clase.id, usuarioId, asistencia);
    const data = await getAsistenciaPorClase(detalleClase.clase.id);
    setDetalleClase(data);
  };

  const addHorario = () => {
    setForm((prev) => ({ ...prev, horarios: [...prev.horarios, ""] }));
  };

  const removeHorario = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      horarios: prev.horarios.filter((_, i) => i !== idx),
    }));
  };

  const setHorario = (idx: number, value: string) => {
    setForm((prev) => {
      const h = [...prev.horarios];
      h[idx] = value;
      return { ...prev, horarios: h };
    });
  };

  const formatFecha = (f: string) => {
    const d = new Date(f);
    return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatHora = (f: string) => {
    const d = new Date(f);
    return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading && clases.length === 0 && view === "list") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[#F28C28]" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6 w-full" style={{ maxWidth: "1216px" }}>

        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Gestión de Clases</h1>
            <p className="text-gray-500 text-sm mt-1">Administra horarios, sedes y cupos de clases</p>
          </div>
          <div className="flex gap-3">
            {view !== "list" && (
              <button
                onClick={() => { setView("list"); setDetalleClase(null); }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
                Volver
              </button>
            )}
            {view === "list" ? (
              <>
                <button
                  onClick={handleVerAsistencia}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  <CalendarCheck size={16} />
                  Ver Asistencia
                </button>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Nueva Clase
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* ─── VIEW: LIST ─── */}
        {view === "list" && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar clase o sede..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <span className="text-sm text-gray-500">{filtered.length} clase{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50/50">
                    <th className="p-3 font-semibold">Nombre</th>
                    <th className="p-3 font-semibold">Profesor</th>
                    <th className="p-3 font-semibold">Sede</th>
                    <th className="p-3 font-semibold">Cupo</th>
                    <th className="p-3 font-semibold">Inscritos</th>
                    <th className="p-3 font-semibold">Próximo Horario</th>
                    <th className="p-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        {search ? "No se encontraron clases" : "No hay clases creadas aún"}
                      </td>
                    </tr>
                  ) : filtered.map((c) => {
                    const prox = c.horarios?.find((h) => new Date(h.fecha_hora) > new Date());
                    return (
                      <tr key={c.id} className="border-b hover:bg-gray-50/50">
                        <td className="p-3">
                          <p className="font-semibold text-gray-900">{c.titulo}</p>
                          {c.descripcion && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{c.descripcion}</p>
                          )}
                        </td>
                        <td className="p-3">
                          {c.profesor_nombre ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">
                              <PersonStanding size={12} />
                              {c.profesor_nombre}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">{c.sede_nombre}</td>
                        <td className="p-3 text-gray-600">{c.cupo_maximo}</td>
                        <td className="p-3">
                          <span className={`font-semibold ${c.inscritos >= c.cupo_maximo ? "text-red-500" : "text-green-600"}`}>
                            {c.inscritos}
                          </span>
                          <span className="text-gray-400">/{c.cupo_maximo}</span>
                        </td>
                        <td className="p-3">
                          {prox ? (
                            <span className="text-xs text-gray-600">
                              {formatFecha(prox.fecha_hora)} {formatHora(prox.fecha_hora)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Sin horarios</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAsistenciaClase(c.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Ver asistencia"
                            >
                              <CalendarCheck size={16} />
                            </button>
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── VIEW: ASISTENCIA GENERAL ─── */}
        {view === "asistencia" && (
          <AsistenciaGeneral
            data={asistenciaData}
            onVerClase={(claseId) => handleAsistenciaClase(claseId)}
            onRefresh={async () => {
              const data = await getAsistenciaGeneral();
              setAsistenciaData(data);
            }}
          />
        )}

        {/* ─── VIEW: ASISTENCIA DETALLE ─── */}
        {view === "asistencia-detalle" && detalleClase && (
          <AsistenciaDetalle
            data={detalleClase}
            onToggle={toggleAsistencia}
          />
        )}

      </div>

      {/* ─── MODAL CREATE/EDIT ─── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {modal === "create" ? "Nueva Clase" : "Editar Clase"}
              </h2>
              <button onClick={() => { setModal(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ej: Entrenamiento Técnico"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                  rows={2}
                  placeholder="Descripción opcional"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Sede *</label>
                  <select
                    value={form.sede_id}
                    onChange={(e) => setForm((p) => ({ ...p, sede_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Seleccionar sede</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cupo Máximo</label>
                  <input
                    type="number"
                    value={form.cupo_maximo}
                    onChange={(e) => setForm((p) => ({ ...p, cupo_maximo: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    min={1}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Profesor</label>
                <select
                  value={form.profesor_id}
                  onChange={(e) => setForm((p) => ({ ...p, profesor_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="">Sin profesor asignado</option>
                  {profesores.map((pr) => (
                    <option key={pr.id} value={pr.id}>{pr.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-500">Horarios</label>
                  <button
                    onClick={addHorario}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    + Agregar horario
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {form.horarios.length === 0 && (
                    <p className="text-xs text-gray-400 py-2">Sin horarios agregados</p>
                  )}
                  {form.horarios.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={h}
                        onChange={(e) => setHorario(idx, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      />
                      <button
                        onClick={() => removeHorario(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => { setModal(null); resetForm(); }}
                disabled={saving}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {modal === "create" ? "Crear Clase" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ASISTENCIA GENERAL ─── */
function AsistenciaGeneral({
  data,
  onVerClase,
  onRefresh,
}: {
  data: any[];
  onVerClase: (claseId: string) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = data.filter(
    (item) =>
      item.usuario_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      item.clase_titulo?.toLowerCase().includes(search.toLowerCase())
  );

  const resumen = {
    total: data.length,
    presentes: data.filter((d) => d.asistencia === true).length,
    ausentes: data.filter((d) => d.asistencia === false).length,
    pendientes: data.filter((d) => d.asistencia === null).length,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900">Asistencia General</h2>
          <div className="flex gap-3 text-sm">
            <span className="text-green-600 font-semibold">{resumen.presentes} presentes</span>
            <span className="text-red-500 font-semibold">{resumen.ausentes} ausentes</span>
            <span className="text-gray-400 font-semibold">{resumen.pendientes} pendientes</span>
          </div>
        </div>
        <div className="relative max-w-xs w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar alumno o clase..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50/50">
              <th className="p-3 font-semibold">Alumno</th>
              <th className="p-3 font-semibold">Clase</th>
              <th className="p-3 font-semibold">Estado</th>
              <th className="p-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">Sin registros de asistencia</td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50/50">
                <td className="p-3 font-medium text-gray-900">{item.usuario_nombre}</td>
                <td className="p-3 text-gray-600">{item.clase_titulo}</td>
                <td className="p-3">
                  {item.asistencia === true ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      <Check size={12} /> Presente
                    </span>
                  ) : item.asistencia === false ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      <X size={12} /> Ausente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
                      Pendiente
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => onVerClase(item.clase_id)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                  >
                    Ver clase
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-gray-100 text-xs text-gray-500">
        Total: {resumen.total} registros
      </div>
    </div>
  );
}

/* ─── ASISTENCIA DETALLE ─── */
function AsistenciaDetalle({
  data,
  onToggle,
}: {
  data: any;
  onToggle: (usuarioId: string, asistencia: boolean) => void;
}) {
  const { clase, horarios, inscripciones } = data;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">{clase.titulo}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Cupo: {inscripciones.length}/{clase.cupo_maximo} · {horarios.length} horario{horarios.length !== 1 ? "s" : ""}
        </p>
      </div>

      {horarios.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-2">
          {horarios.map((h: any) => (
            <span key={h.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
              <Clock size={12} />
              {new Date(h.fecha_hora).toLocaleDateString("es-CL", {
                day: "2-digit", month: "short", year: "numeric",
              })}{" "}
              {new Date(h.fecha_hora).toLocaleTimeString("es-CL", {
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50/50">
              <th className="p-3 font-semibold">Alumno</th>
              <th className="p-3 font-semibold">Asistencia</th>
              <th className="p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inscripciones.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-400">No hay alumnos inscritos en esta clase</td></tr>
            ) : inscripciones.map((ins: any) => (
              <tr key={ins.id} className="border-b hover:bg-gray-50/50">
                <td className="p-3 font-medium text-gray-900">{ins.usuario_nombre}</td>
                <td className="p-3">
                  {ins.asistencia === true ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      <Check size={12} /> Presente
                    </span>
                  ) : ins.asistencia === false ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      <X size={12} /> Ausente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
                      Pendiente
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onToggle(ins.usuario_id, true)}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 font-semibold"
                    >
                      <Check size={14} className="inline" /> Presente
                    </button>
                    <button
                      onClick={() => onToggle(ins.usuario_id, false)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 font-semibold"
                    >
                      <X size={14} className="inline" /> Ausente
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-gray-100 flex items-center gap-4 text-sm">
        <Users size={16} className="text-gray-400" />
        <span className="text-gray-600">
          <strong className="text-green-600">{inscripciones.filter((i: any) => i.asistencia === true).length}</strong> presentes ·{" "}
          <strong className="text-red-500">{inscripciones.filter((i: any) => i.asistencia === false).length}</strong> ausentes ·{" "}
          <strong className="text-gray-400">{inscripciones.filter((i: any) => i.asistencia === null).length}</strong> pendientes
        </span>
      </div>
    </div>
  );
}
