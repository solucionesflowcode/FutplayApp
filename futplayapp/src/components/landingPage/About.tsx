export default function About() {
    return (
        <section className="py-24 bg-white" id="about">
            <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                <div className="relative order-2 md:order-1 mt-8 md:mt-0">
                    <div className="absolute -inset-4 bg-gray-100 rounded-3xl transform -rotate-3 z-0"></div>
                    <img
                        src="https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=1500&auto=format&fit=crop"
                        className="rounded-2xl relative z-10 shadow-xl overflow-hidden object-cover w-full h-[450px]"
                        alt="Entrenador de fútbol instruyendo tacticas"
                    />
                </div>

                <div className="flex flex-col gap-6 order-1 md:order-2">
                    <span className="text-[#f59e0b] font-bold tracking-wider uppercase text-sm">Nuestra Metodología</span>
                    <h2 className="text-4xl md:text-5xl font-black text-[#002a58] leading-tight">
                        Fútbol Estilo Barcelona
                    </h2>
                    <p className="text-gray-600 text-lg leading-relaxed">
                        Nuestros profesores altamente certificados basan sus entrenamientos en la renombrada metodología de aprendizaje del FC Barcelona. Nos enfocamos intensamente en el dominio técnico del balón, la inteligencia táctica en el campo y la toma de rápida de decisiones bajo presión.
                    </p>
                    <ul className="space-y-4 mt-2">
                        <li className="flex items-center gap-4">
                            <div className="bg-[#e0f2fe] p-2.5 rounded-full text-[#0284c7] shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                            </div>
                            <span className="text-gray-700 font-medium md:text-lg">Profesores altamente certificados y evaluados</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <div className="bg-[#e0f2fe] p-2.5 rounded-full text-[#0284c7] shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                            </div>
                            <span className="text-gray-700 font-medium md:text-lg">Instalaciones físicas en Quilpué y Reñaca</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <div className="bg-[#e0f2fe] p-2.5 rounded-full text-[#0284c7] shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                            </div>
                            <span className="text-gray-700 font-medium md:text-lg">Enfocados al mundo competitivo y alto rendimiento</span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}