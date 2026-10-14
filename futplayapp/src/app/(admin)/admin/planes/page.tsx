"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Pencil, Search, Copy, Check, Share2, Ban, RotateCcw } from "lucide-react";
import {
  getPlanesAdmin,
  createPlanAdmin,
  updatePlanAdmin,
  setPlanActivo,
  PLANES_CON_LINK,
  type Plan,
  type TipoPlan,
} from "@/data/plans";
import {
  Button,
  CLASE_INPUT,
  ConfirmDialog,
  DataTable,
  FormField,
  Modal,
  NumberInput,
  PageHeader,
  useAdminMutation,
  useToast,
  type Columna,
} from "@/components/admin/ui";

type PlanForm = {
  id?: string;
  nombre: string;
  precio: number | null;
  tokens_mensuales: number | null;
  dias: number | null;
  tipo_plan: TipoPlan;
};

const emptyForm: PlanForm = { nombre: "", precio: null, tokens_mensuales: 4, dias: 30, tipo_plan: "normal" };

const TIPOS_PLAN: { valor: TipoPlan; etiqueta: string; ayuda: string }[] = [
  { valor: "normal", etiqueta: "Normal", ayuda: "Aparece en el catálogo. Reserva entrenamientos y partidos." },
  { valor: "kids", etiqueta: "Kids", ayuda: "Aparece en el catálogo. Solo reserva clases Kids." },
  { valor: "familiar", etiqueta: "Familiar", ayuda: "Oculto: se compra solo con el link de acceso." },
  { valor: "liga", etiqueta: "Liga", ayuda: "Oculto, pago único sin tokens: se compra solo con el link de acceso." },
];

type FiltroActivo = "activos" | "inactivos" | "todos";

