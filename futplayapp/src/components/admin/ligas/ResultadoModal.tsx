"use client";

import { useState } from "react";
import { actualizarPartido } from "@/data/ligas-admin";
import { FASES_PLAYOFF, type LigaEquipoBase, type LigaPartido, type LigaPartidoEstado } from "@/lib/liga-tabla";
import { Button, CLASE_INPUT, FormField, Modal, NumberInput, useAdminMutation } from "@/components/admin/ui";

type Props = {
  partido: LigaPartido | null;
  equipos: Map<string, LigaEquipoBase>;
  onClose: () => void;
  onGuardado: () => void;
};

/** Cargar o corregir el resultado. En playoffs, un empate exige penales. */
export default function ResultadoModal({ partido, equipos, onClose, onGuardado }: Props) {
  const { ejecutar, pendiente } = useAdminMutation();
  const [estado, setEstado] = useState<LigaPartidoEstado>("jugado");
  const [gl, setGl] = useState<number | null>(null);
  const [gv, setGv] = useState<number | null>(null);
  const [pl, setPl] = useState<number | null>(null);
  const [pv, setPv] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carga los valores del partido al abrir otro (ajuste en el render, sin useEffect).
  const [idAnterior, setIdAnterior] = useState<string | null>(null);
  if ((partido?.id ?? null) !== idAnterior) {
    setIdAnterior(partido?.id ?? null);
    if (partido) {
      setEstado(partido.estado === "programado" ? "jugado" : partido.estado);
      setGl(partido.goles_local);
      setGv(partido.goles_visita);
      setPl(partido.penales_local);
      setPv(partido.penales_visita);
      setError(null);
    }
  }

  if (!partido) return null;
  const esPlayoff = FASES_PLAYOFF.includes(partido.fase);
  const local = equipos.get(partido.local_id)?.nombre ?? "Local";
  const visita = equipos.get(partido.visita_id)?.nombre ?? "Visita";
  const pidePenales = esPlayoff && estado === "jugado" && gl !== null && gl === gv;

  const guardar = async () => {
    if (estado === "jugado") {
      if (gl === null || gv === null || gl < 0 || gv < 0) return setError("Ingresa los goles de ambos equipos");
      if (pidePenales && (pl === null || pv === null || pl === pv)) return setError("En playoffs el empate se define por penales: ingresa un marcador con ganador");
    }
    setError(null);
    const ok = await ejecutar(
      () => actualizarPartido(partido.id, estado === "jugado"
        ? { estado, goles_local: gl, goles_visita: gv, penales_local: pidePenales ? pl : null, penales_visita: pidePenales ? pv : null }
        : { estado }),
      { exito: "Resultado guardado" },
    );
    if (ok) {
      onClose();
      onGuardado();
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Resultado del partido"
      description={`${local} vs ${visita}`}
      size="sm"
      bloquearCierre={pendiente}
      footer={
        <>
          <Button variante="secundario" onClick={onClose} disabled={pendiente}>Cancelar</Button>
          <Button onClick={guardar} cargando={pendiente} textoCargando="Guardando...">Guardar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Estado">
          {(p) => (
            <select {...p} className={CLASE_INPUT} value={estado} onChange={(e) => setEstado(e.target.value as LigaPartidoEstado)}>
              <option value="jugado">Jugado</option>
              <option value="programado">Programado (borra el resultado)</option>
              <option value="suspendido">Suspendido</option>
            </select>
          )}
        </FormField>

        {estado === "jugado" && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label={`Goles ${local}`} required>
              {(p) => <NumberInput {...p} className={CLASE_INPUT} value={gl} onChange={setGl} />}
            </FormField>
            <FormField label={`Goles ${visita}`} required>
              {(p) => <NumberInput {...p} className={CLASE_INPUT} value={gv} onChange={setGv} />}
            </FormField>
          </div>
        )}

        {pidePenales && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-amber-50">
            <p className="col-span-2 text-xs text-amber-800">Empate en playoffs: ingresa la definición a penales.</p>
            <FormField label={`Penales ${local}`} required>
              {(p) => <NumberInput {...p} className={CLASE_INPUT} value={pl} onChange={setPl} />}
            </FormField>
            <FormField label={`Penales ${visita}`} required>
              {(p) => <NumberInput {...p} className={CLASE_INPUT} value={pv} onChange={setPv} />}
            </FormField>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
