"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Trophy, ChevronRight } from "lucide-react";
import {
  getLigasAdmin,
  crearLiga,
  actualizarLiga,
  eliminarLiga,
  type LigaAdmin,
} from "@/data/ligas-admin";
import type { LigaEstado } from "@/lib/liga-tabla";
import {
  Button,
  CLASE_INPUT,
  ConfirmDialog,
  DataTable,
  FormField,
  Modal,
  PageHeader,
  StatusBadge,
  useAdminMutation,
  type Columna,
} from "@/components/admin/ui";

type FormLiga = { id?: string; nombre: string; temporada: string; estado: LigaEstado };
const FORM_VACIO: FormLiga = { nombre: "", temporada: "", estado: "borrador" };

export default function GestionLigasPage() {
  const router = useRouter();
  const { ejecutar, pendiente } = useAdminMutation();
  const [ligas, setLigas] = useState<LigaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [form, setForm] = useState<FormLiga | null>(null);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<LigaAdmin | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    try {
      setLigas(await getLigasAdmin());
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!form) return;
    if (!form.nombre.trim()) {
      setErrorNombre("El nombre es obligatorio");
      return;
    }
    const datos = { nombre: form.nombre, temporada: form.temporada || null, estado: form.estado };
    const ok = await ejecutar(
      () => (form.id ? actualizarLiga(form.id, datos) : crearLiga(datos)),
      { exito: form.id ? "Liga actualizada" : "Liga creada" },
    );
    if (ok) {
      setForm(null);
      cargar();
    }
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    const ok = await ejecutar(() => eliminarLiga(aEliminar.id), { exito: "Liga eliminada" });
    if (ok) {
      setAEliminar(null);
      cargar();
    }
  };

  const columnas: Columna<LigaAdmin>[] = [
    {
      id: "nombre",
      encabezado: "Liga",
      valorOrden: (l) => l.nombre,
      celda: (l) => (
        <div>
          <p className="font-semibold text-gray-900">{l.nombre}</p>
          {l.temporada && <p className="text-xs text-gray-500">{l.temporada}</p>}
        </div>
      ),
    },
    { id: "equipos", encabezado: "Equipos", valorOrden: (l) => l.total_equipos ?? 0, celda: (l) => l.total_equipos ?? 0 },
    {
      id: "partidos",
      encabezado: "Partidos jugados",
      valorOrden: (l) => l.partidos_jugados ?? 0,
      celda: (l) => `${l.partidos_jugados ?? 0} / ${l.total_partidos ?? 0}`,
    },
    { id: "estado", encabezado: "Estado", valorOrden: (l) => l.estado, celda: (l) => <StatusBadge estado={l.estado} /> },
    {
      id: "acciones",
      encabezado: "",
      celda: (l) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variante="fantasma" aria-label={`Editar ${l.nombre}`} onClick={() => abrirEditar(l)} icono={<Pencil size={15} />} />
          <Button variante="fantasma" aria-label={`Eliminar ${l.nombre}`} onClick={() => setAEliminar(l)} icono={<Trash2 size={15} className="text-red-600" />} />
          <Button variante="secundario" onClick={() => router.push(`/admin/ligas/${l.id}`)}>
            Gestionar <ChevronRight size={14} aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  function abrirEditar(l: LigaAdmin) {
    setErrorNombre(null);
    setForm({ id: l.id, nombre: l.nombre, temporada: l.temporada ?? "", estado: l.estado });
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        <PageHeader
          titulo="Gestión de liga"
          descripcion="Ligas, equipos, fixture, resultados y playoffs. Los jugadores ven las ligas en curso o finalizadas en 'Liga SportTrade 2026'; las en borrador no se muestran."
          acciones={<Button icono={<Plus size={16} />} onClick={() => { setErrorNombre(null); setForm({ ...FORM_VACIO }); }}>Nueva liga</Button>}
        />

        <DataTable
          filas={ligas}
          columnas={columnas}
          getId={(l) => l.id}
          cargando={cargando}
          error={errorCarga ? "No se pudieron cargar las ligas" : undefined}
          onReintentar={cargar}
          onFilaClick={(l) => router.push(`/admin/ligas/${l.id}`)}
          etiqueta="Ligas"
          vacio={
            <div className="py-8 text-center text-gray-500">
              <Trophy className="mx-auto mb-2 text-gray-300" size={32} aria-hidden />
              Aún no hay ligas. Crea la primera con &quot;Nueva liga&quot;.
            </div>
          }
          tarjetaMovil={(l) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{l.nombre}</p>
                <p className="text-xs text-gray-500">{l.total_equipos ?? 0} equipos · {l.partidos_jugados ?? 0}/{l.total_partidos ?? 0} jugados</p>
              </div>
              <StatusBadge estado={l.estado} />
            </div>
          )}
        />
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Editar liga" : "Nueva liga"}
        bloquearCierre={pendiente}
        footer={
          <>
            <Button variante="secundario" onClick={() => setForm(null)} disabled={pendiente}>Cancelar</Button>
            <Button onClick={guardar} cargando={pendiente} textoCargando="Guardando...">Guardar</Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <FormField label="Nombre" required error={errorNombre}>
              {(p) => (
                <input {...p} className={CLASE_INPUT} value={form.nombre} placeholder="Ej: Serie A Stadio Italiano"
                  onChange={(e) => { setErrorNombre(null); setForm({ ...form, nombre: e.target.value }); }} />
              )}
            </FormField>
            <FormField label="Temporada" ayuda="Opcional. Ej: Apertura 2026">
              {(p) => <input {...p} className={CLASE_INPUT} value={form.temporada} onChange={(e) => setForm({ ...form, temporada: e.target.value })} />}
            </FormField>
            <FormField label="Estado" ayuda="En borrador la liga no la ven los jugadores.">
              {(p) => (
                <select {...p} className={CLASE_INPUT} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as LigaEstado })}>
                  <option value="borrador">Borrador</option>
                  <option value="en_curso">En curso</option>
                  <option value="finalizada">Finalizada</option>
                </select>
              )}
            </FormField>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar liga"
        message={<>¿Eliminar <strong>{aEliminar?.nombre}</strong>? Esta acción no se puede deshacer.</>}
        consecuencias={["Se borran sus equipos, planteles, partidos y resultados.", "Los jugadores dejan de verla en 'Liga SportTrade 2026'."]}
        confirmLabel="Eliminar liga"
        cargando={pendiente}
        textoCargando="Eliminando..."
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
