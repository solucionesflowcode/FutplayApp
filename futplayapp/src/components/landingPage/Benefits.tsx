export default function Benefits() {
    const benefits = [
        {
            title: "Entrenamiento Presencial",
            description: "Clases físicas intensivas en nuestras sedes de Quilpué y Reñaca, enfocadas en desarrollo técnico y táctico real.",
            icon: (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            )
        },
        {
            title: "E-Learning Inteligente",
            description: "Cápsulas de aprendizaje digital para estudiar teoría del fútbol, tácticas y mejorar la inteligencia de juego desde casa.",
            icon: (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            )
        },
        {
            title: "Alto Rendimiento",
            description: "Te preparamos para el fútbol competitivo con estándares de excelencia y evaluación continua.",
            icon: (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            )
        }
    ];

    return (
        <section className="py-24 bg-[#001730] text-white">
            <div className="max-w-7xl mx-auto px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-white">Academia Híbrida 360°</h2>
                    <p className="mt-4 text-blue-200 text-lg max-w-2xl mx-auto">
                        Combinamos rigurosos entrenamientos en la cancha con robusta formación teórica digital para crear jugadores integrales e inteligentes.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                    {benefits.map((item, index) => (
                        <div key={index} className="bg-[#002a58] p-10 rounded-2xl border border-white/5 hover:border-[#f59e0b]/50 transition-colors group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none group-hover:bg-[#f59e0b]/10 transition-colors"></div>
                            <div className="mb-6 bg-white/10 w-16 h-16 flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                            <p className="text-blue-100 leading-relaxed text-sm md:text-base">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}