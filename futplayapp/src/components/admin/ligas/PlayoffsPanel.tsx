"use client";

import { useState } from "react";
import { ClipboardCheck, Pencil, RotateCcw, ChevronsRight, Swords } from "lucide-react";
import {
  actualizarPartido,
  generarPlayoffs,
  reiniciarPlayoffs,
  siguienteRondaPlayoffs,
  type LigaEquipoAdmin,
  type LigaJugadorAdmin,
} from "@/data/ligas-admin";
import { calcularTabla, ETIQUETA_FASE, type LigaPartido } from "@/lib/liga-tabla";
import { ganador, rondaActual, type Clasificados } from "@/lib/liga-playoffs";
import { esFechaIso, fechaHoraChileAIso, fechaHoraChileDesdeIso } from "@/lib/fechas";
import FixtureLista from "@/components/liga/FixtureLista";
import CampeonBanner from "@/components/liga/CampeonBanner";
import { Button, CLASE_INPUT, ConfirmDialog, FechaInput, FormField, Modal, useAdminMutation } from "@/components/admin/ui";
import ResultadoModal from "./ResultadoModal";

type Props = {
  ligaId: string;
  clasificados: Clasificados | null;
  equipos: LigaEquipoAdmin[];
  jugadores: LigaJugadorAdmin[];
  partidos: LigaPartido[];
  onCambio: () => void;
};

