import { prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { categoria: true },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({ data: productos });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}
