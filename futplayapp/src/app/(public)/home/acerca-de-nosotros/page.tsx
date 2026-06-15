"use client";

import { useState } from "react";
import Footer from "../../../../components/landingPage/Footer";

const socios = [
  {
    nombre: "Pablo Fuenzalida",
    descripcion:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  },
  {
    nombre: "Cesar Reyes",
    descripcion:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    nombre: "Cristopher (Apellido)",
    descripcion:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
];

function SectionHeader() {
  return (
    <div className="max-w-7xl mx-auto px-8 pt-24 pb-8">
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight">
        UN EQUIPO DE EXPERTOS
        <br />
        <span className="text-[#f59e0b]">EN FUTBOL</span>
      </h1>
      <div className="w-16 h-0.5 bg-[#f59e0b]/60 mt-6 mb-10" />
      <div className="grid md:grid-cols-2 gap-12 max-w-5xl">
        <div>
          <p className="text-lg md:text-xl font-bold text-white/90 uppercase tracking-wide leading-snug">
            Formamos la próxima generación de talento futbolístico con metodología de clase mundial.
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-white/60 text-base leading-relaxed">
            En Futplay combinamos la experiencia de profesionales certificados con instalaciones
            de primer nivel en Quilpué y Reñaca. Nuestro equipo está dedicado a potenciar
            el talento de cada jugador a través de entrenamientos personalizados y tecnología
            de vanguardia.
          </p>
          <p className="text-white/60 text-base leading-relaxed">
            Creemos en el desarrollo integral del deportista, trabajando tanto la técnica
            individual como la inteligencia táctica colectiva, siguiendo la renombrada
            metodología del FC Barcelona.
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamCard({
  nombre,
  descripcion,
  expanded,
  onToggle,
}: {
  nombre: string;
  descripcion: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="group">
      <button
        onClick={onToggle}
        className="w-full text-left focus:outline-none"
        aria-expanded={expanded}
      >
        <div className="relative overflow-hidden rounded-[20px] bg-gray-100 aspect-[4/5]">
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-5xl md:text-6xl font-black text-gray-300 select-none">
              {nombre.charAt(0)}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <span className="inline-block px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full text-xs font-bold text-gray-900 shadow-sm">
              {nombre}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

function TeamSection() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleToggle = (i: number) => {
    setExpandedId((prev) => (prev === i ? null : i));
  };

  const expanded = expandedId !== null ? socios[expandedId] : null;
  const collapsed = socios.filter((_, i) => i !== expandedId);

  return (
    <section className="w-full bg-[#002a58]">
      <SectionHeader />

      <div className="max-w-7xl mx-auto px-8 pb-24">
        <div className="relative">
          <div
            className={`transition-all duration-700 ease-out overflow-hidden ${
              expanded ? "max-h-[500px] opacity-100 mb-8" : "max-h-0 opacity-0 mb-0"
            }`}
          >
            {expanded && (
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start bg-white/5 rounded-2xl p-5 md:p-8">
                <div className="w-full md:w-56 shrink-0">
                  <TeamCard
                    nombre={expanded.nombre}
                    descripcion={expanded.descripcion}
                    expanded={true}
                    onToggle={() => setExpandedId(null)}
                  />
                </div>
                <div className="flex-1 pt-2 animate-fadeIn">
                  <h3 className="text-lg font-bold text-white mb-2">{expanded.nombre}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{expanded.descripcion}</p>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="mt-3 px-3 py-1.5 border border-white/20 rounded-full text-xs text-white/80 hover:bg-white/10 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-6 justify-center">
            {collapsed.map((socio, i) => {
              const originalIndex = socios.indexOf(socio);
              return (
                <div
                  key={socio.nombre}
                  style={{
                    flexGrow: 0,
                    flexShrink: 0,
                    flexBasis: expanded ? "calc(50% - 0.75rem)" : "calc(33.333% - 1rem)",
                    transition: "flex-basis 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                    willChange: "flex-basis",
                  }}
                >
                  <div className="mx-auto max-w-[300px]">
                    <TeamCard
                      nombre={socio.nombre}
                      descripcion={socio.descripcion}
                      expanded={false}
                      onToggle={() => handleToggle(originalIndex)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="bg-white min-h-screen font-sans">
      <TeamSection />
      <Footer />
    </main>
  );
}
