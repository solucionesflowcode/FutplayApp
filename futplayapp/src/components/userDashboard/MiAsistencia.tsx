export default function MiAsistencia() {
    return (
        <div className="w-[220px] h-[250px] min-w-[220px] bg-white px-6 pt-4 rounded-xl   shadow-lg">
            <div className="flex flex-col gap-5 ">
                <h1 className="text-[#94A3B8] text-[15px]  ">Mi Asistencia</h1>
                <div className="flex flex-col">
                    <p className="text-center font-bold text-[30px] text-[#004080] mb-[-6px] ">5{/*AQUI VA EL NUMERO DE CLASES RESTANTES DEL USUARIO */}</p>
                    <p className="text-center text-[#004080] text-[12px] font-bold">CLASES RESTANTES <br /> ESTE MES</p>
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-[13px] text-center text-black">Excelente compromiso</p>
                    <p className="text-[10px] text-center text-[#94A3B8]">Has asistido a 17 de 22 <br />sesiones.</p>
                </div>

            </div>
        </div>
    );
}