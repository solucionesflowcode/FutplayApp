"use client";

import { useState } from "react";
import { actualizarPartido, type LigaJugadorAdmin } from "@/data/ligas-admin";
import { FASES_PLAYOFF, type LigaEquipoBase, type LigaPartido, type LigaPartidoEstado } from "@/lib/liga-tabla";
import { Button, CLASE_INPUT, FormField, Modal, NumberInput, useAdminMutation } from "@/components/admin/ui";

type Props = {
  partido: LigaPartido | null;
  equipos: Map<string, LigaEquipoBase>;
  jugadores: LigaJugadorAdmin[];
  onClose: () => void;
  onGuardado: () => void;
};

// Valor del selector de autor: "" sin autor, AUTOGOL o el id del jugador.
const AUTOGOL = "autogol";

const nombreJugador = (j: LigaJugadorAdmin) => `${j.numero != null ? `${j.numero} · ` : ""}${j.usuario?.nombre ?? "Jugador"}`;

/** Un selector por gol del equipo. Se puede guardar sin autor (plantel incompleto, no se sabe quién fue). */
function AutoresGoles({ equipo, cantidad, plantel, autores, onChange }: {
  equipo: string;
  cantidad: number;
  plantel: LigaJugadorAdmin[];
  autores: string[];
  onChange: (autores: string[]) => void;
}) {
  if (cantidad <= 0) return null;
  return (
    <fieldset className="space-y-2">
      <legend className="block text-xs font-semibold text-gray-600 mb-1">Goles de {equipo}</legend>
      {Array.from({ length: cantidad }, (_, i) => (
        <select
          key={i}
          aria-label={`Autor del gol ${i + 1} de ${equipo}`}
          className={CLASE_INPUT}
          value={autores[i] ?? ""}
          onChange={(e) => {
            const nuevos = Array.from({ length: cantidad }, (_, k) => autores[k] ?? "");
            nuevos[i] = e.target.value;
            onChange(nuevos);
          }}
        >
          <option value="">Gol {i + 1}: sin autor</option>
          {plantel.map((j) => <option key={j.id} value={j.id}>{nombreJugador(j)}</option>)}
          <option value={AUTOGOL}>Autogol del rival</option>
        </select>
      ))}
    </fieldset>
  );
}

/** Cargar o corregir el resultado, los autores de los goles y el jugador del partido. En playoffs, un empate exige penales. */
export default function ResultadoModal({ partido, equipos, jugadores, onClose, onGuardado }: Props) {
  const { ejecutar, pendiente } = useAdminMutation();
  const [estado, setEstado] = useState<LigaPartidoEstado>("jugado");
  const [gl, setGl] = useState<number | null>(null);
  const [gv, setGv] = useState<number | null>(null);
  const [pl, setPl] = useState<number | null>(null);
  const [pv, setPv] = useState<number | null>(null);
  const [autoresLocal, setAutoresLocal] = useState<string[]>([]);
  const [autoresVisita, setAutoresVisita] = useState<string[]>([]);
  const [mvp, setMvp] = useState("");
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
      const autores = (equipoId: string) => (partido.goles ?? [])
        .filter((g) => g.equipo_id === equipoId)
        // Un jugador que ya no está en el equipo no se puede elegir: el gol queda sin autor.
        .map((g) => (g.autogol ? AUTOGOL : jugadores.some((j) => j.id === g.jugador_id && j.equipo_id === equipoId) ? g.jugador_id! : ""));
      setAutoresLocal(autores(partido.local_id));
      setAutoresVisita(autores(partido.visita_id));
      setMvp(jugadores.some((j) => j.id === partido.jugador_partido_id && (j.equipo_id === partido.local_id || j.equipo_id === partido.visita_id)) ? partido.jugador_partido_id! : "");
      setError(null);
    }
  }

  if (!partido) return null;
  const esPlayoff = FASES_PLAYOFF.includes(partido.fase);
  const local = equipos.get(partido.local_id)?.nombre ?? "Local";
  const visita = equipos.get(partido.visita_id)?.nombre ?? "Visita";
  const pidePenales = esPlayoff && estado === "jugado" && gl !== null && gl === gv;
  const plantelLocal = jugadores.filter((j) => j.equipo_id === partido.local_id);
  const plantelVisita = jugadores.filter((j) => j.equipo_id === partido.visita_id);

  // Solo los goles que caben en el marcador y que tienen autor o son autogol.
  const filasGoles = (equipoId: string, autores: string[], cantidad: number) => autores
    .slice(0, cantidad)
    .filter(Boolean)
    .map((a) => (a === AUTOGOL
      ? { equipo_id: equipoId, jugador_id: null, autogol: true }
      : { equipo_id: equipoId, jugador_id: a, autogol: false }));

  const guardar = async () => {
    if (estado === "jugado") {
      if (gl === null || gv === null || gl < 0 || gv < 0) return setError("Ingresa los goles de ambos equipos");
      if (pidePenales && (pl === null || pv === null || pl === pv)) return setError("En playoffs el empate se define por penales: ingresa un marcador con ganador");
    }
    setError(null);
    const ok = await ejecutar(
      () => actualizarPartido(partido.id, estado === "jugado"
        ? {
            estado,
            goles_local: gl,
            goles_visita: gv,
            penales_local: pidePenales ? pl : null,
            penales_visita: pidePenales ? pv : null,
            goles: [...filasGoles(partido.local_id, autoresLocal, gl ?? 0), ...filasGoles(partido.visita_id, autoresVisita, gv ?? 0)],
            jugador_partido_id: mvp || null,
          }
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

        {estado === "jugado" && (
          <>
            <AutoresGoles equipo={local} cantidad={gl ?? 0} plantel={plantelLocal} autores={autoresLocal} onChange={setAutoresLocal} />
            <AutoresGoles equipo={visita} cantidad={gv ?? 0} plantel={plantelVisita} autores={autoresVisita} onChange={setAutoresVisita} />
            <FormField label="Jugador del partido" ayuda={plantelLocal.length + plantelVisita.length === 0 ? "Agrega jugadores a los equipos para poder elegirlo." : "Opcional"}>
              {(p) => (
                <select {...p} className={CLASE_INPUT} value={mvp} onChange={(e) => setMvp(e.target.value)}>
                  <option value="">Sin definir</option>
                  <optgroup label={local}>{plantelLocal.map((j) => <option key={j.id} value={j.id}>{nombreJugador(j)}</option>)}</optgroup>
                  <optgroup label={visita}>{plantelVisita.map((j) => <option key={j.id} value={j.id}>{nombreJugador(j)}</option>)}</optgroup>
                </select>
              )}
            </FormField>
          </>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
