// Prepara una foto en el navegador antes de subirla. Solo funciona en el cliente.
import { dimensionesEscaladas } from "@/lib/liga-fotos";

const LADO_FOTO = 2000;
const LADO_MINIATURA = 600;
// Vercel corta las peticiones de más de 4,5 MB, y la miniatura viaja en la misma petición.
const MAX_BYTES_WEB = 3.5 * 1024 * 1024;
const CALIDADES_WEB = [0.85, 0.75, 0.6, 0.45];

export type FotoPreparada = { foto: Blob; miniatura: Blob; ancho: number; alto: number };

function dibujar(origen: ImageBitmap | HTMLCanvasElement, ancho: number, alto: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no pudo procesar la foto");
  // JPEG no tiene transparencia: sin esto, un PNG transparente queda con fondo negro.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(origen, 0, 0, ancho, alto);
  return canvas;
}

function aJpeg(canvas: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("El navegador no pudo procesar la foto"))), "image/jpeg", calidad);
  });
}

/**
 * Genera la versión web y la miniatura. Respeta la orientación de la foto y, como
 * se redibuja en un canvas, el resultado no conserva metadatos como la ubicación GPS.
 */
export async function prepararFoto(archivo: File): Promise<FotoPreparada> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("El navegador no puede leer este archivo. Usa una foto JPG, PNG o WebP.");
  }

  try {
    const { ancho, alto } = dimensionesEscaladas(bitmap.width, bitmap.height, LADO_FOTO);
    const canvas = dibujar(bitmap, ancho, alto);

    let foto: Blob | null = null;
    for (const calidad of CALIDADES_WEB) {
      foto = await aJpeg(canvas, calidad);
      if (foto.size <= MAX_BYTES_WEB) break;
    }
    if (!foto || foto.size > MAX_BYTES_WEB) throw new Error("La foto es demasiado pesada, incluso reducida.");

    const min = dimensionesEscaladas(ancho, alto, LADO_MINIATURA);
    const miniatura = await aJpeg(dibujar(canvas, min.ancho, min.alto), 0.75);
    return { foto, miniatura, ancho, alto };
  } finally {
    bitmap.close();
  }
}
