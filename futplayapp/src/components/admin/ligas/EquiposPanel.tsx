"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, UserPlus, Upload, X, Search } from "lucide-react";
import {
  crearEquipo,
  actualizarEquipo,
  eliminarEquipo,
  subirLogoEquipo,
  buscarJugadores,
  agregarJugador,
  actualizarJugador,
  quitarJugador,
  type LigaEquipoAdmin,
  type LigaJugadorAdmin,
  type JugadorBuscado,
} from "@/data/ligas-admin";
import { getSedes, type Sede } from "@/data/sedes";
import { POSICIONES } from "@/lib/posiciones";
import EscudoEquipo from "@/components/liga/EscudoEquipo";
import { Button, CLASE_INPUT, ConfirmDialog, FormField, Modal, NumberInput, useAdminMutation, useToast } from "@/components/admin/ui";

type Props = {
  ligaId: string;
  equipos: LigaEquipoAdmin[];
  jugadores: LigaJugadorAdmin[];
  onCambio: () => void;
};

const etiquetaPosicion = (v: string | null) => POSICIONES.find((p) => p.valor === v)?.etiqueta ?? null;

export default function EquiposPanel({ ligaId, equipos, jugadores, onCambio }: Props) {
  const { ejecutar, pendiente } = useAdminMutation();
  const toast = useToast();

  // Equipo: crear / editar
  const [formEquipo, setFormEquipo] = useState<{ id?: string; nombre: string; sede_id: string; logo_url: string | null } | null>(null);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorSede, setErrorSede] = useState<string | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const inputLogo = useRef<HTMLInputElement>(null);
  const [equipoAEliminar, setEquipoAEliminar] = useState<LigaEquipoAdmin | null>(null);

  // Jugador: agregar / editar / quitar
  const [agregarA, setAgregarA] = useState<LigaEquipoAdmin | null>(null);
  const [editarJugador, setEditarJugador] = useState<{ fila: LigaJugadorAdmin; numero: number | null; equipo_id: string } | null>(null);
  const [jugadorAQuitar, setJugadorAQuitar] = useState<LigaJugadorAdmin | null>(null);

  useEffect(() => {
    getSedes().then(setSedes);
  }, []);

  const abrirFormEquipo = (form: NonNullable<typeof formEquipo>) => {
    setErrorNombre(null);
    setErrorSede(null);
    setFormEquipo(form);
  };

  const guardarEquipo = async () => {
    if (!formEquipo) return;
    if (!formEquipo.nombre.trim()) setErrorNombre("El nombre es obligatorio");
    if (!formEquipo.sede_id) setErrorSede("Elige la sede del equipo");
    if (!formEquipo.nombre.trim() || !formEquipo.sede_id) return;
    const datos = { nombre: formEquipo.nombre, sede_id: formEquipo.sede_id, logo_url: formEquipo.logo_url };
    const ok = await ejecutar(
      () => (formEquipo.id ? actualizarEquipo(formEquipo.id, datos) : crearEquipo(ligaId, datos)),
      { exito: formEquipo.id ? "Equipo actualizado" : "Equipo creado" },
    );
    if (ok) {
      setFormEquipo(null);
      onCambio();
    }
  };

  const elegirLogo = async (file: File | undefined) => {
    if (!file || !formEquipo) return;
    setSubiendo(true);
    const r = await subirLogoEquipo(file);
    setSubiendo(false);
    if (r.success && r.data) setFormEquipo((f) => (f ? { ...f, logo_url: r.data!.url } : f));
    else toast.error("No se pudo subir el logo", r.error);
  };

  const confirmarEliminarEquipo = async () => {
    if (!equipoAEliminar) return;
    const ok = await ejecutar(() => eliminarEquipo(equipoAEliminar.id), { exito: "Equipo eliminado" });
    setEquipoAEliminar(null);
    if (ok) onCambio();
  };

  const guardarJugador = async () => {
    if (!editarJugador) return;
    const ok = await ejecutar(
      () => actualizarJugador(editarJugador.fila.id, { numero: editarJugador.numero, equipo_id: editarJugador.equipo_id }),
      { exito: "Jugador actualizado" },
    );
    if (ok) {
      setEditarJugador(null);
      onCambio();
    }
  };

  const confirmarQuitar = async () => {
    if (!jugadorAQuitar) return;
    const ok = await ejecutar(() => quitarJugador(jugadorAQuitar.id), { exito: "Jugador quitado del equipo" });
    setJugadorAQuitar(null);
    if (ok) onCambio();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">{equipos.length} equipo(s) · {jugadores.length} jugador(es) inscritos</p>
        <Button icono={<Plus size={16} />} onClick={() => abrirFormEquipo({ nombre: "", sede_id: "", logo_url: null })}>Nuevo equipo</Button>
      </div>

      {equipos.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500 bg-white rounded-xl ring-1 ring-black/5">Crea los equipos de la liga para luego armar el fixture.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {equipos.map((e) => {
            const plantel = jugadores
              .filter((j) => j.equipo_id === e.id)
              .sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || (a.usuario?.nombre ?? "").localeCompare(b.usuario?.nombre ?? "", "es"));
            return (
              <section key={e.id} className="bg-white rounded-xl ring-1 ring-black/5 p-4 flex flex-col">
                <header className="flex items-center gap-3">
                  <EscudoEquipo nombre={e.nombre} logoUrl={e.logo_url} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 truncate">{e.nombre}</h3>
                    <p className="text-xs text-gray-500">{e.sede?.nombre ?? "Sin sede"} · {plantel.length} jugador(es)</p>
                  </div>
                  <Button variante="fantasma" aria-label={`Editar ${e.nombre}`} icono={<Pencil size={15} />}
                    onClick={() => abrirFormEquipo({ id: e.id, nombre: e.nombre, sede_id: e.sede_id ?? "", logo_url: e.logo_url })} />
                  <Button variante="fantasma" aria-label={`Eliminar ${e.nombre}`} icono={<Trash2 size={15} className="text-red-600" />}
                    onClick={() => setEquipoAEliminar(e)} />
                </header>

                <ul className="mt-3 divide-y divide-gray-100 flex-1">
                  {plantel.map((j) => (
                    <li key={j.id} className="py-2 flex items-center gap-2">
                      <span className="w-7 text-center text-xs font-bold text-[#00305B]">{j.numero ?? "–"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900 truncate">{j.usuario?.nombre ?? "Usuario eliminado"}</p>
                        <p className="text-[11px] text-gray-500 truncate">{etiquetaPosicion(j.usuario?.posicion ?? null) ?? j.usuario?.email ?? ""}</p>
                      </div>
                      <Button variante="fantasma" aria-label={`Editar a ${j.usuario?.nombre}`} icono={<Pencil size={13} />}
                        onClick={() => setEditarJugador({ fila: j, numero: j.numero, equipo_id: j.equipo_id })} />
                      <Button variante="fantasma" aria-label={`Quitar a ${j.usuario?.nombre}`} icono={<X size={14} className="text-red-600" />}
                        onClick={() => setJugadorAQuitar(j)} />
                    </li>
                  ))}
                  {plantel.length === 0 && <li className="py-3 text-xs text-gray-500">Sin jugadores todavía.</li>}
                </ul>

                <Button variante="secundario" className="mt-3 w-full" icono={<UserPlus size={15} />} onClick={() => setAgregarA(e)}>
                  Agregar jugador
                </Button>
              </section>
            );
          })}
        </div>
      )}

      {/* Crear / editar equipo */}
      <Modal
        open={!!formEquipo}
        onClose={() => setFormEquipo(null)}
        title={formEquipo?.id ? "Editar equipo" : "Nuevo equipo"}
        bloquearCierre={pendiente || subiendo}
        footer={
          <>
            <Button variante="secundario" onClick={() => setFormEquipo(null)} disabled={pendiente}>Cancelar</Button>
            <Button onClick={guardarEquipo} cargando={pendiente} disabled={subiendo} textoCargando="Guardando...">Guardar</Button>
          </>
        }
      >
        {formEquipo && (
          <div className="space-y-4">
            <FormField label="Nombre del equipo" required error={errorNombre}>
              {(p) => (
                <input {...p} className={CLASE_INPUT} value={formEquipo.nombre}
                  onChange={(ev) => { setErrorNombre(null); setFormEquipo({ ...formEquipo, nombre: ev.target.value }); }} />
              )}
            </FormField>
            <FormField label="Sede" required error={errorSede} ayuda="Sus partidos de local se juegan aquí.">
              {(p) => (
                <select {...p} className={CLASE_INPUT} value={formEquipo.sede_id}
                  onChange={(ev) => { setErrorSede(null); setFormEquipo({ ...formEquipo, sede_id: ev.target.value }); }}>
                  <option value="">Elige una sede</option>
                  {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
            </FormField>
            <div>
              <p className="block text-xs font-semibold text-gray-600 mb-1">Logo</p>
              <div className="flex items-center gap-3">
                <EscudoEquipo nombre={formEquipo.nombre || "?"} logoUrl={formEquipo.logo_url} size="lg" />
                <input ref={inputLogo} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(ev) => { elegirLogo(ev.target.files?.[0]); ev.target.value = ""; }} />
                <Button variante="secundario" icono={<Upload size={15} />} cargando={subiendo} textoCargando="Subiendo..." onClick={() => inputLogo.current?.click()}>
                  {formEquipo.logo_url ? "Cambiar" : "Subir logo"}
                </Button>
                {formEquipo.logo_url && (
                  <Button variante="fantasma" onClick={() => setFormEquipo({ ...formEquipo, logo_url: null })}>Quitar</Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG o WebP, máximo 2MB. Opcional.</p>
            </div>
          </div>
        )}
      </Modal>

      <AgregarJugadorModal
        ligaId={ligaId}
        equipo={agregarA}
        equipos={equipos}
        onClose={() => setAgregarA(null)}
        onAgregado={onCambio}
      />

      {/* Editar jugador: número o cambio de equipo */}
      <Modal
        open={!!editarJugador}
        onClose={() => setEditarJugador(null)}
        title={`Editar a ${editarJugador?.fila.usuario?.nombre ?? "jugador"}`}
        size="sm"
        bloquearCierre={pendiente}
        footer={
          <>
            <Button variante="secundario" onClick={() => setEditarJugador(null)} disabled={pendiente}>Cancelar</Button>
            <Button onClick={guardarJugador} cargando={pendiente} textoCargando="Guardando...">Guardar</Button>
          </>
        }
      >
        {editarJugador && (
          <div className="space-y-4">
            <FormField label="Número de camiseta" ayuda="Opcional, de 0 a 99.">
              {(p) => <NumberInput {...p} className={CLASE_INPUT} value={editarJugador.numero} onChange={(n) => setEditarJugador({ ...editarJugador, numero: n })} />}
            </FormField>
            <FormField label="Equipo">
              {(p) => (
                <select {...p} className={CLASE_INPUT} value={editarJugador.equipo_id} onChange={(ev) => setEditarJugador({ ...editarJugador, equipo_id: ev.target.value })}>
                  {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              )}
            </FormField>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!equipoAEliminar}
        title="Eliminar equipo"
        message={<>¿Eliminar <strong>{equipoAEliminar?.nombre}</strong>?</>}
        consecuencias={["Sus jugadores quedan fuera de la liga.", "Si tiene partidos en el fixture, primero hay que eliminarlos."]}
        confirmLabel="Eliminar equipo"
        cargando={pendiente}
        onConfirm={confirmarEliminarEquipo}
        onCancel={() => setEquipoAEliminar(null)}
      />

      <ConfirmDialog
        open={!!jugadorAQuitar}
        title="Quitar jugador"
        message={<>¿Quitar a <strong>{jugadorAQuitar?.usuario?.nombre}</strong> de la liga?</>}
        confirmLabel="Quitar"
        variante="advertencia"
        cargando={pendiente}
        onConfirm={confirmarQuitar}
        onCancel={() => setJugadorAQuitar(null)}
      />
    </div>
  );
}

/** Busca usuarios con rol jugador y los inscribe en el equipo elegido. */
function AgregarJugadorModal({ ligaId, equipo, equipos, onClose, onAgregado }: {
  ligaId: string;
  equipo: LigaEquipoAdmin | null;
  equipos: LigaEquipoAdmin[];
  onClose: () => void;
  onAgregado: () => void;
}) {
  const { ejecutar, pendiente } = useAdminMutation();
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<JugadorBuscado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [numero, setNumero] = useState<number | null>(null);

  // Al abrir para otro equipo se limpia la búsqueda (ajuste en el render, sin useEffect).
  const [equipoAnterior, setEquipoAnterior] = useState(equipo?.id);
  if (equipo?.id !== equipoAnterior) {
    setEquipoAnterior(equipo?.id);
    setTexto("");
    setResultados([]);
    setNumero(null);
  }

  useEffect(() => {
    const q = texto.trim();
    if (!equipo || q.length < 2) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      setBuscando(true);
      const r = await buscarJugadores(q, ligaId);
      if (!cancelado) {
        setResultados(r);
        setBuscando(false);
      }
    }, 300);
    return () => { cancelado = true; clearTimeout(t); };
  }, [texto, ligaId, equipo]);

  const agregar = async (u: JugadorBuscado) => {
    if (!equipo) return;
    const ok = await ejecutar(
      () => agregarJugador({ liga_id: ligaId, equipo_id: equipo.id, usuario_id: u.id, numero }),
      { exito: `${u.nombre} agregado a ${equipo.nombre}` },
    );
    if (ok) {
      setResultados((rs) => rs.map((r) => (r.id === u.id ? { ...r, equipo_id: equipo.id } : r)));
      setNumero(null);
      onAgregado();
    }
  };

  const nombreEquipo = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "otro equipo";
  const mostrar = texto.trim().length >= 2 ? resultados : [];

  return (
    <Modal
      open={!!equipo}
      onClose={onClose}
      title={`Agregar jugador a ${equipo?.nombre ?? ""}`}
      description="Busca por nombre o email entre los usuarios con rol jugador."
      bloquearCierre={pendiente}
      footer={<Button variante="secundario" onClick={onClose} disabled={pendiente}>Listo</Button>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <FormField label="Buscar jugador">
            {(p) => (
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                <input {...p} type="search" className={`${CLASE_INPUT} pl-9`} value={texto} placeholder="Nombre o email" onChange={(e) => setTexto(e.target.value)} />
              </div>
            )}
          </FormField>
          <FormField label="N° (opcional)">
            {(p) => <NumberInput {...p} className={CLASE_INPUT} value={numero} onChange={setNumero} />}
          </FormField>
        </div>

        <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100 rounded-lg ring-1 ring-black/5" aria-live="polite">
          {buscando && <li className="p-3 text-sm text-gray-500">Buscando...</li>}
          {!buscando && texto.trim().length >= 2 && mostrar.length === 0 && <li className="p-3 text-sm text-gray-500">Sin resultados.</li>}
          {texto.trim().length < 2 && <li className="p-3 text-sm text-gray-500">Escribe al menos 2 letras.</li>}
          {!buscando && mostrar.map((u) => (
            <li key={u.id} className="p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{u.nombre}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              {u.equipo_id ? (
                <span className="text-xs text-gray-500 shrink-0">{u.equipo_id === equipo?.id ? "Ya está en este equipo" : `En ${nombreEquipo(u.equipo_id)}`}</span>
              ) : (
                <Button variante="secundario" onClick={() => agregar(u)} disabled={pendiente} icono={<UserPlus size={14} />}>Agregar</Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
