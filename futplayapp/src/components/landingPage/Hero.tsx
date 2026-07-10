"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const images = [
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1459865264687-595d652de67e?q=80&w=1500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=1500&auto=format&fit=crop",
];

export default function Hero() {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % images.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="relative min-h-screen pt-20 bg-[#002a58] text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-8 py-12 md:py-16">
                <div className="flex flex-col gap-6 max-w-3xl mx-auto md:mx-0">
                    <span className="uppercase text-sm tracking-widest text-[#f59e0b] font-bold">Sedés en Quilpué y Reñaca</span>
                    <h1 className="text-5xl md:text-7xl font-black leading-tight">
                        Futplay <br /> <span className="text-[#f59e0b]">Academia de Alto Rendimiento</span>
                    </h1>
                    <p className="text-blue-100 text-lg leading-relaxed">
                        Lleva tu nivel al mundo competitivo. Entrena presencialmente con nosotros y mejora técnica y tácticamente con nuestro sistema probado y apoyado por nuestra plataforma digital.
                    </p>

                    <div className="flex gap-4 mt-4 flex-wrap">
                        <Link href="/login" className="bg-[#f59e0b] hover:bg-[#d97706] transition-colors px-8 py-4 rounded-full font-bold text-[#002a58] shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-block">Únete a la Academia</Link>
                        <Link href="/home/acerca-de-nosotros" className="border-2 border-white hover:bg-white hover:text-[#002a58] transition-colors px-8 py-4 rounded-full font-bold inline-block">Conoce Más</Link>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-5xl mx-auto px-8 pb-12 md:pb-16">
                <div className="relative rounded-2xl overflow-hidden border-t-2 border-t-[#f59e0b] border-4 border-white/10 shadow-2xl">
                    <img
                        src={images[current]}
                        alt=""
                        className="w-full aspect-video md:aspect-[21/9] object-cover transition-opacity duration-500"
                    />
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-[#f59e0b] w-4" : "bg-white/50 hover:bg-white/80"}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}