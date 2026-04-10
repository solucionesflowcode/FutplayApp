import React from 'react';

export default function Elearning() {
    return (
        <section className="py-24 bg-gray-50 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#f59e0b] opacity-10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#002a58] opacity-10 blur-3xl pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-8 relative z-10">
                <div className="bg-[#002a58] rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-[#003b7a] to-transparent z-0 hidden md:block pointer-events-none" />
                    
                    <div className="flex-1 relative z-10 text-white">
                        <span className="text-[#f59e0b] font-bold tracking-wider uppercase text-sm bg-white/10 px-3 py-1 rounded-full">Nueva Metodología</span>
                        <h2 className="text-4xl md:text-5xl font-black mt-6 mb-6 leading-tight">
                            Aprende táctica desde cualquier lugar
                        </h2>
                        <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                            Nuestra plataforma de E-learning complementa tu entrenamiento en cancha. Accede a cápsulas de estudio, análisis de partidos y evaluaciones tácticas diseñadas por nuestros profesores certificados.
                        </p>
                        <button className="bg-white text-[#002a58] hover:bg-gray-100 transition-colors px-8 py-4 rounded-full font-bold shadow-lg hover:-translate-y-1 transform inline-flex items-center gap-2">
                            <span>Ver Cápsulas de Prueba</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                    </div>

                    <div className="w-full md:w-2/5 relative z-10">
                        <div className="bg-white rounded-2xl p-6 shadow-xl transform md:rotate-2 hover:rotate-0 transition-transform duration-300 border-4 border-white">
                            <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 relative overflow-hidden group cursor-pointer">
                                <img src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Video de táctica" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="w-14 h-14 bg-[#f59e0b] rounded-full flex items-center justify-center text-white pl-1 shadow-lg">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>
                                    </div>
                                </div>
                            </div>
                            <h4 className="text-gray-800 font-bold text-lg">Cápsula: Triangulación Básica</h4>
                            <p className="text-gray-500 text-sm mt-1">Metodología estilo Barcelona</p>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-bold text-[#002a58]">JS</div>
                                    <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-xs font-bold text-green-700">M</div>
                                </div>
                                <span className="text-xs font-semibold text-[#0284c7] bg-[#e0f2fe] px-2 py-1 rounded-md">8 min</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