function formatPrice(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

function TipoBadge({ tipo }: { tipo?: Plan["tipo_plan"] }) {
  if (tipo === "familiar") return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">Familiar · oculto</span>;
  if (tipo === "liga") return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold">Liga · pago único · oculto</span>;
  if (tipo === "kids") return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">Kids</span>;
  return null;
}

const tieneLink = (p: Plan) => !!p.tipo_plan && PLANES_CON_LINK.includes(p.tipo_plan);

export default function PlanesPage() {
  const toast = useToast();
  const { ejecutar } = useAdminMutation();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const reintentar = () => {
    setLoading(true);
    fetchPlanes();
  };
  const [search, setSearch] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("activos");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [cambioEstado, setCambioEstado] = useState<Plan | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [link, setLink] = useState<{ plan: Plan; url: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);

  const fetchPlanes = useCallback(async () => {
    const { planes, error } = await getPlanesAdmin();
    setPlanes(planes);
    setErrorCarga(error ? "No se pudieron cargar los planes" : null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlanes(); }, [fetchPlanes]);

  const activo = (p: Plan) => p.activo !== false;
  const q = search.toLowerCase();
  const porBusqueda = planes.filter((p) => p.nombre.toLowerCase().includes(q));
  const filtered = porBusqueda.filter((p) =>
    filtroActivo === "todos" ? true : filtroActivo === "activos" ? activo(p) : !activo(p)
  );
  const conteo = (f: FiltroActivo) => porBusqueda.filter((p) => (f === "todos" ? true : f === "activos" ? activo(p) : !activo(p))).length;

  const esLiga = form.tipo_plan === "liga";

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

  const openEdit = (p: Plan) => {
    setForm({ id: p.id, nombre: p.nombre, precio: p.precio, tokens_mensuales: p.tokens_mensuales, dias: p.dias ?? 30, tipo_plan: p.tipo_plan ?? "normal" });
    setErrorForm(null);
    setModal("edit");
  };

  const handleSave = async () => {
    // El plan Liga es un pago único sin tokens.
    if (!form.nombre.trim()) return setErrorForm("El nombre es obligatorio");
    if (form.precio === null || form.precio <= 0) return setErrorForm("El precio debe ser mayor a 0");
    if (!esLiga && (form.tokens_mensuales === null || form.tokens_mensuales < 1)) return setErrorForm("El plan debe tener al menos 1 token");
    if (form.dias === null || form.dias < 1 || form.dias > 365) return setErrorForm("La duración debe estar entre 1 y 365 días");

    const payload = {
      nombre: form.nombre.trim(),
      precio: form.precio,
      tokens_mensuales: esLiga ? 0 : form.tokens_mensuales!,
      dias: form.dias,
      tipo_plan: form.tipo_plan,
    };
    setSaving(true);
    setErrorForm(null);
    const res = modal === "create" ? await createPlanAdmin(payload) : await updatePlanAdmin({ ...payload, id: form.id! });
    setSaving(false);
    if (!res.success) return setErrorForm(res.error || "Error al guardar");
    toast.exito(modal === "create" ? "Plan creado" : "Plan actualizado");
    cerrarModal();
    fetchPlanes();
  };

  // Los planes no se eliminan: se desactivan (dejan de venderse) y se pueden reactivar.
  const handleCambiarEstado = async () => {
    if (!cambioEstado) return;
    const p = cambioEstado;
    const nuevo = !activo(p);
    const anterior = planes;
    setCambiando(true);
    setPlanes((prev) => prev.map((x) => (x.id === p.id ? { ...x, activo: nuevo } : x)));
    await ejecutar(() => setPlanActivo(p.id, nuevo), {
      exito: nuevo ? `${p.nombre} vuelve a venderse` : `${p.nombre} desactivado: ya no se vende`,
      error: nuevo ? "No se pudo reactivar el plan" : "No se pudo desactivar el plan",
      revertir: () => setPlanes(anterior),
    });
    setCambiando(false);
    setCambioEstado(null);
  };

  // Link de acceso de planes familiares/liga. Si aún no tiene codigo_acceso lo
  // genera; si ya tiene, reutiliza el existente para no invalidar links compartidos.
  // PLA-05: se muestra en un modal con botón Copiar (antes, window.prompt).
  const abrirLink = async (p: Plan) => {
    let url: string;
    if (p.codigo_acceso) {
      url = `${window.location.origin}/planes/familiar/${p.codigo_acceso}`;
    } else {
      const res = await fetch("/api/admin/planes/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) {
        toast.error("No se pudo generar el link", body.error);
        return;
      }
      url = body.url;
      setPlanes((prev) => prev.map((x) => (x.id === p.id ? { ...x, codigo_acceso: body.token } : x)));
    }
    setCopiado(false);
    setLink({ plan: p, url });
  };

  const copiarLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiado(true);
    } catch {
      // Sin permiso de portapapeles: el link queda seleccionado para copiarlo a mano.
      linkRef.current?.select();
      toast.info("Selecciona el link y cópialo con Ctrl+C");
    }
  };

  const acciones = (p: Plan) => (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {tieneLink(p) && activo(p) && (
        <button type="button" onClick={() => abrirLink(p)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" title="Link de acceso" aria-label={`Link de acceso de ${p.nombre}`}>
          <Share2 size={16} />
        </button>
      )}
      <button type="button" onClick={() => openEdit(p)} className="p-1.5 text-marca hover:bg-blue-50 rounded-lg" title="Editar" aria-label={`Editar ${p.nombre}`}>
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={() => setCambioEstado(p)}
        className={`p-1.5 rounded-lg ${activo(p) ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}`}
        title={activo(p) ? "Desactivar" : "Reactivar"}
        aria-label={`${activo(p) ? "Desactivar" : "Reactivar"} ${p.nombre}`}
      >
        {activo(p) ? <Ban size={16} /> : <RotateCcw size={16} />}
      </button>
    </div>
  );

  const columnas: Columna<Plan>[] = [
    {
      id: "nombre",
      encabezado: "Plan",
      celda: (p) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-semibold ${activo(p) ? "text-gray-900" : "text-gray-500 line-through"}`}>{p.nombre}</span>
          <TipoBadge tipo={p.tipo_plan} />
          {!activo(p) && <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[11px] font-bold">Desactivado</span>}
        </div>
      ),
      valorOrden: (p) => p.nombre,
    },
    { id: "precio", encabezado: "Precio", celda: (p) => <span className="font-semibold whitespace-nowrap">{formatPrice(p.precio)}</span>, valorOrden: (p) => p.precio },
    { id: "tokens", encabezado: "Tokens", celda: (p) => (p.tipo_plan === "liga" ? "—" : `${p.tokens_mensuales}`), valorOrden: (p) => p.tokens_mensuales },
    { id: "dias", encabezado: "Duración", celda: (p) => `${p.dias ?? 30} días`, valorOrden: (p) => p.dias ?? 30 },
    { id: "acciones", encabezado: "Acciones", celda: acciones },
  ];

  const desactivando = cambioEstado ? activo(cambioEstado) : false;

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        <PageHeader
          titulo="Gestión de planes"
          descripcion="Planes que se venden. Un plan no se elimina: se desactiva para que deje de venderse."
          acciones={<Button icono={<Plus size={16} />} onClick={openCreate}>Nuevo plan</Button>}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
              <input type="search" aria-label="Buscar plan" placeholder="Buscar plan..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${CLASE_INPUT} pl-9 py-2`} />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
              {(["activos", "inactivos", "todos"] as FiltroActivo[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filtroActivo === f}
                  onClick={() => setFiltroActivo(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filtroActivo === f ? "bg-marca border-marca text-white" : "bg-white border-gray-200 text-gray-600 hover:border-marca"}`}
                >
                  {f === "activos" ? "En venta" : f === "inactivos" ? "Desactivados" : "Todos"}{" "}
                  <span className={filtroActivo === f ? "text-white/70" : "text-gray-500"}>{conteo(f)}</span>
                </button>
              ))}
            </div>
          </div>
        </PageHeader>

        <DataTable
          etiqueta="Planes"
          filas={filtered}
          columnas={columnas}
          getId={(p) => p.id}
          cargando={loading}
          error={errorCarga}
          onReintentar={reintentar}
          resetKey={`${search}|${filtroActivo}`}
          vacio={search ? "No se encontraron planes" : filtroActivo === "inactivos" ? "No hay planes desactivados" : "No hay planes"}
          tarjetaMovil={(p) => (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-semibold text-sm ${activo(p) ? "text-gray-900" : "text-gray-500 line-through"}`}>{p.nombre}</span>
                <TipoBadge tipo={p.tipo_plan} />
              </div>
              <p className="text-xs text-gray-600">{formatPrice(p.precio)} · {p.tipo_plan === "liga" ? "sin tokens" : `${p.tokens_mensuales} tokens`} · {p.dias ?? 30} días</p>
              {acciones(p)}
            </div>
          )}
        />
      </div>

      <Modal
        open={modal !== null}
        onClose={cerrarModal}
        title={modal === "create" ? "Nuevo plan" : "Editar plan"}
        bloquearCierre={saving}
        footer={
          <>
            <Button variante="secundario" onClick={cerrarModal} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} cargando={saving} textoCargando="Guardando...">{modal === "create" ? "Crear plan" : "Guardar cambios"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre" required>
            {(p) => <input {...p} type="text" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Plan Premium" className={CLASE_INPUT} />}
          </FormField>
          <FormField label="Tipo de plan" required ayuda={TIPOS_PLAN.find((t) => t.valor === form.tipo_plan)?.ayuda}>
            {(p) => (
              <select {...p} value={form.tipo_plan} onChange={(e) => setForm((f) => ({ ...f, tipo_plan: e.target.value as TipoPlan }))} className={CLASE_INPUT}>
                {TIPOS_PLAN.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
              </select>
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Precio (CLP)" required>
              {(p) => <NumberInput {...p} value={form.precio} onChange={(n) => setForm((f) => ({ ...f, precio: n }))} placeholder="30000" />}
            </FormField>
            {/* PLA-04: los números se pueden vaciar (antes saltaban a 1 o 30 al borrar). */}
            <FormField label="Tokens" required={!esLiga} ayuda={esLiga ? "El plan Liga no da tokens." : "Clases que puede reservar en el período."}>
              {(p) => <NumberInput {...p} value={esLiga ? 0 : form.tokens_mensuales} disabled={esLiga} onChange={(n) => setForm((f) => ({ ...f, tokens_mensuales: n }))} />}
            </FormField>
          </div>
          <FormField label="Duración (días)" required ayuda="Vigencia de la membresía desde la compra (ej: 30 o 90).">
            {(p) => <NumberInput {...p} value={form.dias} onChange={(n) => setForm((f) => ({ ...f, dias: n }))} />}
          </FormField>
          {errorForm && <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{errorForm}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={cambioEstado !== null}
        variante={desactivando ? "advertencia" : "info"}
        title={desactivando ? "Desactivar plan" : "Reactivar plan"}
        message={<>¿{desactivando ? "Desactivar" : "Reactivar"} <strong>{cambioEstado?.nombre}</strong>?</>}
        consecuencias={
          desactivando
            ? [
                "Deja de aparecer en el catálogo y no se puede comprar.",
                ...(cambioEstado && tieneLink(cambioEstado) ? ["Su link de acceso deja de funcionar."] : []),
                "Las membresías vigentes de este plan no cambian: los alumnos siguen usando sus tokens.",
              ]
            : ["Vuelve a aparecer en el catálogo y se puede comprar."]
        }
        confirmLabel={desactivando ? "Desactivar" : "Reactivar"}
        textoCargando={desactivando ? "Desactivando..." : "Reactivando..."}
        cargando={cambiando}
        onConfirm={handleCambiarEstado}
        onCancel={() => setCambioEstado(null)}
      />

      <Modal
        open={link !== null}
        onClose={() => setLink(null)}
        title="Link de acceso"
        description={`${link?.plan.nombre}: compártelo solo con quien debe comprar este plan.`}
        cerrarConFondo
        footer={
          <>
            <Button variante="secundario" onClick={() => setLink(null)}>Cerrar</Button>
            <Button icono={copiado ? <Check size={16} /> : <Copy size={16} />} onClick={copiarLink}>{copiado ? "Copiado" : "Copiar link"}</Button>
          </>
        }
      >
        <FormField label="Link">
          {(p) => <input {...p} ref={linkRef} readOnly value={link?.url ?? ""} onFocus={(e) => e.currentTarget.select()} className={`${CLASE_INPUT} font-mono text-xs`} />}
        </FormField>
      </Modal>
    </div>
  );
}
