import { getCapsulaById } from "@/data/capsules";
import { getDocumentosByCapsulaId } from "@/data/documentos";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import VideoPlayerView from "@/components/videoPlayer/VideoPlayerView";
import { redirect } from "next/navigation";
import { tieneAccesoContenido } from "@/lib/acceso-contenido";
import { getSignedEmbedUrl } from "@/lib/bunny";

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

    const hasMembresia = await tieneAccesoContenido(supabase, user.id);

    // La URL del video se firma en el servidor y solo para quien tiene acceso:
    // el reproductor de Bunny rechaza URLs sin firma (Token Authentication).
    const videoUrl = hasMembresia && capsula.bunny_video_id
        ? getSignedEmbedUrl(capsula.bunny_video_id)
        : null;

    const documentos = await getDocumentosByCapsulaId(id);

    return (
        <VideoPlayerView
            capsula={capsula}
            hasMembership={hasMembresia}
            videoUrl={videoUrl}
            documentos={documentos}
        />
    );
}
