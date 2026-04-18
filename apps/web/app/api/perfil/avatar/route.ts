import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

import { prisma } from "@repo/db";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  // Check Content-Length ANTES de leer el body para evitar que el servidor
  // absorba payloads gigantes. Es un pre-filtro: el header puede estar ausente
  // o ser manipulado, por eso no reemplaza el check de file.size más abajo.
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > MAX_BYTES) {
      return NextResponse.json(
        { error: "Archivo demasiado grande (máximo 2 MB)" },
        { status: 413 },
      );
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Formato de solicitud inválido" },
      { status: 400 },
    );
  }

  const raw = formData.get("avatar");
  // Node 20 no expone File global siempre; duck-typing Blob-compatible.
  if (
    !raw ||
    typeof raw === "string" ||
    typeof (raw as Blob).arrayBuffer !== "function"
  ) {
    return NextResponse.json(
      { error: "Archivo 'avatar' faltante" },
      { status: 400 },
    );
  }
  const file = raw as Blob & { size: number; type: string };

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no soportado (usa JPEG, PNG o WebP)" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Archivo excede el máximo permitido (2 MB)` },
      { status: 400 },
    );
  }

  const input = Buffer.from(await file.arrayBuffer());

  let jpegBuffer: Buffer;
  try {
    jpegBuffer = await sharp(input)
      .rotate() // respeta EXIF orientation
      .resize(200, 200, { fit: "cover", position: "centre" })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar la imagen (formato dañado o no soportado)" },
      { status: 400 },
    );
  }

  const dataURL = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;

  await prisma.usuario.update({
    where: { id: userId },
    data: { avatar: dataURL },
  });

  revalidatePath("/perfil");
  revalidatePath("/", "layout");

  return NextResponse.json({
    ok: true,
    avatar: dataURL,
    bytes: jpegBuffer.byteLength,
  });
}
