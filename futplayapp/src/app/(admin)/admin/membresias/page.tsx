"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Snowflake, Play } from "lucide-react";
import {
  getMembresiasGestion,
  createMembresiaGestion,
  updateMembresiaGestion,
  deleteMembresiaGestion,
  congelarMembresia,
  reactivarMembresia,
  type MembresiaGestion,
} from "@/data/membresia";
import { getUsers, getPlanesAdmin, type Plan } from "@/data/plans";
import type { Student } from "@/components/admin/StudentsTable";
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

type ModalMode = "create" | "edit" | null;

type MembresiaForm = {
  id?: string;
  usuario_id: string;
  plan_id: string;
  boleta_id: string | null;
  tokens_totales: number | null;
  tokens_usados: number | null;
  fecha_inicio: string;
  fecha_vencimiento: string;
  // ISO completos al abrir la edición: si el día no cambia, se reenvían tal cual.
  fecha_inicio_original?: string;
  fecha_vencimiento_original?: string;
  estado: boolean;
  estado_original?: boolean;
};

const emptyForm: MembresiaForm = {
  usuario_id: "",
  plan_id: "",
  boleta_id: null,
  tokens_totales: null,
  tokens_usados: 0,
  fecha_inicio: "",
  fecha_vencimiento: "",
  estado: true,
};

function isoToDate(iso: string): string {
  return iso ? iso.slice(0, 10) : "";
}

function dateToIso(date: string): string {
  return date ? new Date(date + "T00:00:00").toISOString() : "";
}

function formatFecha(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Santiago" });
}

type EstadoMembresia = "activa" | "inactiva" | "sin_tokens" | "congelada";

// Mismo orden de prioridad que la etiqueta: el filtro y el badge coinciden.
function estadoDe(m: MembresiaGestion): EstadoMembresia {
  if (m.congelada) return "congelada";
  if (m.sin_tokens) return "sin_tokens";
  return m.estado ? "activa" : "inactiva";
}

const AYUDA_SIN_TOKENS =
  "Se cerró al agotarse los tokens. El alumno puede comprar el plan siguiente. Si cancela a tiempo, el token devuelto la reactiva sola (o va a su membresía nueva, si ya compró otra).";

const FILTROS_ESTADO: { valor: EstadoMembresia | "todas"; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "activa", etiqueta: "Activas" },
  { valor: "inactiva", etiqueta: "Inactivas" },
  { valor: "sin_tokens", etiqueta: "Sin tokens" },
  { valor: "congelada", etiqueta: "Congeladas" },
];

// "2 usados · 2 disponibles" (antes "2/4": no se sabía si eran usados o restantes).
function textoTokens(m: Pick<MembresiaGestion, "tokens_usados" | "tokens_totales">): string {
  const disponibles = Math.max(0, m.tokens_totales - m.tokens_usados);
  return `${m.tokens_usados} usados · ${disponibles} disponible${disponibles !== 1 ? "s" : ""}`;
}