export default function PlayoffsPanel({ ligaId, clasificados, equipos, jugadores, partidos, onCambio }: Props) {
  const { ejecutar, pendiente } = useAdminMutation();
  const opciones = ([2, 4, 8] as Clasificados[]).filter((n) => n <= equipos.length);
  const [n, setN] = useState<Clasificados | null>(clasificados ?? opciones.at(-1) ?? null);
  const [confirmarGenerar, setConfirmarGenerar] = useState(false);
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  const [resultado, setResultado] = useState<LigaPartido | null>(null);
  const [editar, setEditar] = useState<{ p: LigaPartido; fecha: string; hora: string; cancha: string; errorFecha?: string } | null>(null);
  const mapa = new Map(equipos.map((e) => [e.id, e]));

  const ronda = rondaActual(partidos);
  const pendientesRegular = partidos.filter((p) => p.fase === "regular" && p.estado === "programado").length;
  const partidosRonda = ronda ? partidos.filter((p) => p.fase === ronda) : [];
  const rondaCompleta = partidosRonda.length > 0 && partidosRonda.every((p) => ganador(p) !== null);

  const generar = async () => {
    if (!n) return;
    const ok = await ejecutar(() => generarPlayoffs(ligaId, n), { exito: "Playoffs generados" });
    setConfirmarGenerar(false);
    if (ok) onCambio();
  };

  const siguiente = async () => {
    const ok = await ejecutar(() => siguienteRondaPlayoffs(ligaId), { exito: "Ronda siguiente generada" });
    if (ok) onCambio();
  };

  const reiniciar = async () => {
    const ok = await ejecutar(() => reiniciarPlayoffs(ligaId), { exito: "Playoffs reiniciados" });
    setConfirmarReinicio(false);
    if (ok) onCambio();
  };

  const guardarFecha = async () => {
    if (!editar) return;
    if (editar.fecha && !esFechaIso(editar.fecha)) {
      setEditar({ ...editar, errorFecha: "Usa dd/mm/aaaa" });
      return;
    }
    const ok = await ejecutar(
      () => actualizarPartido(editar.p.id, {
        fecha_hora: editar.fecha ? fechaHoraChileAIso(editar.fecha, editar.hora || "12:00") : null,
        cancha: editar.cancha || null,
      }),
      { exito: "Partido actualizado" },
    );
    if (ok) {
      setEditar(null);
      onCambio();
    }
  };

  if (!ronda) {
    const tabla = calcularTabla(equipos, partidos);
    return (
      <div className="bg-white rounded-xl ring-1 ring-black/5 p-5 max-w-xl">
        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Swords size={18} aria-hidden /> Generar playoffs</h3>
        <p className="text-sm text-gray-500 mt-1">
          Se arman desde la tabla actual: 1° vs último clasificado, 2° vs penúltimo… El mejor ubicado juega de local. Un empate se define por penales.
        </p>
        {opciones.length === 0 ? (
          <p className="mt-4 text-sm text-amber-700">Se necesitan al menos 2 equipos.</p>
        ) : (
          <>
            <div className="mt-4">
              <FormField label="Clasificados">
                {(p) => (
                  <select {...p} className={CLASE_INPUT} value={n ?? ""} onChange={(e) => setN(Number(e.target.value) as Clasificados)}>
                    {opciones.map((o) => <option key={o} value={o}>{o} equipos ({ETIQUETA_FASE[o === 8 ? "cuartos" : o === 4 ? "semifinal" : "final"]})</option>)}
                  </select>
                )}
              </FormField>
            </div>
            {n && (
              <ol className="mt-3 text-sm text-gray-700 list-decimal pl-5">
                {tabla.slice(0, n).map((f) => <li key={f.equipo.id}>{f.equipo.nombre} <span className="text-gray-400">· {f.pts} pts</span></li>)}
              </ol>
            )}
            {pendientesRegular > 0 && (
              <p className="mt-3 text-sm text-amber-700">Quedan {pendientesRegular} partido(s) de la fase regular sin jugar: la tabla aún puede cambiar.</p>
            )}
            <Button className="mt-4" icono={<Swords size={16} />} onClick={() => setConfirmarGenerar(true)} disabled={!n}>Generar playoffs</Button>
          </>
        )}

        <ConfirmDialog
          open={confirmarGenerar}
          title="Generar playoffs"
          message={`Se crearán los cruces con los ${n} primeros de la tabla actual.`}
          consecuencias={pendientesRegular > 0 ? [`Hay ${pendientesRegular} partido(s) regulares sin jugar; si cambian, tendrás que reiniciar los playoffs.`] : undefined}
          confirmLabel="Generar"
          variante="info"
          cargando={pendiente}
          onConfirm={generar}
          onCancel={() => setConfirmarGenerar(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <CampeonBanner partidos={partidos} equipos={equipos} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">Ronda actual: <strong className="text-gray-900">{ETIQUETA_FASE[ronda]}</strong></p>
        <div className="flex flex-wrap gap-2">
          {ronda !== "final" && (
            <Button icono={<ChevronsRight size={16} />} onClick={siguiente} disabled={!rondaCompleta} cargando={pendiente}
              title={rondaCompleta ? undefined : "Carga todos los resultados de la ronda (con penales si hubo empate)"}>
              Generar {ETIQUETA_FASE[ronda === "cuartos" ? "semifinal" : "final"].toLowerCase()}
            </Button>
          )}
          <Button variante="secundario" icono={<RotateCcw size={15} />} onClick={() => setConfirmarReinicio(true)}>Reiniciar playoffs</Button>
        </div>
      </div>

      <FixtureLista
        partidos={partidos}
        equipos={equipos}
        fases="playoffs"
        acciones={(p) => p.fase === ronda ? (
          <>
            <Button variante="secundario" icono={<ClipboardCheck size={14} />} onClick={() => setResultado(p)}>Resultado</Button>
            <Button variante="fantasma" aria-label="Editar día y cancha" icono={<Pencil size={14} />}
              onClick={() => {
                const fh = p.fecha_hora ? fechaHoraChileDesdeIso(p.fecha_hora) : null;
                setEditar({ p, fecha: fh?.fecha ?? "", hora: fh?.hora ?? "", cancha: p.cancha ?? "" });
              }} />
          </>
        ) : null}
      />

      <ResultadoModal partido={resultado} equipos={mapa} jugadores={jugadores} onClose={() => setResultado(null)} onGuardado={onCambio} />

      <Modal
        open={!!editar}
        onClose={() => setEditar(null)}
        title="Día y cancha"
        size="sm"
        bloquearCierre={pendiente}
        footer={
          <>
            <Button variante="secundario" onClick={() => setEditar(null)} disabled={pendiente}>Cancelar</Button>
            <Button onClick={guardarFecha} cargando={pendiente}>Guardar</Button>
          </>
        }
      >
        {editar && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Día" error={editar.errorFecha}>
                {(p) => <FechaInput {...p} value={editar.fecha} onChange={(fecha) => setEditar({ ...editar, fecha, errorFecha: undefined })} />}
              </FormField>
              <FormField label="Hora">
                {(p) => <input {...p} type="time" className={CLASE_INPUT} value={editar.hora} onChange={(e) => setEditar({ ...editar, hora: e.target.value })} />}
              </FormField>
            </div>
            <FormField label="Cancha">
              {(p) => <input {...p} className={CLASE_INPUT} value={editar.cancha} onChange={(e) => setEditar({ ...editar, cancha: e.target.value })} />}
            </FormField>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmarReinicio}
        title="Reiniciar playoffs"
        message="Se borrarán todos los partidos y resultados de playoffs. La fase regular no cambia."
        confirmLabel="Reiniciar"
        variante="advertencia"
        cargando={pendiente}
        onConfirm={reiniciar}
        onCancel={() => setConfirmarReinicio(false)}
      />
    </div>
  );
}
