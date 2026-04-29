---
title: Decisiones SaaS Pivot — Sesión 2026-04-29
tags:
  - decision
  - saas
  - branding
  - pricing
  - product
date: 2026-04-29
estado: confirmado
---

# Decisiones del Pivot SaaS — 2026-04-29

> Sesión de planeación con `Pierre Benites Solier` (Dyon Labs) +
> Cowork. Decisiones tomadas que rigen toda la dirección estratégica
> del proyecto desde esta fecha.

---

## 1. Identidad del Producto

### Nombre Comercial Oficial

**`DyPos CL`**

Reemplaza los 4 nombres flotantes anteriores en código y docs:
- ~~POS Chile~~
- ~~SystemQR~~
- ~~Dysa POS~~
- ~~pos-chile~~ (queda solo como nombre del paquete pnpm/npm)

Convención de uso:
- **`DyPos CL`** en UI visible al usuario (headers, login, README,
  marketing, dominios).
- **`@repo/dypos-*`** en internals del monorepo (paquetes pnpm si se
  renombran en el futuro).
- **`dypos-cl`** en nombres de Docker images, contenedores, slugs.

### Owner / Propietario Legal

**Pierre Benites Solier**

- **Empresa/Estudio**: `Dyon Labs`
- **Email contacto/DPO**: `private@zgamersa.com`

### Repositorio

Privado. Propiedad intelectual de `Pierre Benites Solier` (Dyon Labs).
Ver `LICENSE` en raíz para términos.

---

## 2. Atribución en Commits

A partir de esta sesión (commit `03e8a66+`), los commits NO usan más
`Co-Authored-By: Claude`. La atribución oficial es:

```
Co-Authored-By: Ulmer Solier <bpier@zgamersa.com>
```

Razón: el owner es el autor intelectual del proyecto. Los agentes
Claude (Cowork, CLI, Worktree) son herramientas de implementación.
La atribución refleja la autoría real, consistente con la propiedad
del repositorio.

**Aplica a commits futuros únicamente** — la historia anterior se
mantiene tal cual (rewrite de history en repo público sería
problemático y los commits Co-Authored-By Claude son trazabilidad
honesta del proceso de implementación, no autoría).

---

## 3. Modelo Comercial

### Modelo elegido

**Híbrido — managed (centralizado) + suscripción mensual**

El owner (Dyon Labs) hostea el VPS de cada cliente como parte del
servicio. Razones:

1. **Cliente busca soluciones, no problemas** — la promesa del
   producto es "olvidate del fierro, andá a tu negocio". Self-hosted
   contradice esa promesa.
2. **Control de calidad**: actualizaciones, patches de seguridad,
   monitoring uniforme.
3. **Soporte simplificado**: cuando el cliente reporta problema,
   Dyon Labs tiene acceso al server.
4. **Compliance Ley 21.719**: Dyon Labs como controller registrado
   con DPO definido (`private@zgamersa.com`), no fragmentar en N
   datacenters de clientes con responsabilidades difusas.

### Plan de precios

**Pendiente decisión final** — Cowork investigó mercado y publicó
recomendación en `docs/PRICING-STRATEGY.md`. Pierre revisará y
confirmará tras leer el research. Ver ese documento para detalles.

Resumen rápido del benchmark mercado SMB Chile 2026:
- Bsale: $19k-$80k/mes
- Defontana: $80k-$300k/mes (enterprise)
- Toteat: $45k-$120k/mes (restaurantes)
- POS Reliant: $30k-$50k/mes (simple)

Posicionamiento DyPos CL: SMB con e-boleta SII out-of-the-box +
mobile offline + dashboard.

---

## 4. Operacional

### Subdominio de distribución APK

**`apk-dypos.zgamersa.com`**

Convención DNS confirmada por owner. Sirve los APKs de cada cliente
con paths del tipo:
- `/dypos-cl/v1.0.0.apk` — APK base de DyPos CL (demo público)
- `/<cliente-slug>/v1.0.0.apk` — APK con branding del cliente

### Backup local

**Disco externo USB** (manual, por ahora).

Path absoluto se completará cuando el owner conecte el USB. Por
default el script `scripts/backup-project.sh` apunta a
`~/Dysa-Projects-Backups/` que es local en el Mac — el owner debe
override con `BACKUP_DEST=/Volumes/<USB>/Dypos-Backups` cuando
ejecute el backup.

