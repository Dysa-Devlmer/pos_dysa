import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@pos-chile.cl";
  const password = "admin123";
  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {
      password: hashed,
      rol: Rol.ADMIN,
      activo: true,
      nombre: "Administrador",
    },
    create: {
      email,
      nombre: "Administrador",
      password: hashed,
      rol: Rol.ADMIN,
      activo: true,
    },
  });

  console.log(`✓ Usuario ADMIN listo: ${admin.email} (id=${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
