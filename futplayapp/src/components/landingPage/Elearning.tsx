import React from 'react';
import Link from 'next/link';

export default function Elearning() {
    return (
        <section className="py-24 bg-gray-50 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#f59e0b] opacity-10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#002a58] opacity-10 blur-3xl pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-8 relative z-10">
                <div className="bg-[#002a58] border-t-2 border-t-[#f59e0b] p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-[#003b7a] to-transparent z-0 hidden md:block pointer-events-none" />
                    
                    <div className="flex-1 relative z-10 text-white">
                        <span className="text-[#f59e0b] font-bold tracking-wider uppercase text-sm bg-white/10 px-3 py-1 rounded-full">Nueva Metodología</span>
                        <h2 className="text-4xl md:text-5xl font-black mt-6 mb-6 leading-tight">
                            Aprende táctica desde cualquier lugar
                        </h2>
                        <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                            Nuestra plataforma de E-learning complementa tu entrenamiento en cancha. Accede a cápsulas de estudio, análisis de partidos y evaluaciones tácticas diseñadas por nuestros profesores certificados.
                        </p>

                    </div>

                    <div className="w-full md:w-2/5 relative z-10">
                        <Link href="/capsules" className="block h-full">
                            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:translate-y-[-3px] transition-all duration-300 cursor-pointer group ring-1 ring-inset ring-black/[0.03]">
                                <img
                                    src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop"
                                    alt="Triangulación Básica"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#001220]/85 via-[#001220]/30 to-transparent" />

                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/20 backdrop-blur-md border border-white/40 rounded-full w-12 h-12 flex items-center justify-center text-white">
                                        <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>
                                    </div>
                                </div>

                                <div className="absolute top-2.5 left-2.5 bg-black/75 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <svg className="w-[9px] h-[9px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    8 min
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                                    <span className="inline-block bg-[#F39200]/10 text-[#F39200] text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1">
                                        Táctica
                                    </span>
                                    <h3 className="text-white font-bold text-[0.85rem] leading-snug">
                                        Triangulación Básica
                                    </h3>
                                    <p className="text-white/60 text-[11px] mt-0.5">Metodología Barcelona</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
