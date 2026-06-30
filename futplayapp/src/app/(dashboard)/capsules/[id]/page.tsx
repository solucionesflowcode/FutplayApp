import { getCapsulaById } from "@/data/capsules";
import { getDocumentosByCapsulaId } from "@/data/documentos";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import VideoPlayerView from "@/components/videoPlayer/VideoPlayerView";
import { redirect } from "next/navigation";
import { getChileMonthBounds } from "@/lib/fechas";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
    const { id } = await params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        redirect("/login");
    }

    const { data: usuario } = await supabase
        .from("usuario")
        .select("rol")
        .eq("id", user.id)
        .single();

    const isStaff = usuario?.rol === "profesor" || usuario?.rol === "administrador";
    const capsula = await getCapsulaById(id, isStaff ? "admin" : "alumno");

    if (!capsula) {
        redirect("/capsules");
    }

    const { startISO, endISO } = getChileMonthBounds();

    const { data: membresiaData } = await supabase
        .from("membresia")
        .select("*")
        .eq("usuario_id", user.id)
        .gte("fecha_inicio", startISO)
        .lt("fecha_inicio", endISO);

    const hasMembresia = (membresiaData?.length ?? 0) > 0;

    const documentos = await getDocumentosByCapsulaId(id);

    return (
        <VideoPlayerView 
            capsula={capsula} 
            hasMembership={hasMembresia} 
            documentos={documentos}
        />
    );
}
