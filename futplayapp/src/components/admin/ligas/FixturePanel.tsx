"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ClipboardCheck } from "lucide-react";
import { crearPartido, actualizarPartido, eliminarPartido, type LigaEquipoAdmin } from "@/data/ligas-admin";
import type { LigaPartido } from "@/lib/liga-tabla";
import { esFechaIso, fechaHoraChileAIso, fechaHoraChileDesdeIso } from "@/lib/fechas";
import FixtureLista from "@/components/liga/FixtureLista";
import { Button, CLASE_INPUT, ConfirmDialog, FechaInput, FormField, Modal, NumberInput, useAdminMutation } from "@/components/admin/ui";
import ResultadoModal from "./ResultadoModal";

type Props = {
  ligaId: string;
  equipos: LigaEquipoAdmin[];
  partidos: LigaPartido[];
  onCambio: () => void;
};

type FormPartido = { id?: string; jornada: number | null; local_id: string; visita_id: string; fecha: string; hora: string; cancha: string };

export default function FixturePanel({ ligaId, equipos, partidos, onCambio }: Props) {
  const { ejecutar, pendiente } = useAdminMutation();
  const [form, setForm] = useState<FormPartido | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [resultado, setResultado] = useState<LigaPartido | null>(null);
  const [aEliminar, setAEliminar] = useState<LigaPartido | null>(null);
  const mapa = new Map(equipos.map((e) => [e.id, e]));

  const regulares = partidos.filter((p) => p.fase === "regular");
  const ultimaJornada = Math.max(0, ...regulares.map((p) => p.jornada ?? 0));

  const abrirNuevo = () => {
    setErrorForm(null);
    setForm({ jornada: ultimaJornada || 1, local_id: "", visita_id: "", fecha: "", hora: "", cancha: "" });
  };

  const abrirEditar = (p: LigaPartido) => {
    const fh = p.fecha_hora ? fechaHoraChileDesdeIso(p.fecha_hora) : null;
    setErrorForm(null);
    setForm({ id: p.id, jornada: p.jornada, local_id: p.local_id, visita_id: p.visita_id, fecha: fh?.fecha ?? "", hora: fh?.hora ?? "", cancha: p.cancha ?? "" });
  };

  const guardar = async () => {
    if (!form) return;
    if (!form.jornada || form.jornada < 1) return setErrorForm("Indica la fecha (jornada) del partido");
    if (!form.local_id || !form.visita_id) return setErrorForm("Elige el equipo local y el visitante");
    if (form.local_id === form.visita_id) return setErrorForm("Un equipo no puede jugar contra sí mismo");
    if (form.fecha && !esFechaIso(form.fecha)) return setErrorForm("El día no es válido: usa dd/mm/aaaa");
    if (form.hora && !form.fecha) return setErrorForm("Si indicas la hora, indica también el día");
    setErrorForm(null);

    const datos = {
      jornada: form.jornada,
      local_id: form.local_id,
      visita_id: form.visita_id,
      // Hora en Chile; sin hora, se toma el mediodía para no cambiar de día.
      fecha_hora: form.fecha ? fechaHoraChileAIso(form.fecha, form.hora || "12:00") : null,
      cancha: form.cancha || null,
    };
    const ok = await ejecutar(
      () => (form.id ? actualizarPartido(form.id, datos) : crearPartido(ligaId, datos)),
      { exito: form.id ? "Partido actualizado" : "Partido creado" },
    );
    if (ok) {
      // Al crear, el formulario queda listo para el siguiente partido de la misma fecha.
      if (form.id) setForm(null);
      else setForm({ ...form, local_id: "", visita_id: "" });
      onCambio();
    }
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    const ok = await ejecutar(() => eliminarPartido(aEliminar.id), { exito: "Partido eliminado" });
    setAEliminar(null);
    if (ok) onCambio();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">
          {regulares.filter((p) => p.estado === "jugado").length} de {regulares.length} partido(s) de la fase regular jugados
        </p>
        <Button icono={<Plus size={16} />} onClick={abrirNuevo} disabled={equipos.length < 2}>Nuevo partido</Button>
      </div>
      {equipos.length < 2 && <p className="mb-4 text-sm text-amber-700">Necesitas al menos 2 equipos para crear partidos.</p>}

      <FixtureLista
        partidos={regulares}
        equipos={equipos}
        fases="regular"
        vacio="Aún no hay partidos. Crea el primero con 'Nuevo partido'."
        acciones={(p) => (
          <>
            <Button variante="secundario" icono={<ClipboardCheck size={14} />} onClick={() => setResultado(p)}>Resultado</Button>
            <Button variante="fantasma" aria-label="Editar partido" icono={<Pencil size={14} />} onClick={() => abrirEditar(p)} />
            <Button variante="fantasma" aria-label="Eliminar partido" icono={<Trash2 size={14} className="text-red-600" />} onClick={() => setAEliminar(p)} />
          </>
        )}
      />

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Editar partido" : "Nuevo partido"}
        bloquearCierre={pendiente}
        footer={
          <>
            <Button variante="secundario" onClick={() => setForm(null)} disabled={pendiente}>{form?.id ? "Cancelar" : "Cerrar"}</Button>
            <Button onClick={guardar} cargando={pendiente} textoCargando="Guardando...">{form?.id ? "Guardar" : "Crear partido"}</Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <FormField label="Fecha (jornada) N°" required>
              {(p) => <NumberInput {...p} className={CLASE_INPUT} value={form.jornada} onChange={(n) => setForm({ ...form, jornada: n })} />}
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Local" required>
                {(p) => (
                  <select {...p} className={CLASE_INPUT} value={form.local_id} onChange={(e) => setForm({ ...form, local_id: e.target.value })}>
                    <option value="">Elegir...</option>
                    {equipos.map((e) => <option key={e.id} value={e.id} disabled={e.id === form.visita_id}>{e.nombre}</option>)}
                  </select>
                )}
              </FormField>
              <FormField label="Visita" required>
                {(p) => (
                  <select {...p} className={CLASE_INPUT} value={form.visita_id} onChange={(e) => setForm({ ...form, visita_id: e.target.value })}>
                    <option value="">Elegir...</option>
                    {equipos.map((e) => <option key={e.id} value={e.id} disabled={e.id === form.local_id}>{e.nombre}</option>)}
                  </select>
                )}
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Día" ayuda="Opcional">
                {(p) => <FechaInput {...p} value={form.fecha} onChange={(fecha) => setForm({ ...form, fecha })} />}
              </FormField>
              <FormField label="Hora" ayuda="Hora de Chile">
                {(p) => <input {...p} type="time" className={CLASE_INPUT} value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />}
              </FormField>
            </div>
            <FormField label="Cancha" ayuda="Opcional. La sede es la del equipo local.">
              {(p) => <input {...p} className={CLASE_INPUT} value={form.cancha} onChange={(e) => setForm({ ...form, cancha: e.target.value })} />}
            </FormField>
            {errorForm && <p role="alert" className="text-sm text-red-600">{errorForm}</p>}
          </div>
        )}
      </Modal>

      <ResultadoModal partido={resultado} equipos={mapa} onClose={() => setResultado(null)} onGuardado={onCambio} />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar partido"
        message={<>¿Eliminar {mapa.get(aEliminar?.local_id ?? "")?.nombre} vs {mapa.get(aEliminar?.visita_id ?? "")?.nombre}?</>}
        consecuencias={aEliminar?.estado === "jugado" ? ["Su resultado deja de contar en la tabla."] : undefined}
        confirmLabel="Eliminar partido"
        cargando={pendiente}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