Plan futuro: cuando estabilice operación, migrar a:
- Cloud sync automático (R2 / Backblaze / Drive con encriptación
  cliente-side).
- Schedule diario via cron en el Mac.
- Replicación 3-2-1: 3 copias, 2 medios distintos, 1 offsite.

### Dominio principal

`zgamersa.com` (propiedad existente del owner).

Subdominios planeados:
- `dy-pos.zgamersa.com` — **demo permanente** (la web actual del
  owner para presentar a prospects). Queda libre para experimentación.
- `apk-dypos.zgamersa.com` — distribución APKs.
- `<cliente-slug>.dypos.zgamersa.com` — subdominio default cuando
  un cliente no tiene dominio propio.
- `pos.<cliente-domain>` — cuando el cliente provee su propio
  dominio (ej. `pos.ferreteriaelclavo.cl`).

---

## 5. Producto

### Mobile NO permite editar venta

**Filosofía mantenida**: el cajero opera la app móvil para CREAR
ventas y CREAR devoluciones, pero NO puede EDITAR ventas existentes
ni ELIMINAR ventas.

Decisión confirmada por owner tras pedirle recomendación. Razones
documentadas en `docs/SALES-PHILOSOPHY.md`:

1. **Anti-fraude**: cajero no puede alterar ventas históricas para
   robar (caso real documentado en literatura POS retail).
2. **Auditoría limpia**: cada venta es inmutable post-creación; las
   correcciones se hacen vía Devolución (parcial o total) que deja
   trail completo en `audit_logs`.
3. **Compliance SII**: una vez emitida la boleta, el SII espera
   inmutabilidad. Editar = anular + re-emitir (que el flujo de
   Devolución cubre).
4. **Web admin mantiene capacidad de editar/eliminar** para casos
   excepcionales (con audit log + justificación obligatoria), bajo
   rol ADMIN solamente — esto NO cambia.

### Workflow corregido para escenarios típicos

| Escenario | Acción correcta |
|---|---|
| Cliente cambió de opinión sobre 1 ítem | **Devolución parcial** desde mobile (cajero) |
| Cliente devuelve toda la compra | **Devolución total** desde mobile (cajero) |
| Cajero erró un precio en la venta | **Devolución total** + re-crear venta correcta |
| Cajero sumó cantidad equivocada | Igual: devolución + re-creación |
| Producto inexistente apareció en boleta | ADMIN web: editar venta con audit log |

El módulo de Devoluciones ya existe y funciona en mobile (`apps/mobile/app/(tabs)/mas/devoluciones/`).

---

## 6. Estado de Implementación

### Bloques completados HOY (2026-04-29)

✅ Backup script funcional (`scripts/backup-project.sh`, 138MB en 5s)
✅ VISION.md + ADR-001 + ADR-002 con placeholders genéricos
✅ Memory updated con pivot SaaS decision

### Bloques pendientes (continúa MAÑANA)

🔴 Bloque 3: Branding find/replace en código y docs
   - Aplicar `DyPos CL`, `Pierre Benites Solier`, `Dyon Labs`,
     `private@zgamersa.com` en todos los placeholders.
   - LICENSE actualizado.
   - SECURITY.md con DPO real.
   - README.md profesional.

🔴 Bloque 4: Multi-tenant prep
   - `scripts/provision-tenant.sh` para nuevos clientes.
   - Convenciones de naming (`<cliente-slug>`).

🔴 Bloque 5: UI admin mobile releases + nginx APK en
   `apk-dypos.zgamersa.com`.

🔴 Bloque 6: Mobile editar cliente + editar perfil completo.

🔴 Bloque 7: Deploy a prod.

🔴 Bloque 8: `/session-end` final + push.

---

## 7. Notas para Cowork (sesión mañana)

Al iniciar la próxima sesión:

1. **Cargar este archivo PRIMERO**: contiene toda la dirección
   estratégica.
2. **Cargar `docs/PRICING-STRATEGY.md`** para que Pierre confirme
   los precios.
3. **Continuar desde el Bloque 3** (branding) — tiene mayor
   dependencia downstream.
4. **NO RE-PREGUNTAR** las 8 preguntas. Las respuestas están
   aquí.
5. Verificar que la web actual `dy-pos.zgamersa.com` siga ON y
   funcional — es la demo del owner.

---

> Documento autoritativo. Si algo se modifica, actualizar este
> archivo + commit en mensaje claro.
