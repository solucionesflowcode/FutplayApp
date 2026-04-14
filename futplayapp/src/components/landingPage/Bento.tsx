export default function Bento() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-12 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e0f2fe] rounded-bl-full opacity-50 transition-transform group-hover:scale-110 pointer-events-none"></div>
          <h3 className="text-5xl font-black text-[#002a58] mb-2">2 Sedes</h3>
          <p className="text-xl text-gray-700 font-medium">Quilpué y Reñaca</p>
          <p className="mt-4 text-gray-500">Instalaciones físicas de primer nivel acondicionadas para entrenamientos técnicos y físicos de alta intensidad.</p>
        </div>
        <div className="bg-gradient-to-br from-[#f59e0b] to-[#c26d03] p-12 rounded-3xl text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow">
           <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-tl-full transition-transform group-hover:scale-110 pointer-events-none"></div>
          <h3 className="text-4xl font-black mb-4 leading-tight">Profesores<br/>Certificados</h3>
          <p className="text-orange-50 text-lg">
            Nuestro equipo técnico cuenta con licencias y certificaciones profesionales, listos para evaluar y potenciar tu rendimiento hacia el fútbol competitivo moderno.
          </p>
        </div>
      </div>
    </section>
  );
}