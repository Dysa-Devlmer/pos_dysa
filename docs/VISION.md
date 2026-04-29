# Visión del Proyecto — DyPos CL

> **Documento autoritativo** — refleja la decisión estratégica confirmada
> con `Pierre Benites Solier` (`Dyon Labs`) en la sesión 2026-04-29.
> Cualquier cambio a esta visión requiere aprobación explícita del owner.

---

## 1. Problema que el sistema resuelve

El comerciante SMB chileno (almacén, restaurante, retail boutique, vendedor de
feria) hoy elige entre tres opciones imperfectas:

| Opción | Limitación |
|---|---|
| **Cuaderno + calculadora** | Errores humanos, sin trazabilidad SII, sin reportes, no escala |
| **Caja registradora física** | Sin integración digital, sin cliente fidelizado, sin inventario, sin reportes en tiempo real |
| **POS enterprise** (Bsale, Defontana) | Costo prohibitivo (~$30-100k CLP/mes), feature creep que el SMB no usa, lock-in fuerte |

El hueco de mercado: **POS web + mobile, integración SII (e-boleta), inventario
con kardex, dashboard, devoluciones — todo a precio SMB**. Sin perder
profesionalismo ni arquitectura escalable.

---

## 2. Propuesta de valor

`DyPos CL` es un sistema POS dual web + mobile diseñado específicamente
para el comerciante SMB chileno:

- **Web** (Next.js 15 RSC) para administración: catálogo, reportes,
  configuración, dashboard, gestión de usuarios.
- **Mobile** (Expo SDK 54, offline-first) para operación de turno: caja
  rápida con scanner, devoluciones, vista de KPIs.
- **e-boleta SII out-of-the-box** (en sprint F-8) — integración nativa con
  proveedor DTE elegido (RFC 4 proveedores en curso).
- **Despliegue dedicado por cliente** — cada licencia = instalación
  independiente con su propia BD, dominio, branding. Cero leak entre
  clientes.

---

## 3. Diferenciación frente a competencia

| Feature | Bsale | Defontana | `DyPos CL` |
|---|---|---|---|
| **e-boleta SII** | Plan extra ($+) | Incluido (enterprise) | ✅ Incluido (post F-8) |
| **App mobile offline** | Limitada | No | ✅ Sí, primera clase |
| **Dashboard tiempo real** | Básico | Sí | ✅ Sí (Recharts + KPIs) |
| **Kardex/inventario** | Plan extra | Sí | ✅ Sí (post F-12) |
| **Despliegue dedicado** | Multi-tenant compartido | On-premise opcional caro | ✅ Por default |
| **Lock-in / data portability** | Alto (SQL propietario) | Medio | ✅ Bajo (Postgres estándar, dump trivial) |
| **Precio target SMB** | $50-150k/mes plan completo | $300k+/mes | $24.990–$84.990/mes según plan (ver [PRICING-STRATEGY.md](./PRICING-STRATEGY.md)) |

---

## 4. Modelo de negocio

**Modelo confirmado** (sesión 2026-04-29):

**Suscripción mensual managed** — Dyon Labs hostea el VPS dedicado de cada
cliente como parte del servicio. Sin setup fee de barrera (ver razón en
[PRICING-STRATEGY.md](./PRICING-STRATEGY.md)).

3 planes:

| Plan | Precio (CLP/mes) | Target |
|---|---|---|
| **Starter** | $24.990 | Comercio chico (1 punto venta, hasta 500 ventas/mes) |
| **Pro** ⭐ | $44.990 | Comercio mediano (1-2 sucursales, hasta 5.000 ventas/mes) |
| **Business** | $84.990 | Multi-sucursal, branding custom, API access, ventas ilimitadas |

Add-on opcional **Onboarding Premium** $150.000 para clientes que quieran
instalación + capacitación presencial 4h en sus instalaciones.

Detalles + benchmark mercado + estrategia de lanzamiento en
[PRICING-STRATEGY.md](./PRICING-STRATEGY.md).

**Hosting**: el owner (Dyon Labs) hostea el VPS de cada cliente. El cliente
NO se hace cargo de infraestructura — la promesa del producto es "olvidate
del fierro, andá a tu negocio". Self-hosted NO se ofrece (excepción solo
si cliente exige y firma waiver de soporte, $1.500.000 license perpetua).

---

## 5. Arquitectura SaaS — Camino C confirmado

> Decisión arquitectónica completa: ver [ADR-001](./adr/001-arquitectura-saas-deployment-dedicado.md)

**Cada cliente que adquiere licencia recibe:**

