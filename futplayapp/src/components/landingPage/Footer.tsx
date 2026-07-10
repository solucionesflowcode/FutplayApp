export default function Footer() {
    return (
        <>
            <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#001730]/90 backdrop-blur-md text-gray-400 py-1.5 border-t border-white/5 md:hidden">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-3 gap-2">
                    <div>
                        <h3 className="text-xs font-black text-white mb-1">Futplay<span className="text-[#f59e0b]">.</span></h3>
                        <p className="text-[10px] leading-tight text-gray-400">
                            Academia de alto rendimiento
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-1 text-[10px]">Sedes</h4>
                        <ul className="text-[10px] space-y-0.5">
                            <li>Quilpué</li>
                            <li>Reñaca</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-1 text-[10px]">Contáctanos</h4>
                        <ul className="text-[10px] space-y-1">
                            <li className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#f59e0b] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                <a href="mailto:futplay.fp@gmail.com" className="hover:text-white transition-colors truncate">futplay.fp@gmail.com</a>
                            </li>
                            <li className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#f59e0b] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                <a href="tel:+56975478490" className="hover:text-white transition-colors">+56 9 7547 8490</a>
                            </li>
                            <li className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#f59e0b] shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                                <a href="https://www.instagram.com/futplay.fp/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@futplay.fp</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </footer>

            <footer className="hidden md:block fixed bottom-0 left-0 right-0 z-50 bg-[#001730]/90 backdrop-blur-md text-gray-400 py-3 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-8 grid grid-cols-3 gap-6">
                    <div>
                        <h3 className="text-lg font-black text-white mb-1">Futplay<span className="text-[#f59e0b]">.</span></h3>
                        <p className="text-xs leading-tight text-gray-400 max-w-xs">
                            Academia de fútbol de alto rendimiento con metodologías avanzadas, e-learning y entrenamiento físico estilo Barcelona.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-1 text-sm">Sedes Físicas</h4>
                        <ul className="text-xs space-y-1">
                            <li>Sede Quilpué</li>
                            <li>Sede Reñaca</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-1 text-sm">Contáctanos</h4>
                        <ul className="text-xs space-y-1.5">
                            <li className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#f59e0b] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                <a href="mailto:futplay.fp@gmail.com" className="hover:text-white transition-colors">futplay.fp@gmail.com</a>
                            </li>
                            <li className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#f59e0b] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                <a href="tel:+56975478490" className="hover:text-white transition-colors">+56 9 7547 8490</a>
                            </li>
                            <li className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#f59e0b] shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                                <a href="https://www.instagram.com/futplay.fp/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@futplay.fp</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </footer>
        </>
    );
}