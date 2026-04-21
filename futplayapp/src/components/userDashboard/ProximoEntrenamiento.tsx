"use client";

export default function ProximoEntrenamiento() {
    return (
        <div className="w-full  min-w-[380px] h-[250px] bg-white px-6 pt-4 rounded-xl border-l-4 border-[#8A5100] shadow-lg ">
            <div className="flex justify-between ">
                <h1 className="text-[#8A5100] text-[15px] font-semibold ">Proximo Entrenamiento</h1>
                <p className="bg-[#D3E3FF] text-[#004080] px-2 py-1 rounded-[6px] text-[12px]"> {/*aqui va una llamado para obtener 
                cual es la hora de la clase*/}Hoy, 18:30</p>
            </div>
            <div className="flex flex-col gap-2 mt-5">
                <div>
                    {/* PENDIENTE: obtener de supabase el titulo de la clase */}
                    <p className="font-bold text-[20px] text-[#00305B]">Estrategia de pases largos</p>
                </div>
                <div>
                    {/* PENDIENTE: obtener de supabase la descripcion de la clase */}
                    <p className="text-[12px] text-[#42474F]">Desarrollo de precisión en desplazamientos
                        largos y posicionamiento táctico para recibir.
                        Requerido: Botines de pasto natural.</p>
                </div>
            </div>
            <div className="flex relative justify-between mt-5  ">
                <div className="text-[#94A3B8] text-[9px] font-semibold">CUENTA REGRESIVA:
                    <p className="text-[#004080] text-[20px] font-semibold"> {/*aqui va una funcion para obtener cuanto tiempo falta 
                para la clase*/} 02h:14m</p>
                </div>
                <button className="bg-[#8A5100] h-[40px] text-[16px] cursor-pointer hover:scale-102 transition-transform duration-100 text-white rounded-xl px-7">Cancelar con aviso</button>
            </div>
        </div>
    );
}