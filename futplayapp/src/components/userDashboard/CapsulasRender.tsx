import CapsulaCard from "./CapsulaCard";
import { capsulasMock } from "@/data/capsulas.mocks";

export default function CapsulasRender() {
    return (
        <div className="w-full h-full bg-white px-6 pt-4 rounded-xl">

            {/* Header */}
            <div className="flex justify-between w-full items-center">
                <h1 className="text-[#00305B] text-[25px] font-semibold">
                    Últimas Cápsulas EdTech
                </h1>
                <button className="text-[#00305B] text-[15px] font-semibold underline underline-offset-4">
                    Ver toda la biblioteca
                </button>
            </div>


            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-5 pb-6">
                {capsulasMock.map((capsula) => (
                    <div key={capsula.id} className="w-full">
                        <CapsulaCard
                            titulo={capsula.titulo}
                            imagen={capsula.imagen}
                            coach={capsula.coach}
                            categoria={capsula.categoria}
                            duracion={capsula.duracion}
                        />
                    </div>
                ))}
            </div>

        </div>
    );
}