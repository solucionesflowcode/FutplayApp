"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Check, X, ChevronLeft, PersonStanding, CalendarDays, Users } from "lucide-react";
import {
  getClases,
  getSedes,
  createClase,
  updateClase,
  deleteClase,
  getAsistenciaPorClase,
  registrarAsistencia,
  type ClaseConRelaciones,
  type Sede,
  type InscripcionRow,
  type AsistenciaDetalleClase,
} from "@/data/clases";
import { getProfesoresDropdown, type ProfesorDropdown } from "@/data/profesores";
import { claseEnFiltroFechas, errorFechaClase, fechaHoraChileAIso, fechaHoraChileDesdeIso, hoyChile } from "@/lib/fechas";
import {
  Button,
  CLASE_INPUT,
  ConfirmDialog,
  DataTable,
  FormField,
  Modal,
  NumberInput,
  PageHeader,
  StatusBadge,
  useAdminMutation,
  useToast,
  type Columna,
} from "@/components/admin/ui";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Pestana = "proximas" | "pasadas" | "todas";
const PESTANAS: { valor: Pestana; etiqueta: string }[] = [
  { valor: "proximas", etiqueta: "Próximas" },
  { valor: "pasadas", etiqueta: "Pasadas" },
  { valor: "todas", etiqueta: "Todas" },
];

type TipoEvento = "entrenamiento" | "partido" | "kids";

type ClaseForm = {
  id?: string;
  titulo: string;
  descripcion: string;
  sede_id: string;
  cupo_maximo: number | null;
  profesor_id: string;
  tipo_evento: TipoEvento;
  fecha: string;
  hora: string;
  // Al editar: si no cambian, no se exige que sean futuras (se puede corregir una clase pasada).
  fecha_original?: string;
  hora_original?: string;
  inscritos?: number;
};

const emptyForm: ClaseForm = {
  titulo: "",
  descripcion: "",
  sede_id: "",
  cupo_maximo: 15,
  profesor_id: "",
  tipo_evento: "entrenamiento",
  fecha: "",
  hora: "",
};

const NOMBRE_TIPO: Record<TipoEvento, string> = { entrenamiento: "Entrenamiento", partido: "Partido", kids: "Kids" };

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "America/Santiago" });
}
function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
}

const yaOcurrio = (c: { fecha_hora: string | null }, ahora: number) =>
  !!c.fecha_hora && new Date(c.fecha_hora).getTime() <= ahora;

