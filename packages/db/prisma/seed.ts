/**
 * Seed local — DyPos CL (Fase 2E · 2026-05-01).
 *
 * IDEMPOTENTE: corre cuantas veces quieras sin duplicar datos. Cada
 * entidad usa `upsert` o `findFirst`+`create` (cuando no hay key
 * natural). Re-ejecutar después de migraciones es seguro.
 *
 * USO:
 *   pnpm --filter @repo/db db:seed
 *
 * QUÉ CREA:
 *   - 2 usuarios: admin + cajero (passwords conocidas, dev only).
 *   - 1 caja activa "Caja Principal".
 *   - 1 categoría activa "Almacén".
 *   - 5 productos realistas con códigos de barras únicos.
 *   - 1 cliente con RUT chileno válido.
 *
 * NO PARA PROD: las passwords son públicas, los códigos de barras son
 * artificiales, el cliente es ficticio. El runbook de provisioning
 * (`docs/architecture/tenant-provisioning.md`) tiene su propio flujo
 * de seed inicial con password temporal por cliente real.
 *
 * Cierra G-DEV-CAJERO (memory 2026-04-30): permite smoke RBAC local
 * con cajero sin tocar BD prod.
 */

import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

// ─── Guardrail anti-prod (Fase 2E patch · 2026-05-01) ──────────────────────
//
// Este seed:
//   - sobreescribe passwords públicas conocidas ("admin123", "cajero123"),
//   - upserta emails/rut/códigos de barras determinísticos,
//   - inserta datos demo ficticios.
//
// Ejecutarlo contra una BD remota / de cliente real corrompe el sistema:
// rotaría credenciales conocidas e inyectaría productos demo en el catálogo
// activo. Para tenants reales, usar `scripts/provision-tenant.sh` que sigue
// otro flujo (password temporal por cliente + sin productos demo).
//
// Esta función bloquea el seed si la URL de conexión no apunta a un host
// dev/local conocido. NO hay override — es deliberado: si alguna vez el
// seed necesita correr en otro host, hay que editar la lista explícita
// abajo en un PR revisado.

const SAFE_DEV_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "postgres",      // hostname dentro de la red docker-compose
  "pos-postgres",  // container name del compose
]);

function assertSafeSeedTarget(): void {
  const url = process.env.POS_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Seed demo bloqueado: POS_DATABASE_URL / DATABASE_URL no está definida.",
    );
  }

  let host: string;
  try {
    // Postgres URLs (`postgresql://...`) son URL-parseables por WHATWG URL,
    // pero el campo `hostname` viene sin brackets para IPv6 y limpio para
    // hostnames normales — usamos eso directo.
    host = new URL(url).hostname;
  } catch {
    throw new Error(
      `Seed demo bloqueado: connection string inválida (no se pudo parsear host).`,
    );
  }

  if (!SAFE_DEV_HOSTS.has(host)) {
    throw new Error(
      `Seed demo bloqueado: la BD no parece local. Host detectado: "${host}". ` +
        `No usar en prod. Hosts permitidos: ${[...SAFE_DEV_HOSTS].join(", ")}. ` +
        `Para provisioning de tenants reales usar scripts/provision-tenant.sh.`,
    );
  }
}

assertSafeSeedTarget();

const prisma = new PrismaClient();

// ─── Usuarios ───────────────────────────────────────────────────────────────

async function seedUsuarios() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const cajeroHash = await bcrypt.hash("cajero123", 12);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@pos-chile.cl" },
    update: {
      password: adminHash,
      rol: Rol.ADMIN,
      activo: true,
      nombre: "Administrador",
    },
    create: {
      email: "admin@pos-chile.cl",
      nombre: "Administrador",
      password: adminHash,
      rol: Rol.ADMIN,
      activo: true,
    },
  });
  console.log(`✓ ADMIN:  ${admin.email} (id=${admin.id})`);

  const cajero = await prisma.usuario.upsert({
    where: { email: "cajero@pos-chile.cl" },
    update: {
      password: cajeroHash,
      rol: Rol.CAJERO,
      activo: true,
      nombre: "Cajero Demo",
    },
    create: {
      email: "cajero@pos-chile.cl",
      nombre: "Cajero Demo",
      password: cajeroHash,
      rol: Rol.CAJERO,
      activo: true,
    },
  });
  console.log(`✓ CAJERO: ${cajero.email} (id=${cajero.id})`);

  return { admin, cajero };
}

// ─── Caja ───────────────────────────────────────────────────────────────────
//
// `Caja` no tiene unique key en `nombre` a nivel SQL — el seed dedupea
// por nombre+ubicación con findFirst+create para mantener idempotencia.

