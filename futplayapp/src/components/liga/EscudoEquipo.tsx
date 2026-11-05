/* eslint-disable @next/next/no-img-element */
// Logo del equipo o, si no tiene, sus iniciales sobre un color fijo por nombre.

const COLORES = ["bg-[#00305B]", "bg-[#F28C28]", "bg-emerald-600", "bg-sky-600", "bg-rose-600", "bg-violet-600", "bg-amber-600", "bg-teal-600"];

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}

function colorDe(nombre: string) {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORES[h % COLORES.length];
}

const TAMANOS = { sm: "w-6 h-6 text-[10px]", md: "w-9 h-9 text-xs", lg: "w-14 h-14 text-base" } as const;

export default function EscudoEquipo({ nombre, logoUrl, size = "md" }: { nombre: string; logoUrl?: string | null; size?: keyof typeof TAMANOS }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className={`${TAMANOS[size]} rounded-full object-cover bg-white ring-1 ring-black/5 shrink-0`} />;
  }
  return (
    <span aria-hidden className={`${TAMANOS[size]} ${colorDe(nombre)} rounded-full text-white font-bold flex items-center justify-center shrink-0`}>
      {iniciales(nombre)}
    </span>
  );
}
