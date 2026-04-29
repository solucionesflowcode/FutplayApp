"use client";

import CapsulaCard from "./CapsulaCard";
import type { Capsula } from "@/data/capsules";

type Props = {
    capsulas: Capsula[];
};

export default function CapsulasRender({ capsulas }: Props) {
    return (
        <div className="w-full h-full bg-white px-6 pt-4 rounded-xl">

            <div className="flex justify-between w-full items-center">
                <h1 className="text-[#00305B] text-[25px] font-semibold">
                    Últimas Cápsulas EdTech
                </h1>
                <button className="text-[#00305B] text-[15px] font-semibold underline underline-offset-4">
                    Ver toda la biblioteca
                </button>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-5 pb-6">
                {capsulas.length === 0 ? (
                    <p className="text-gray-400 col-span-full text-center py-4">
                        No hay cápsulas disponibles.
                    </p>
                ) : (
                    capsulas.map((capsula) => (
                        <div key={capsula.id} className="w-full">
                            <CapsulaCard
                                titulo={capsula.titulo}
                                imagen={capsula.imagen}
                                coach={capsula.coach}
                                categoria={capsula.categoria}
                                duracion={capsula.duracion}
                            />
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}
