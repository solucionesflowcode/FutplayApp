// components/Navbar.tsx
"use client";
import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm">
            <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
                <div className="text-2xl font-bold text-[#004080]">FutPlay</div>

                <div className="hidden md:flex items-center gap-8">
                    <Link href="#" className="text-[#004080] font-bold border-b-2 border-orange-500">Inicio</Link>
                    <Link href="#" className="text-gray-500 hover:text-[#004080]">Sobre Nosotros</Link>
                    <Link href="#" className="text-gray-500 hover:text-[#004080]">Programas</Link>
                </div>

                <div className="flex gap-4">
                    <button className="text-gray-600">Unete</button>
                    <button className="bg-orange-500 text-white px-5 py-2 rounded-md font-bold">Register</button>
                </div>
            </div>
        </nav>
    );
}
