import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();
const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";

function publicToken(): string {
  const bytes = randomBytes(22);
  let token = "";
  for (const byte of bytes) token += ALPHABET[byte % ALPHABET.length];
  return token;
}

async function generateUniqueToken(
  exists: (token: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const token = publicToken();
    if (!(await exists(token))) return token;
  }
  throw new Error("No se pudo generar un publicToken único");
}

async function main() {
  const ventas = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM ventas WHERE public_token IS NULL OR public_token = ''
  `;
  for (const venta of ventas) {
    const token = await generateUniqueToken(async (t) => {
      const found = await prisma.venta.findUnique({
        where: { publicToken: t },
        select: { id: true },
      });
      return Boolean(found);
    });
    await prisma.venta.update({
      where: { id: venta.id },
      data: { publicToken: token },
    });
  }

  const devoluciones = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM devoluciones WHERE public_token IS NULL OR public_token = ''
  `;
  for (const devolucion of devoluciones) {
    const token = await generateUniqueToken(async (t) => {
      const found = await prisma.devolucion.findUnique({
        where: { publicToken: t },
        select: { id: true },
      });
      return Boolean(found);
    });
    await prisma.devolucion.update({
      where: { id: devolucion.id },
      data: { publicToken: token },
    });
  }

  console.log(
    `Backfill public tokens OK — ventas=${ventas.length}, devoluciones=${devoluciones.length}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
