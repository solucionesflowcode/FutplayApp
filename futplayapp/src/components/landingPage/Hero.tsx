export default function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center pt-20 bg-[#002a58] text-white overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-[#002a58] to-transparent z-10"></div>
                <img src="https://images.unsplash.com/photo-1543326117-91f165aabf2d?q=80&w=2564&auto=format&fit=crop" className="w-full h-full object-cover" alt="Fútbol de alto rendimiento" />
            </div>
            <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-12 items-center relative z-10 py-12">
                <div className="flex flex-col gap-6">
                    <span className="uppercase text-sm tracking-widest text-[#f59e0b] font-bold">Sedés en Quilpué y Reñaca</span>
                    <h1 className="text-5xl md:text-7xl font-black leading-tight">
                        Futplay <br /> <span className="text-[#f59e0b]">Academia de Alto Rendimiento</span>
                    </h1>
                    <p className="text-blue-100 text-lg leading-relaxed">
                        Lleva tu nivel al mundo competitivo. Entrena presencialmente con nosotros y mejora técnica y tácticamente con nuestro sistema probado y apoyado por nuestra plataforma digital.
                    </p>

                    <div className="flex gap-4 mt-4 flex-wrap">
                        <button className="bg-[#f59e0b] hover:bg-[#d97706] transition-colors px-8 py-4 rounded-full font-bold text-[#002a58] shadow-lg hover:shadow-xl transform hover:-translate-y-1">Únete a la Academia</button>
                        <button className="border-2 border-white hover:bg-white hover:text-[#002a58] transition-colors px-8 py-4 rounded-full font-bold">Conoce Más</button>
                    </div>
                </div>

                <div className="hidden md:block relative">
                   <div className="absolute inset-0 bg-gradient-to-tr from-[#f59e0b] to-transparent rounded-3xl blur-2xl opacity-30 animate-pulse pointer-events-none"></div>
                    <img
                        src="https://images.unsplash.com/photo-1518605368461-1ee06806a6b5?q=80&w=1500&auto=format&fit=crop"
                        className="rounded-3xl relative z-10 border-4 border-white/10 shadow-2xl object-cover h-[500px] w-full"
                        alt="Entrenamiento de fútbol en Futplay"
                    />
                </div>
            </div>
        </section>
    );
}