export default function ClasesPage() {
  const toast = useToast();
  const { ejecutar } = useAdminMutation();
  const [clases, setClases] = useState<ClaseConRelaciones[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [profesores, setProfesores] = useState<ProfesorDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const reintentar = () => {
    setLoading(true);
    fetchClases();
  };
  const [search, setSearch] = useState("");
  const [pestana, setPestana] = useState<Pestana>("proximas");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [diasFiltro, setDiasFiltro] = useState<number[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<ClaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClaseConRelaciones | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [detalle, setDetalle] = useState<AsistenciaDetalleClase | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  // "Ahora" para separar próximas de pasadas: se toma al cargar (no en cada render).
  const [ahora, setAhora] = useState(() => Date.now());

  const fetchClases = useCallback(async () => {
    try {
      const [c, s, p] = await Promise.all([getClases(), getSedes(), getProfesoresDropdown()]);
      setClases(c);
      setSedes(s);
      setProfesores(p);
      setErrorCarga(null);
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : "No se pudieron cargar los datos");
    } finally {
      setAhora(Date.now());
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClases(); }, [fetchClases]);

  const q = search.toLowerCase();
  const filtered = clases.filter((c) => {
    const coincide = (c.titulo || "Partido").toLowerCase().includes(q) || c.sede_nombre.toLowerCase().includes(q) || c.profesor_nombre.toLowerCase().includes(q);
    if (!coincide) return false;
    // CLA-05: por defecto solo las próximas (antes se mezclaban con todo el historial).
    if (pestana === "proximas" && yaOcurrio(c, ahora)) return false;
    if (pestana === "pasadas" && !yaOcurrio(c, ahora)) return false;
    return claseEnFiltroFechas(c.fecha_hora, { desde: fechaDesde, hasta: fechaHasta, dias: diasFiltro });
  });
  const hayFiltrosFecha = !!fechaDesde || !!fechaHasta || diasFiltro.length > 0;

  const cerrarModal = () => {
    setModal(null);
    setForm(emptyForm);
    setErrorForm(null);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setErrorForm(null);
    setModal("create");
  };

  const openEdit = (c: ClaseConRelaciones) => {
    const chile = c.fecha_hora ? fechaHoraChileDesdeIso(c.fecha_hora) : null;
    setForm({
      id: c.id,
      titulo: c.titulo || "",
      descripcion: c.descripcion,
      sede_id: c.sede_id || "",
      cupo_maximo: c.cupo_maximo ?? 15,
      profesor_id: c.profesor_id || "",
      tipo_evento: c.tipo_evento,
      fecha: chile?.fecha || "",
      hora: chile?.hora || "",
      fecha_original: chile?.fecha || "",
      hora_original: chile?.hora || "",
      inscritos: c.inscritos,
    });
    setErrorForm(null);
    setModal("edit");
  };

  const handleSave = async () => {
    if (form.tipo_evento !== "partido" && (!form.titulo || !form.sede_id)) {
      setErrorForm("Tipo de entrenamiento y sede son obligatorios");
      return;
    }
    // Sin fecha y hora la clase queda "Sin horario": ni el bot ni el calendario la manejan.
    if (!form.fecha || !form.hora) {
      setErrorForm("Fecha y hora son obligatorias");
      return;
    }
    if (form.cupo_maximo === null || form.cupo_maximo < 1) {
      setErrorForm("El cupo debe ser al menos 1");
      return;
    }
    // CLA-08: un cupo menor a los inscritos deja la clase sobrevendida.
    if (modal === "edit" && (form.inscritos ?? 0) > form.cupo_maximo) {
      setErrorForm(`El cupo no puede ser menor a los ${form.inscritos} alumnos ya inscritos`);
      return;
    }
    const errorFecha = errorFechaClase(modal === "create", form);
    if (errorFecha) {
      setErrorForm(errorFecha);
      return;
    }

    const base: Parameters<typeof createClase>[0] = {
      tipo_evento: form.tipo_evento,
      descripcion: form.descripcion,
      cupo_maximo: form.cupo_maximo,
      fecha_hora: fechaHoraChileAIso(form.fecha, form.hora),
    };
    if (form.tipo_evento !== "partido") {
      base.titulo = form.titulo;
      base.sede_id = form.sede_id;
      base.profesor_id = form.profesor_id;
    } else if (form.sede_id) {
      base.sede_id = form.sede_id;
    }

    setSaving(true);
    setErrorForm(null);
    const res = modal === "create" ? await createClase(base) : await updateClase({ ...base, id: form.id! });
    setSaving(false);
    if (!res.success) {
      setErrorForm(res.error || "Error al guardar");
      return;
    }
    toast.exito(modal === "create" ? "Clase creada" : "Clase actualizada");
    cerrarModal();
    fetchClases();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const c = deleteTarget;
    const anterior = clases;
    setEliminando(true);
    setClases((prev) => prev.filter((x) => x.id !== c.id));
    await ejecutar(() => deleteClase(c.id), {
      exito: "Clase eliminada",
      error: "No se pudo eliminar la clase",
      revertir: () => setClases(anterior),
    });
    setEliminando(false);
    setDeleteTarget(null);
  };

  const abrirDetalle = async (c: ClaseConRelaciones) => {
    setCargandoDetalle(true);
    const data = await getAsistenciaPorClase(c.id);
    setCargandoDetalle(false);
    if (!data) {
      toast.error("No se pudo cargar la asistencia de la clase");
      return;
    }
    setAhora(Date.now());
    setDetalle(data);
  };

  const marcarAsistencia = async (ins: InscripcionRow, presente: boolean) => {
    if (!detalle) return;
    const anterior = detalle;
    const nueva = presente ? "asistio" : "no_asistio";
    setDetalle({ ...detalle, inscripciones: detalle.inscripciones.map((i) => (i.id === ins.id ? { ...i, asistencia: nueva } : i)) });
    // Antes no se revisaba el resultado: se marcaba en pantalla aunque fallara (CLA-10).
    await ejecutar(() => registrarAsistencia(detalle.clase.id, ins.usuario_id, presente), {
      error: `No se pudo registrar la asistencia de ${ins.usuario_nombre}`,
      revertir: () => setDetalle(anterior),
    });
  };

  const volverALista = () => {
    setDetalle(null);
    fetchClases(); // los conteos de asistencia cambiaron
  };

  const columnaAsistencia = (c: ClaseConRelaciones) => {
    // CLA-06: solo una clase ya ocurrida tiene asistencia por registrar (antes
    // todas las futuras mostraban "N Pendientes" parpadeando).
    if (!yaOcurrio(c, ahora)) return <span className="text-xs text-gray-500">—</span>;
    if (c.pendientes > 0) {
      return (
        <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold whitespace-nowrap">
          {c.pendientes} por registrar
        </span>
      );
    }
    return <span className="text-xs text-gray-600 whitespace-nowrap"><span className="text-green-600 font-semibold">{c.presentes} ✓</span> · <span className="text-red-500 font-semibold">{c.ausentes} ✗</span></span>;
  };

  const inscritosTexto = (c: ClaseConRelaciones) => (
    <span className={c.cupo_maximo != null && c.inscritos >= c.cupo_maximo ? "font-semibold text-red-600" : "text-gray-700"}>
      {c.inscritos}{c.cupo_maximo != null ? ` / ${c.cupo_maximo}` : ""}
    </span>
  );

  const acciones = (c: ClaseConRelaciones) => (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => openEdit(c)} className="p-1.5 text-marca hover:bg-blue-50 rounded-lg" title="Editar" aria-label={`Editar clase ${c.titulo || "Partido"}`}>
        <Pencil size={16} />
      </button>
      <button type="button" onClick={() => setDeleteTarget(c)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar" aria-label={`Eliminar clase ${c.titulo || "Partido"}`}>
        <Trash2 size={16} />
      </button>
    </div>
  );

  const columnas: Columna<ClaseConRelaciones>[] = [
    {
      id: "clase",
      encabezado: "Clase",
      celda: (c) => (
        <div className="min-w-0 max-w-[220px]">
          <p className="font-semibold text-gray-900 truncate">{c.titulo || "Partido"}</p>
          <p className="text-[11px] uppercase tracking-wide font-bold text-gray-500">{NOMBRE_TIPO[c.tipo_evento]}</p>
          {c.descripcion && <p className="text-xs text-gray-500 truncate">{c.descripcion}</p>}
        </div>
      ),
      valorOrden: (c) => c.titulo || "Partido",
    },
    {
      id: "fecha",
      encabezado: "Fecha",
      celda: (c) => (c.fecha_hora ? <div className="text-xs whitespace-nowrap"><span className="font-medium text-gray-700">{formatFecha(c.fecha_hora)}</span><br /><span className="text-gray-500">{formatHora(c.fecha_hora)}</span></div> : <span className="text-xs text-gray-500">Sin horario</span>),
      valorOrden: (c) => c.fecha_hora,
    },
    {
      id: "profesor",
      encabezado: "Profesor",
      celda: (c) => (c.profesor_nombre ? <span className="inline-flex items-center gap-1 text-sm"><PersonStanding size={14} className="text-acento" aria-hidden />{c.profesor_nombre}</span> : <span className="text-gray-500">—</span>),
      valorOrden: (c) => c.profesor_nombre,
    },
    { id: "sede", encabezado: "Sede", celda: (c) => c.sede_nombre || "—", valorOrden: (c) => c.sede_nombre },
    { id: "inscritos", encabezado: "Inscritos", celda: inscritosTexto, valorOrden: (c) => c.inscritos },
    { id: "asistencia", encabezado: "Asistencia", celda: columnaAsistencia },
    { id: "acciones", encabezado: "Acciones", celda: acciones },
  ];

  const fechaCambio = modal === "edit" && (form.fecha !== form.fecha_original || form.hora !== form.hora_original);

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        {detalle ? (
          <AsistenciaDetalle data={detalle} ahora={ahora} onVolver={volverALista} onMarcar={marcarAsistencia} />
        ) : (
          <>
            <PageHeader
              titulo="Gestión de clases"
              descripcion="Clases, cupos y asistencia. Haz clic en una clase para registrar la asistencia."
              acciones={<Button icono={<Plus size={16} />} onClick={openCreate}>Nueva clase</Button>}
            >
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Clases por fecha">
                {PESTANAS.map((p) => (
                  <button
                    key={p.valor}
                    type="button"
                    role="tab"
                    aria-selected={pestana === p.valor}
                    onClick={() => setPestana(p.valor)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${pestana === p.valor ? "bg-marca border-marca text-white" : "bg-white border-gray-200 text-gray-600 hover:border-marca"}`}
                  >
                    {p.etiqueta}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap sm:items-end gap-3">
                <div className="relative w-full sm:max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
                  <input type="search" aria-label="Buscar clase, sede o profesor" placeholder="Buscar clase, sede o profesor..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${CLASE_INPUT} pl-9 py-2`} />
                </div>
                <FormField label="Desde">
                  {(p) => <input {...p} type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className={`${CLASE_INPUT} py-2`} />}
                </FormField>
                <FormField label="Hasta">
                  {(p) => <input {...p} type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className={`${CLASE_INPUT} py-2`} />}
                </FormField>
                {hayFiltrosFecha && (
                  <Button variante="fantasma" onClick={() => { setFechaDesde(""); setFechaHasta(""); setDiasFiltro([]); }}>Limpiar filtros</Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por día de la semana">
                <CalendarDays size={14} className="text-gray-500" aria-hidden />
                {DIAS.map((nombre, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-pressed={diasFiltro.includes(idx)}
                    onClick={() => setDiasFiltro((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${diasFiltro.includes(idx) ? "bg-marca text-white border-marca" : "bg-white text-gray-500 border-gray-200 hover:border-marca"}`}
                  >
                    {nombre}
                  </button>
                ))}
              </div>
            </PageHeader>

            <DataTable
              // Remontar al cambiar de pestaña: próximas de la más cercana, pasadas de la más reciente.
              key={pestana}
              etiqueta="Clases"
              filas={filtered}
              columnas={columnas}
              getId={(c) => c.id}
              cargando={loading || cargandoDetalle}
              error={errorCarga}
              onReintentar={reintentar}
              resetKey={`${search}|${fechaDesde}|${fechaHasta}|${diasFiltro.join(",")}`}
              ordenInicial={{ columna: "fecha", asc: pestana === "proximas" }}
              onFilaClick={abrirDetalle}
              vacio={search || hayFiltrosFecha ? "No se encontraron clases con esos filtros" : pestana === "proximas" ? "No hay clases próximas" : "No hay clases"}
              tarjetaMovil={(c) => (
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.titulo || "Partido"}</p>
                      <p className="text-xs text-gray-500">{c.fecha_hora ? `${formatFecha(c.fecha_hora)} · ${formatHora(c.fecha_hora)}` : "Sin horario"}</p>
                    </div>
                    {columnaAsistencia(c)}
                  </div>
                  <p className="text-xs text-gray-500">{[c.profesor_nombre, c.sede_nombre].filter(Boolean).join(" · ")} · Inscritos {inscritosTexto(c)}</p>
                  {acciones(c)}
                </div>
              )}
            />
          </>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={cerrarModal}
        title={modal === "create" ? "Nueva clase" : "Editar clase"}
        bloquearCierre={saving}
        footer={
          <>
            <Button variante="secundario" onClick={cerrarModal} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} cargando={saving} textoCargando="Guardando...">{modal === "create" ? "Crear clase" : "Guardar cambios"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Tipo" required>
            {(p) => (
              <select {...p} value={form.tipo_evento} onChange={(e) => setForm((f) => ({ ...f, tipo_evento: e.target.value as TipoEvento }))} className={CLASE_INPUT}>
                <option value="entrenamiento">Entrenamiento</option>
                <option value="partido">Partido</option>
                <option value="kids">Kids</option>
              </select>
            )}
          </FormField>

          {form.tipo_evento !== "partido" && (
            <>
              <FormField label="Tipo de entrenamiento" required>
                {(p) => (
                  <select {...p} value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className={CLASE_INPUT}>
                    <option value="">Seleccionar</option>
                    <option value="Tecnico">Técnico</option>
                    <option value="Tacticos">Tácticos</option>
                    <option value="Fisico">Físico</option>
                  </select>
                )}
              </FormField>
              <FormField label="Profesor">
                {(p) => (
                  <select {...p} value={form.profesor_id} onChange={(e) => setForm((f) => ({ ...f, profesor_id: e.target.value }))} className={CLASE_INPUT}>
                    <option value="">Sin profesor asignado</option>
                    {profesores.map((pr) => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
                  </select>
                )}
              </FormField>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sede" required={form.tipo_evento !== "partido"}>
              {(p) => (
                <select {...p} value={form.sede_id} onChange={(e) => setForm((f) => ({ ...f, sede_id: e.target.value }))} className={CLASE_INPUT}>
                  <option value="">{form.tipo_evento === "partido" ? "Sin sede" : "Seleccionar sede"}</option>
                  {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
            </FormField>
            <FormField label="Cupo máximo" required ayuda={modal === "edit" && form.inscritos ? `${form.inscritos} inscritos` : undefined}>
              {(p) => <NumberInput {...p} value={form.cupo_maximo} onChange={(n) => setForm((f) => ({ ...f, cupo_maximo: n }))} />}
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fecha" required>
              {/* Día de hoy en Chile: el día UTC ya es "mañana" después de las 21:00. */}
              {(p) => <input {...p} type="date" min={modal === "create" ? hoyChile() : undefined} value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} className={CLASE_INPUT} />}
            </FormField>
            <FormField label="Hora" required>
              {(p) => <input {...p} type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} className={CLASE_INPUT} />}
            </FormField>
          </div>
          {/* CLA-09: el bot ya pudo mandarles el recordatorio con la hora anterior. */}
          {fechaCambio && (form.inscritos ?? 0) > 0 && (
            <p role="note" className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              La clase tiene {form.inscritos} alumno{form.inscritos !== 1 ? "s" : ""} inscrito{form.inscritos !== 1 ? "s" : ""}. Si ya recibieron el recordatorio por WhatsApp, tenía la hora anterior: avísales del cambio.
            </p>
          )}

          <FormField label="Descripción">
            {(p) => <textarea {...p} rows={2} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder={form.tipo_evento === "partido" ? "Ej: Partido amistoso vs..." : "Opcional"} className={CLASE_INPUT} />}
          </FormField>

          {errorForm && <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{errorForm}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar clase"
        message={<>¿Eliminar <strong>{deleteTarget?.titulo || "Partido"}</strong>{deleteTarget?.fecha_hora ? ` del ${formatFecha(deleteTarget.fecha_hora)} a las ${formatHora(deleteTarget.fecha_hora)}` : ""}?</>}
        consecuencias={[
          `Se borran sus ${deleteTarget?.inscritos ?? 0} inscripciones.`,
          "Si la clase aún no ocurre, se devuelve el token a cada alumno inscrito (los partidos no descuentan token).",
        ]}
        confirmLabel="Eliminar"
        textoCargando="Eliminando..."
        cargando={eliminando}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ─── Asistencia de una clase ─── */

const CANCELADAS = new Set(["cancelado", "cancelado_sin_reembolso"]);

function AsistenciaDetalle({
  data,
  ahora,
  onVolver,
  onMarcar,
}: {
  data: AsistenciaDetalleClase;
  ahora: number;
  onVolver: () => void;
  onMarcar: (ins: InscripcionRow, presente: boolean) => void;
}) {
  const { clase, inscripciones } = data;
  // CLA-10: la asistencia se registra desde que empieza la clase, no antes.
  const empezo = yaOcurrio(clase, ahora);
  const cuenta = (pred: (i: InscripcionRow) => boolean) => inscripciones.filter(pred).length;
  const canceladas = cuenta((i) => CANCELADAS.has(i.asistencia ?? ""));
  const activas = inscripciones.length - canceladas;

  const botones = (ins: InscripcionRow) => {
    if (CANCELADAS.has(ins.asistencia ?? "")) return <span className="text-xs text-gray-500">Canceló: no se registra asistencia</span>;
    if (!empezo) return <span className="text-xs text-gray-500">Se registra desde el inicio de la clase</span>;
    const presente = ins.asistencia === "asistio";
    const ausente = ins.asistencia === "no_asistio";
    return (
      <div className="flex gap-2" role="group" aria-label={`Asistencia de ${ins.usuario_nombre}`}>
        <button
          type="button"
          aria-pressed={presente}
          onClick={() => onMarcar(ins, true)}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${presente ? "bg-green-600 border-green-600 text-white" : "border-green-300 text-green-700 hover:bg-green-50"}`}
        >
          <Check size={14} aria-hidden /> Presente
        </button>
        <button
          type="button"
          aria-pressed={ausente}
          onClick={() => onMarcar(ins, false)}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${ausente ? "bg-red-600 border-red-600 text-white" : "border-red-300 text-red-700 hover:bg-red-50"}`}
        >
          <X size={14} aria-hidden /> Ausente
        </button>
      </div>
    );
  };

  const columnas: Columna<InscripcionRow>[] = [
    { id: "alumno", encabezado: "Alumno", celda: (i) => <span className="font-medium text-gray-900">{i.usuario_nombre}</span>, valorOrden: (i) => i.usuario_nombre },
    // StatusBadge distingue "Sin confirmar" de "Recordatorio enviado" (antes ambos decían "Pendiente").
    { id: "estado", encabezado: "Estado", celda: (i) => <StatusBadge estado={i.asistencia ?? "sin_confirmar"} />, valorOrden: (i) => i.asistencia },
    { id: "acciones", encabezado: "Asistencia", celda: botones },
  ];

  return (
    <>
      <PageHeader
        titulo={clase.titulo || "Partido"}
        descripcion={
          <>
            {clase.fecha_hora ? `${formatFecha(clase.fecha_hora)} · ${formatHora(clase.fecha_hora)}` : "Sin horario"}
            {" · "}
            {clase.cupo_maximo != null ? `Cupo ${activas}/${clase.cupo_maximo}` : `${activas} inscritos`}
          </>
        }
        acciones={<Button variante="secundario" icono={<ChevronLeft size={16} />} onClick={onVolver}>Volver a clases</Button>}
      />
      <DataTable
        etiqueta="Asistencia"
        filas={inscripciones}
        columnas={columnas}
        getId={(i) => i.id}
        vacio="No hay alumnos inscritos en esta clase"
        tarjetaMovil={(i) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-gray-900 text-sm">{i.usuario_nombre}</p>
              <StatusBadge estado={i.asistencia ?? "sin_confirmar"} />
            </div>
            {botones(i)}
          </div>
        )}
      />
      <p className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-3">
        <Users size={16} className="text-gray-500" aria-hidden />
        <span><strong className="text-green-600">{cuenta((i) => i.asistencia === "asistio")}</strong> presentes</span> ·
        <span><strong className="text-red-500">{cuenta((i) => i.asistencia === "no_asistio")}</strong> ausentes</span> ·
        <span><strong className="text-emerald-600">{cuenta((i) => i.asistencia === "confirmado_whatsapp")}</strong> confirmados</span> ·
        <span><strong className="text-gray-500">{canceladas}</strong> canceladas</span>
      </p>
    </>
  );
}
