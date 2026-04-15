import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { categoria: true },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({ data: productos });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}
