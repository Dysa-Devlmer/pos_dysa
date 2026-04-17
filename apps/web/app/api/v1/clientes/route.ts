import { prisma } from "@repo/db";
import { z } from "zod";
import { requireAuth, jsonOk, jsonError, parsePagination } from "../_helpers";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const search = searchParams.get("search");

  const where = search
    ? {
        OR: [
          { nombre: { contains: search, mode: "insensitive" as const } },
          { rut: { contains: search } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip,
      take: limit,
    }),
    prisma.cliente.count({ where }),
  ]);

  return jsonOk(data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}

const CreateSchema = z.object({
  rut: z.string().min(3).max(12),
  nombre: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

export async function POST(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido");
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
  }

  try {
    const cliente = await prisma.cliente.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
      },
    });
    return jsonOk(cliente);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique")) return jsonError("RUT ya registrado", 409);
    return jsonError("Error al crear cliente", 500);
  }
}