async function seedCaja() {
  const existing = await prisma.caja.findFirst({
    where: { nombre: "Caja Principal" },
  });
  if (existing) {
    // Mantener activa por si un dev la desactivó probando.
    if (!existing.activa) {
      await prisma.caja.update({
        where: { id: existing.id },
        data: { activa: true },
      });
    }
    console.log(`✓ CAJA:   ${existing.nombre} (id=${existing.id}) — preserved`);
    return existing;
  }
  const caja = await prisma.caja.create({
    data: {
      nombre: "Caja Principal",
      ubicacion: "Mostrador",
      activa: true,
    },
  });
  console.log(`✓ CAJA:   ${caja.nombre} (id=${caja.id}) — created`);
  return caja;
}

// ─── Categoría ──────────────────────────────────────────────────────────────

async function seedCategoria() {
  // Categoria.nombre es @unique → upsert directo.
  const cat = await prisma.categoria.upsert({
    where: { nombre: "Almacén" },
    update: { activa: true },
    create: {
      nombre: "Almacén",
      descripcion: "Categoría general de productos de almacén",
      activa: true,
    },
  });
  console.log(`✓ CATEG:  ${cat.nombre} (id=${cat.id})`);
  return cat;
}

// ─── Productos ──────────────────────────────────────────────────────────────
//
// Producto.codigoBarras es @unique → upsert directo. Códigos artificiales
// (no son EAN-13 reales) — solo para que el scanner mobile/web tenga input
// determinístico durante smoke local.

const PRODUCTOS_DEMO = [
  {
    codigoBarras: "DEMO-7800001",
    nombre: "Coca-Cola 1.5L",
    descripcion: "Bebida gaseosa cola 1.5 litros",
    precio: 1_990,
    stock: 60,
    alertaStock: 10,
  },
  {
    codigoBarras: "DEMO-7800002",
    nombre: "Pan de molde 500g",
    descripcion: "Pan blanco rebanado 500g",
    precio: 1_590,
    stock: 40,
    alertaStock: 8,
  },
  {
    codigoBarras: "DEMO-7800003",
    nombre: "Leche entera 1L",
    descripcion: "Leche entera ultra pasteurizada 1 litro",
    precio: 1_290,
    stock: 80,
    alertaStock: 15,
  },
  {
    codigoBarras: "DEMO-7800004",
    nombre: "Arroz grado 1, 1kg",
    descripcion: "Arroz blanco grado 1 — bolsa 1kg",
    precio: 2_290,
    stock: 50,
    alertaStock: 10,
  },
  {
    codigoBarras: "DEMO-7800005",
    nombre: "Aceite vegetal 1L",
    descripcion: "Aceite vegetal de maravilla 1 litro",
    precio: 2_990,
    stock: 30,
    alertaStock: 6,
  },
];

async function seedProductos(categoriaId: number) {
  for (const p of PRODUCTOS_DEMO) {
    const prod = await prisma.producto.upsert({
      where: { codigoBarras: p.codigoBarras },
      update: {
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        stock: p.stock,
        alertaStock: p.alertaStock,
        activo: true,
        categoriaId,
      },
      create: {
        ...p,
        categoriaId,
        activo: true,
      },
    });
    console.log(
      `✓ PROD:   ${prod.nombre} (id=${prod.id}, stock=${prod.stock})`,
    );
  }
}

// ─── Cliente ────────────────────────────────────────────────────────────────

async function seedCliente() {
  // Cliente.rut es @unique. RUT 11.111.111-1 es un placeholder ficticio
  // pero formato-válido para que pase la validación del front.
  const cli = await prisma.cliente.upsert({
    where: { rut: "11.111.111-1" },
    update: {
      nombre: "Cliente Demo",
      email: "cliente.demo@example.cl",
      telefono: "+56 9 1111 1111",
      direccion: "Av. Demo 123, Santiago",
    },
    create: {
      rut: "11.111.111-1",
      nombre: "Cliente Demo",
      email: "cliente.demo@example.cl",
      telefono: "+56 9 1111 1111",
      direccion: "Av. Demo 123, Santiago",
    },
  });
  console.log(`✓ CLIENT: ${cli.nombre} (id=${cli.id})`);
  return cli;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Seed DyPos CL — dev local (idempotente)\n");

  await seedUsuarios();
  await seedCaja();
  const categoria = await seedCategoria();
  await seedProductos(categoria.id);
  await seedCliente();

  console.log("\n✅ Seed completo. Login dev:");
  console.log("   admin@pos-chile.cl / admin123");
  console.log("   cajero@pos-chile.cl / cajero123\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
