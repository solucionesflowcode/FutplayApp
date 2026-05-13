"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Play,
  Lock,
  CheckCircle2,
  Clock,
  Download,
  Send,
  ChevronRight,
  Bookmark
} from "lucide-react";
import Link from "next/link";
import type { Capsula } from "@/data/capsules";

interface VideoPlayerViewProps {
  capsula: Capsula;
  hasMembership: boolean;
  onUnlock?: () => void;
}

export default function VideoPlayerView({ capsula, hasMembership, onUnlock }: VideoPlayerViewProps) {
  const [comment, setComment] = useState("");
  const [completed, setCompleted] = useState(false);

  // data mockeada simulando el contenido que trae el video por conceptos
  const guideMoments = [
    { time: "00:00", title: "Introducción y objetivos del módulo" },
    { time: "02:15", title: "Fundamentos de la técnica avanzada" },
    { time: "05:40", title: "Demostración en tiempo real" },
    { time: "12:20", title: "Errores comunes y cómo evitarlos" },
    { time: "18:45", title: "Resumen y ejercicios recomendados" },
  ];

  // Mock comentarios hardcodeados
  const comments = [
    {
      id: 1,
      user: "Alex Rodríguez",
      avatar: "AR",
      time: "hace 2 días",
      text: "Excelente explicación sobre el posicionamiento del cuerpo. ¡Muy útil!",
      color: "bg-blue-500",
    },
    {
      id: 2,
      user: "María G.",
      avatar: "MG",
      time: "hace 5 horas",
      text: "La calidad del video es increíble. ¿Habrá una segunda parte?",
      color: "bg-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Header de Navegación Interna */}
      <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/capsules"
              className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-lg font-black tracking-tight">{capsula.titulo}</h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                {capsula.categoria} • {capsula.coach}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-800 hover:bg-gray-900 transition-all text-sm font-medium text-gray-400 hover:text-white">
              <Bookmark size={16} />
              Guardar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Área Principal (3 Columnas) */}
          <div className="lg:col-span-3 space-y-8">

            {/* Reproductor de Video */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-2xl group">
              {!hasMembership ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-8 text-center">
                  <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800 shadow-[0_0_50px_rgba(37,99,235,0.1)]">
                    <Lock size={32} className="text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Contenido Exclusivo</h2>
                  <p className="text-gray-400 max-w-md mb-8">
                    Esta cápsula está disponible únicamente para miembros. Desbloquea todo el catálogo con una suscripción activa.
                  </p>
                  <Link
                    href="/planes"
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    Obtener Membresía
                  </Link>
                </div>
              ) : !process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || !capsula.bunny_video_id ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900 p-8 text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                    <Play size={24} className="text-red-500 opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Video no disponible</h3>
                  <p className="text-gray-400 text-sm max-w-xs">
                    {!process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID 
                      ? "Falta configuración técnica (Library ID). Por favor, contacta a soporte."
                      : "Esta cápsula no tiene un video vinculado todavía."}
                  </p>
                </div>
              ) : (
                <>
                  <iframe
                    src={`https://player.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID}/${capsula.bunny_video_id}`}
                    className="w-full h-full border-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                  />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.4)] animate-pulse">
                      <Play size={32} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sección 'Acerca de' */}
            <section className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Acerca de esta cápsula</h3>
                <span className="px-3 py-1 bg-blue-600/10 text-blue-400 text-xs font-bold rounded-full border border-blue-400/20">
                  Nivel Intermedio
                </span>
              </div>
              <div className="prose prose-invert max-w-none text-gray-400 leading-relaxed">
                <p>
                  En esta sesión intensiva, profundizaremos en las mecánicas clave que definen el éxito en el campo.
                  Exploraremos técnicas de visión periférica, control de balón bajo presión y toma de decisiones
                  en microsegundos.
                </p>
                <p className="mt-4">
                  Diseñado para atletas que buscan dar el siguiente paso en su carrera profesional, combinando
                  análisis táctico con práctica repetitiva de alto impacto.
                </p>
              </div>
              <div className="flex items-center gap-6 mt-8 pt-8 border-t border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <Clock size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Duración</p>
                    <p className="text-sm font-semibold">{capsula.duracion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <Play size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Tipo</p>
                    <p className="text-sm font-semibold">Técnica Individual</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Sección de Comentarios */}
            <section>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                Comunidad
                <span className="text-sm font-normal text-gray-500">(24)</span>
              </h3>

              <div className="space-y-6">
                {/* Input Comentario */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center font-bold text-sm">
                    TÚ
                  </div>
                  <div className="flex-1 space-y-3">
                    <textarea
                      placeholder="Comparte tu opinión o haz una pregunta..."
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-none"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button className="flex items-center gap-2 px-6 py-2 bg-white text-gray-950 font-bold rounded-lg text-sm hover:bg-gray-200 transition-colors">
                        <Send size={14} />
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista Comentarios */}
                <div className="space-y-8 pt-4">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full ${c.color} flex-shrink-0 flex items-center justify-center font-bold text-sm border-2 border-gray-950 shadow-lg`}>
                        {c.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-3 mb-1">
                          <span className="font-bold text-sm">{c.user}</span>
                          <span className="text-xs text-gray-500">{c.time}</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {c.text}
                        </p>
                        <button className="mt-2 text-xs font-bold text-gray-500 hover:text-blue-400 transition-colors uppercase tracking-widest">
                          Responder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>

          {/* Barra Lateral (1 Columna) */}
          <aside className="space-y-8">

            {/* Widget de Progreso */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckCircle2 size={60} className="text-emerald-500" />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Progreso</h4>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-black">{completed ? "100%" : "0%"}</span>
                <span className="text-xs text-gray-500 mb-1">Cápsula {completed ? "Completada" : "En curso"}</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-6">
                <div
                  className={`h-full bg-emerald-500 transition-all duration-1000 ease-out ${completed ? "w-full" : "w-0"}`}
                />
              </div>
              <button
                onClick={() => setCompleted(!completed)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${completed
                  ? "bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600/20"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                  }`}
              >
                {completed ? <CheckCircle2 size={16} /> : null}
                {completed ? "Completado" : "Marcar como completado"}
              </button>
            </div>

            {/* Guía Minuto a Minuto */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-gray-800 bg-gray-900/50">
                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500">Índice del video</h4>
              </div>
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                {guideMoments.map((moment, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left p-4 hover:bg-gray-800/50 transition-all border-b border-gray-800/50 last:border-0 group"
                  >
                    <div className="flex gap-4">
                      <span className="font-mono text-blue-500 text-sm font-bold group-hover:text-blue-400 transition-colors">
                        {moment.time}
                      </span>
                      <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors leading-snug">
                        {moment.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recursos Descargables */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Material de apoyo</h4>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <span className="text-[10px] font-black text-red-500">PDF</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-300">Guía de Ejercicios.pdf</span>
                  </div>
                  <Download size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <span className="text-[10px] font-black text-blue-500">ZIP</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-300">Material_Extra.zip</span>
                  </div>
                  <Download size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>

          </aside>

        </div>
      </main>

      {/* Footer / Mobile Nav Shim */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
