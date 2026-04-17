import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@pos-chile.cl" },
    update: {
      password: await bcrypt.hash("admin123", 12),
      rol: Rol.ADMIN,
      activo: true,
      nombre: "Administrador",
    },
    create: {
      email: "admin@pos-chile.cl",
      nombre: "Administrador",
      password: await bcrypt.hash("admin123", 12),
      rol: Rol.ADMIN,
      activo: true,
    },
  });
  console.log(`✓ ADMIN:  ${admin.email} (id=${admin.id})`);

  const cajero = await prisma.usuario.upsert({
    where: { email: "cajero@pos-chile.cl" },
    update: {
      password: await bcrypt.hash("cajero123", 12),
      rol: Rol.CAJERO,
      activo: true,
      nombre: "Cajero Demo",
    },
    create: {
      email: "cajero@pos-chile.cl",
      nombre: "Cajero Demo",
      password: await bcrypt.hash("cajero123", 12),
      rol: Rol.CAJERO,
      activo: true,
    },
  });
  console.log(`✓ CAJERO: ${cajero.email} (id=${cajero.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