```
┌──────────────────────────────────────────────────────────────┐
│  Cliente "FERRETERÍA EL CLAVO" (ejemplo)                     │
│                                                              │
│   Subdominio:  ferreteriaelclavo.dypos.zgamersa.com              │
│   ó dominio propio (ej: pos.elclavo.cl)                     │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ VPS dedicado (Vultr / Hetzner / cliente)             │  │
│   │  ┌────────────────┐  ┌────────────────┐             │  │
│   │  │ pos-web        │  │ pos-postgres   │             │  │
│   │  │ Next.js 15     │  │ PostgreSQL 16  │             │  │
│   │  │ (su instancia) │  │ (su BD)        │             │  │
│   │  └────────────────┘  └────────────────┘             │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   Su app móvil:  el-clavo-pos-v1.0.0.apk (branded)          │
│   Sus usuarios:  admin, cajero1, cajero2 (de su empresa)    │
└──────────────────────────────────────────────────────────────┘

        ▲ ZERO MIX con otro cliente ▼

┌──────────────────────────────────────────────────────────────┐
│  Cliente "PANADERÍA DOÑA MARÍA"                              │
│   Subdominio:  donamaria.dypos.zgamersa.com                      │
│   VPS:         su propio Docker Compose                     │
│   BD:          su propio Postgres                           │
│   APK mobile:  branded "Doña María POS"                     │
└──────────────────────────────────────────────────────────────┘
```

**Por qué Camino C (deployment dedicado) y no multi-tenant compartido:**

1. **Aislamiento garantizado por DB física**: imposible filtrar datos entre
   clientes por bug de query (= compliance Ley 21.719 trivial).
2. **Backup/restore independiente** por cliente.
3. **Personalización por cliente posible**: branding propio, features
   activos/inactivos, estructura de datos custom.
4. **Migración cliente entre proveedores fácil**: `pg_dump` + Docker compose.
5. **Bug en cliente A no afecta cliente B**.
6. **Path migración futura a multi-tenant SaaS** disponible cuando crezcas
   a 20+ clientes — ver [ADR-002](./adr/002-multi-tenant-future-migration.md).

---

## 6. Stack técnico (locked-in)

Ver [docs/stack.md](./stack.md) (próximo) y [memory/context/stack-tech.md](../memory/context/stack-tech.md) para versiones exactas.

| Capa | Tecnología | Razón de elección |
|---|---|---|
| Monorepo | Turborepo + pnpm 10 | Build cache + workspaces compartidos |
| Web | Next.js 15.3 + RSC + App Router | RSC = mejor perf SMB con conexiones lentas CL |
| Mobile | Expo SDK 54 + RN 0.81 | OTA updates sin Play Store, hot deploy |
| BD | PostgreSQL 16 | Maduro + soft-delete + CHECK constraints + TZ |
| ORM | Prisma 6 | Type-safe + migrations versionadas |
| Auth | NextAuth v5 | JWT + cookies híbrido web/mobile |
| Hosting | Vultr (default) | Latencia CL aceptable + precio SMB |

---

## 7. Roadmap (orden de prioridad)

### Inmediato (esta semana — Sprint actual)

- ✅ Estabilización mobile (M0-SS6 cerrados, app funciona en device)
- ✅ Schema hardening (CHECK constraints + soft-delete + partial unique)
- ✅ Test suite (mobile 46 tests + web 91 tests)
- ✅ CI mobile gate
- 🔄 **UI admin distribución mobile + nginx APK** (Bloque 5 sesión actual)
- 🔄 **Multi-tenant prep arquitectónico** (Bloque 4 sesión actual)
- 🔄 **Branding/atribución** del producto (Bloque 3 sesión actual)

### Sprint F-8 SII (6-8 semanas calendario)

- RFC 4 proveedores DTE (OpenFactura, Haulmer, SimpleAPI, Bsale API)
- Integración con proveedor elegido
- Schema `Venta.folioSII / tokenSII / urlPDFSII / estadoSII`
- Boleta electrónica generación + retry + offline queue
- **Bloqueante legal**: sin esto NO captar cliente que facture IVA

### Post-PMF (3-6 meses)

- F-12 Inventory v2 (kardex + valuación + ABC analysis)
- F-13 Sentry mobile + observability cross-stack
- F-15 Design tokens unification
- Migración a multi-tenant compartido SI tenés >20 clientes

### Long-term (6-12 meses)

- iOS App Store deployment
- API pública para integraciones B2B (eCommerce, inventario externo)
- Marketplace de extensiones (ej: módulo restaurante con mesas)
- Multi-idioma (CL → ES → resto LATAM)

---

## 8. Métricas de éxito

| Hito | Métrica | Target |
|---|---|---|
| **MVP listo** | Score técnico audit | 80/100 (hoy ~78/100) |
| **Primer cliente real** | F-8 SII deployable | T+8 semanas |
| **5 clientes pagantes** | Revenue mensual | $225k CLP MRR (5× Pro $44.990) |
| **20 clientes pagantes** | Decisión migrar multi-tenant | T+12 meses |

---

## 9. Misión personal del autor

`Pierre Benites Solier` (`Dyon Labs`) creó este proyecto con la convicción de que
**el comerciante SMB chileno merece tecnología empresarial sin complicaciones
empresariales**.

El sistema es:
- **Profesional** sin ser intimidante.
- **Escalable** sin ser pesado.
- **Aislado por cliente** sin ser caro.
- **Personalizable** sin requerir programador.

---

## 10. Quién mantiene el proyecto

`Pierre Benites Solier` — `private@zgamersa.com`

Repositorio: privado, propietario `Pierre Benites Solier`.
Licensing: ver `LICENSE` (propiedad intelectual privada, derechos limitados de
uso por cliente con licencia activa).

---

> **Última actualización**: 2026-04-29 — sesión planeación SaaS post-Día 5.
> Documento vivo: actualizar en cada decisión estratégica importante.