export default function MembresiasPage() {
  const toast = useToast();
  const { ejecutar } = useAdminMutation();
  const [membresias, setMembresias] = useState<MembresiaGestion[]>([]);
  const [usuarios, setUsuarios] = useState<Student[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoMembresia | "todas">("todas");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<MembresiaForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MembresiaGestion | null>(null);
  const [freezeAction, setFreezeAction] = useState<{ m: MembresiaGestion; action: "congelar" | "reactivar" } | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState(false);

  const fetchData = useCallback(async () => {
    const [m, u, planesResult] = await Promise.all([
      getMembresiasGestion(),
      getUsers(),
      getPlanesAdmin(),
    ]);
    setMembresias(m);
    // Solo alumnos: antes también aparecían los profesores (MEM-05).
    setUsuarios(u.filter((user) => user.role === "Alumno"));
    setPlanes(planesResult.planes);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const q = search.toLowerCase();
  const porBusqueda = membresias.filter((m) =>
    m.usuario_nombre.toLowerCase().includes(q) || m.plan_nombre.toLowerCase().includes(q)
  );
  const filtered = filtroEstado === "todas"
    ? porBusqueda
    : porBusqueda.filter((m) => estadoDe(m) === filtroEstado);
  // Conteo por estado sobre la búsqueda actual (cada botón muestra cuántas hay).
  const conteoEstado = (valor: EstadoMembresia | "todas") =>
    valor === "todas" ? porBusqueda.length : porBusqueda.filter((m) => estadoDe(m) === valor).length;

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

  const openEdit = (m: MembresiaGestion) => {
    setForm({
      id: m.id,
      usuario_id: m.usuario_id,
      plan_id: m.plan_id,
      boleta_id: m.boleta_id ?? null,
      tokens_totales: m.tokens_totales,
      tokens_usados: m.tokens_usados,
      fecha_inicio: isoToDate(m.fecha_inicio),
      fecha_vencimiento: isoToDate(m.fecha_vencimiento),
      fecha_inicio_original: m.fecha_inicio,
      fecha_vencimiento_original: m.fecha_vencimiento,
      estado: m.estado,
      estado_original: m.estado,
    });
    setErrorForm(null);
    setModal("edit");
  };

  const handleSave = async () => {
    const totales = form.tokens_totales;
    const usados = form.tokens_usados ?? 0;
    if (!form.usuario_id || !form.plan_id) {
      setErrorForm("Alumno y plan son obligatorios");
      return;
    }
    if (totales === null || totales < 0) {
      setErrorForm("Indica los tokens totales (0 o más)");
      return;
    }
    if (modal === "edit") {
      if (!form.fecha_inicio || !form.fecha_vencimiento) {
        setErrorForm("Fecha de inicio y vencimiento son obligatorias");
        return;
      }
      if (form.fecha_vencimiento < form.fecha_inicio) {
        setErrorForm("La fecha de vencimiento no puede ser anterior a la de inicio");
        return;
      }
      if (usados < 0 || usados > totales) {
        setErrorForm("Los tokens usados deben estar entre 0 y los tokens totales");
        return;
      }
    }
    setSaving(true);
    setErrorForm(null);

    const isCreate = modal === "create";
    const planSel = planes.find((pl) => pl.id === form.plan_id);
    const diasVigencia = planSel?.dias_vigencia ?? planSel?.dias ?? 30;
    // Si el admin no cambió la fecha, se reenvía la original: dateToIso la
    // dejaba a medianoche y una membresía que vencía a las 05:15 perdía horas.
    const fechaEditada = (dia: string, original?: string) =>
      original && isoToDate(original) === dia ? original : dateToIso(dia);

    // La boleta no se edita (MEM-06): la crea el pago. Al crear a mano queda sin boleta.
    const res = isCreate
      ? await createMembresiaGestion({
          usuario_id: form.usuario_id,
          plan_id: form.plan_id,
          boleta_id: null,
          tokens_totales: totales,
          dias: diasVigencia,
        })
      : await updateMembresiaGestion(form.id!, {
          usuario_id: form.usuario_id,
          plan_id: form.plan_id,
          tokens_totales: totales,
          tokens_usados: usados,
          fecha_inicio: fechaEditada(form.fecha_inicio, form.fecha_inicio_original),
          fecha_vencimiento: fechaEditada(form.fecha_vencimiento, form.fecha_vencimiento_original),
          estado: form.estado,
        });

    setSaving(false);
    if (!res.ok) {
      // En el modal, junto al formulario (p. ej. "El alumno ya tiene una membresía vigente").
      setErrorForm(res.error);
      return;
    }
    toast.exito(isCreate ? "Membresía creada" : "Membresía actualizada");
    cerrarModal();
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const m = deleteTarget;
    const anterior = membresias;
    setAccionEnCurso(true);
    setMembresias((prev) => prev.filter((x) => x.id !== m.id));
    await ejecutar(() => deleteMembresiaGestion(m.id), {
      exito: `Membresía de ${m.usuario_nombre} eliminada`,
      error: "No se pudo eliminar la membresía",
      revertir: () => setMembresias(anterior),
    });
    setAccionEnCurso(false);
    setDeleteTarget(null);
  };

  const handleFreezeAction = async () => {
    if (!freezeAction) return;
    const { m, action } = freezeAction;
    setAccionEnCurso(true);
    const result = action === "congelar" ? await congelarMembresia(m.id) : await reactivarMembresia(m.id);
    setAccionEnCurso(false);
    setFreezeAction(null);
    if (!result.ok) {
      toast.error(action === "congelar" ? "No se pudo congelar" : "No se pudo reactivar", result.error);
      return;
    }
    if (action === "congelar") {
      const canceladas = result.reservasCanceladas ?? 0;
      toast.exito(
        `Membresía de ${m.usuario_nombre} congelada.` +
          (canceladas > 0 ? ` Se cancelaron ${canceladas} reserva${canceladas !== 1 ? "s" : ""} y se devolvieron sus tokens.` : "")
      );
    } else {
      toast.exito(`Membresía de ${m.usuario_nombre} reactivada. Nuevo vencimiento: ${formatFecha(result.fecha_vencimiento ?? "")}`);
    }
    fetchData();
  };

  const acciones = (m: MembresiaGestion, tamano: number) => (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {!m.congelada && m.estado && (
        <button type="button" onClick={() => setFreezeAction({ m, action: "congelar" })} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg" title="Congelar" aria-label={`Congelar membresía de ${m.usuario_nombre}`}>
          <Snowflake size={tamano} />
        </button>
      )}
      {m.congelada && (
        <button type="button" onClick={() => setFreezeAction({ m, action: "reactivar" })} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Reactivar" aria-label={`Reactivar membresía de ${m.usuario_nombre}`}>
          <Play size={tamano} />
        </button>
      )}
      <button type="button" onClick={() => openEdit(m)} className="p-1.5 text-marca hover:bg-blue-50 rounded-lg" title="Editar" aria-label={`Editar membresía de ${m.usuario_nombre}`}>
        <Pencil size={tamano} />
      </button>
      <button type="button" onClick={() => setDeleteTarget(m)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar" aria-label={`Eliminar membresía de ${m.usuario_nombre}`}>
        <Trash2 size={tamano} />
      </button>
    </div>
  );

  const badge = (m: MembresiaGestion) => (
    <StatusBadge estado={estadoDe(m)} title={m.sin_tokens && !m.congelada ? AYUDA_SIN_TOKENS : undefined} />
  );

  const columnas: Columna<MembresiaGestion>[] = [
    { id: "alumno", encabezado: "Alumno", celda: (m) => <span className="font-semibold text-gray-900">{m.usuario_nombre}</span>, valorOrden: (m) => m.usuario_nombre },
    { id: "plan", encabezado: "Plan", celda: (m) => m.plan_nombre, valorOrden: (m) => m.plan_nombre },
    { id: "tokens", encabezado: "Tokens", celda: (m) => <span className="whitespace-nowrap">{textoTokens(m)}</span>, valorOrden: (m) => m.tokens_totales - m.tokens_usados },
    { id: "inicio", encabezado: "Inicio", celda: (m) => formatFecha(m.fecha_inicio), valorOrden: (m) => m.fecha_inicio, className: "whitespace-nowrap" },
    { id: "vence", encabezado: "Vencimiento", celda: (m) => formatFecha(m.fecha_vencimiento), valorOrden: (m) => m.fecha_vencimiento, className: "whitespace-nowrap" },
    { id: "estado", encabezado: "Estado", celda: badge, valorOrden: (m) => estadoDe(m) },
    { id: "acciones", encabezado: "Acciones", celda: (m) => acciones(m, 16) },
  ];

  // Al editar una membresía de alguien que ya no figura como alumno, se mantiene en la lista.
  const opcionesUsuario = form.usuario_id && !usuarios.some((u) => u.id === form.usuario_id)
    ? [...usuarios, { id: form.usuario_id, name: membresias.find((m) => m.usuario_id === form.usuario_id)?.usuario_nombre ?? "Usuario actual" } as Student]
    : usuarios;
  const planSeleccionado = planes.find((pl) => pl.id === form.plan_id);
  const pasaAInactiva = modal === "edit" && form.estado_original === true && form.estado === false;

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        <PageHeader
          titulo="Gestión de membresías"
          descripcion="Planes de los alumnos: tokens, vigencia y congelamientos"
          acciones={<Button icono={<Plus size={16} />} onClick={openCreate}>Nueva membresía</Button>}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                aria-label="Buscar por alumno o plan"
                placeholder="Buscar por alumno o plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${CLASE_INPUT} pl-9 py-2`}
              />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
              {FILTROS_ESTADO.map(({ valor, etiqueta }) => {
                const activo = filtroEstado === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setFiltroEstado(valor)}
                    aria-pressed={activo}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      activo ? "bg-marca border-marca text-white" : "bg-white border-gray-200 text-gray-600 hover:border-marca"
                    }`}
                  >
                    {etiqueta} <span className={activo ? "text-white/70" : "text-gray-400"}>{conteoEstado(valor)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </PageHeader>

        <DataTable
          etiqueta="Membresías"
          filas={filtered}
          columnas={columnas}
          getId={(m) => m.id}
          cargando={loading}
          resetKey={`${search}|${filtroEstado}`}
          vacio={search || filtroEstado !== "todas" ? "No se encontraron membresías" : "No hay membresías creadas aún"}
          tarjetaMovil={(m) => (
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900 text-sm">{m.usuario_nombre}</p>
                {badge(m)}
              </div>
              <p className="text-xs text-gray-600">{m.plan_nombre} · {textoTokens(m)}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Vence {formatFecha(m.fecha_vencimiento)}</span>
                {acciones(m, 16)}
              </div>
            </div>
          )}
        />
      </div>

      <Modal
        open={modal !== null}
        onClose={cerrarModal}
        title={modal === "create" ? "Nueva membresía" : "Editar membresía"}
        bloquearCierre={saving}
        footer={
          <>
            <Button variante="secundario" onClick={cerrarModal} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} cargando={saving} textoCargando="Guardando...">
              {modal === "create" ? "Crear membresía" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Alumno" required>
            {(p) => (
              <select {...p} value={form.usuario_id} onChange={(e) => setForm((f) => ({ ...f, usuario_id: e.target.value }))} className={CLASE_INPUT}>
                <option value="">Seleccionar alumno</option>
                {opcionesUsuario.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
          </FormField>

          <FormField label="Plan" required>
            {(p) => (
              <select
                {...p}
                value={form.plan_id}
                onChange={(e) => {
                  const plan = planes.find((pl) => pl.id === e.target.value);
                  setForm((f) => ({ ...f, plan_id: e.target.value, tokens_totales: plan?.tokens_mensuales ?? f.tokens_totales }));
                }}
                className={CLASE_INPUT}
              >
                <option value="">Seleccionar plan</option>
                {planes.map((pl) => <option key={pl.id} value={pl.id}>{pl.nombre}</option>)}
              </select>
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tokens totales" required ayuda="Se completa con el plan elegido">
              {(p) => <NumberInput {...p} value={form.tokens_totales} onChange={(n) => setForm((f) => ({ ...f, tokens_totales: n }))} />}
            </FormField>
            {/* Antes no existía: no había forma de corregir el saldo de un alumno (MEM-01). */}
            {modal === "edit" && (
              <FormField
                label="Tokens usados"
                ayuda={`Disponibles: ${Math.max(0, (form.tokens_totales ?? 0) - (form.tokens_usados ?? 0))}${
                  (form.tokens_usados ?? 0) >= (form.tokens_totales ?? 0) && (form.tokens_totales ?? 0) > 0 ? " · quedará sin tokens" : ""
                }`}
              >
                {(p) => <NumberInput {...p} value={form.tokens_usados} onChange={(n) => setForm((f) => ({ ...f, tokens_usados: n }))} />}
              </FormField>
            )}
          </div>

          {modal === "create" ? (
            <p className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
              Inicia hoy y vence en {planSeleccionado?.dias_vigencia ?? planSeleccionado?.dias ?? 30} días.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Fecha de inicio" required>
                {(p) => <input {...p} type="date" value={form.fecha_inicio} onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))} className={CLASE_INPUT} />}
              </FormField>
              <FormField label="Fecha de vencimiento" required>
                {(p) => <input {...p} type="date" value={form.fecha_vencimiento} onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))} className={CLASE_INPUT} />}
              </FormField>
            </div>
          )}

          {modal === "edit" && (
            <FormField
              label="Estado"
              ayuda={form.boleta_id ? "Membresía pagada con Flow." : "Membresía asignada desde el panel."}
              // MEM-04: al pasar a inactiva el trigger borra sus reservas futuras sin devolver tokens.
              error={pasaAInactiva ? "Al dejarla inactiva se borran las reservas futuras sin confirmar del alumno (si no tiene otra membresía vigente) y no se devuelven sus tokens. Si solo quieres pausarla, usa Congelar." : null}
            >
              {(p) => (
                <select {...p} value={form.estado ? "true" : "false"} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value === "true" }))} className={CLASE_INPUT}>
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              )}
            </FormField>
          )}

          {errorForm && (
            <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{errorForm}</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar membresía"
        message={<>¿Eliminar la membresía de <strong>{deleteTarget?.usuario_nombre}</strong> ({deleteTarget?.plan_nombre})? No se puede deshacer.</>}
        consecuencias={[
          "Si el alumno no tiene otra membresía vigente, se borran sus reservas futuras sin confirmar.",
          "No se devuelven tokens ni se reembolsa el pago.",
        ]}
        confirmLabel="Eliminar"
        textoCargando="Eliminando..."
        cargando={accionEnCurso}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={freezeAction !== null}
        variante={freezeAction?.action === "congelar" ? "advertencia" : "info"}
        title={freezeAction?.action === "congelar" ? "Congelar membresía" : "Reactivar membresía"}
        message={
          freezeAction?.action === "congelar"
            ? <>¿Congelar la membresía de <strong>{freezeAction?.m.usuario_nombre}</strong>?</>
            : <>¿Reactivar la membresía de <strong>{freezeAction?.m.usuario_nombre}</strong>?</>
        }
        consecuencias={
          freezeAction?.action === "congelar"
            ? ["El tiempo deja de correr y no puede reservar hasta reactivarla.", "Sus reservas futuras se cancelan y se le devuelven los tokens."]
            : ["El vencimiento se corre por los días que estuvo congelada.", "Vuelve a poder reservar con sus tokens."]
        }
        confirmLabel={freezeAction?.action === "congelar" ? "Congelar" : "Reactivar"}
        textoCargando={freezeAction?.action === "congelar" ? "Congelando..." : "Reactivando..."}
        cargando={accionEnCurso}
        onConfirm={handleFreezeAction}
        onCancel={() => setFreezeAction(null)}
      />
    </div>
  );
}
