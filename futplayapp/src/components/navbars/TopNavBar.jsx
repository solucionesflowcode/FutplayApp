// components/Navbar.tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/home", label: "Inicio" },
  { href: "/home/acerca-de-nosotros", label: "Acerca de Nosotros" },
  { href: "/home/nuestros-amigos", label: "Nuestros Amigos" },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const isActive = (href) => pathname === href;

    return (
        <nav className="fixed top-0 w-full z-50 bg-[#002a58] shadow-sm">
            <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
                <Link href="/home" className="text-2xl font-bold text-white">FutPlay</Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8">
                    {links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`transition-colors ${
                          isActive(link.href)
                            ? "text-white font-bold border-b-2 border-orange-500"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                </div>

                {/* Desktop Auth Buttons */}
                <div className="hidden md:flex gap-4">
                    <Link href="/login" className="bg-orange-500 text-white px-5 py-2 rounded-md font-bold hover:bg-orange-600 transition-colors">Inicia Sesion</Link>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center">
                    <button onClick={() => setIsOpen(!isOpen)} className="text-white hover:text-white/70 focus:outline-none">
                        {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 border-b border-gray-100 rounded-b-3xl' : 'max-h-0 opacity-0 border-transparent'}`}>
                <div className="flex flex-col items-center pt-8 pb-10 space-y-6">
                    {links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`text-[17px] tracking-wide hover:scale-105 active:scale-95 transition-all ${
                          isActive(link.href)
                            ? "text-[#004080] font-bold"
                            : "text-gray-500 hover:text-[#004080]"
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}

                    <div className="w-[60px] h-[3px] bg-gray-100 rounded-full my-2"></div>

                    <div className="flex flex-col items-center space-y-4 w-full mt-4">
                        <Link href="/login" className="w-[200px] text-center bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm font-bold px-4 py-[10px] rounded-full shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all" onClick={() => setIsOpen(false)}>Inicia Sesión</Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
