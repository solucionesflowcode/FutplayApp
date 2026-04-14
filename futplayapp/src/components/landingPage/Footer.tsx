export default function Footer() {
    return (
        <footer className="bg-[#001730] text-gray-400 py-12 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-3 gap-8 mb-8">
                <div>
                    <h3 className="text-3xl font-black text-white mb-4">Futplay<span className="text-[#f59e0b]">.</span></h3>
                    <p className="text-sm max-w-xs">
                        Academia de fútbol de alto rendimiento con metodologías avanzadas, e-learning y entrenamiento físico estilo Barcelona.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4">Sedes Físicas</h4>
                    <ul className="text-sm space-y-2">
                        <li>Sede Quilpué</li>
                        <li>Sede Reñaca</li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4">Contáctanos</h4>
                    <ul className="text-sm space-y-3 object-top">
                        <li className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            contacto@futplay.cl
                        </li>
                        <li className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                            +56 9 1234 5678
                        </li>
                    </ul>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center border-t border-white/10 pt-8 text-sm">
                <p>© {new Date().getFullYear()} Futplay. Todos los derechos reservados.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                    <a href="#" className="hover:text-white transition-colors">Términos</a>
                </div>
            </div>
        </footer>
    );
}