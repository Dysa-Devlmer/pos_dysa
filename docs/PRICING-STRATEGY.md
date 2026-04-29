# Estrategia de Precios — DyPos CL

> **Estado**: Recomendación Cowork lista, pendiente confirmación de Pierre.
> **Última actualización**: 2026-04-29.

---

## 1. Contexto del mercado SMB Chile (research 2026)

### Competidores directos

| Producto | Plan más barato | Plan medio | Plan top | E-boleta SII | Mobile offline | Notas |
|---|---|---|---|---|---|---|
| **Bsale** | $19.000/mes (Lite) | $39.000/mes (Pro) | $80.000/mes (Premium) | ❌ Plan extra (~$15k+) | ⚠️ Limitada | Tiene mucho lock-in en ecosistema propio |
| **Defontana** | n/a (no SMB) | $80.000-150.000/mes | $300.000+/mes | ✅ Incluido | ❌ No real | Enterprise SAP-like, no es SMB |
| **Toteat** | $45.000/mes | $80.000/mes | $120.000/mes | ✅ Plan medio+ | ⚠️ Solo iPad | Restaurantes only |
| **MaxiRest** | $60.000/mes | $90.000/mes | $180.000/mes | ✅ Incluido | ⚠️ Web wrapper | Restaurantes |
| **POS Reliant** | $30.000/mes | $50.000/mes | n/a | ⚠️ Plan extra | ❌ No | Simple, gama baja |
| **Square** (USA→CL) | $0 fijo | $0 fijo | $0 fijo | ❌ No tiene | ✅ Sí (iOS/Android) | Cobra ~3% por transacción |
| **Mercado Pago Point** | $0 fijo | $0 fijo | $0 fijo | ⚠️ Limitado a su DTE | ❌ Solo cobro | 2.5%-3.5% por transacción |

### Insights clave

1. **Hueco real de mercado SMB**: el rango $25k-50k/mes con e-boleta SII
   incluida + mobile offline + dashboard NO existe bien cubierto.
   - Bsale Lite $19k no tiene e-boleta.
   - Bsale Pro $39k cobra extra por e-boleta.
   - Toteat solo restaurantes.
   - Defontana es overkill para SMB.

2. **Modelo de comisión por transacción** (Square / Mercado Pago) es atractivo
   por entrada $0 pero **caro a largo plazo**: comerciante con $500k/día en
   ventas paga ~$15k/día = $450k/mes en comisión. Para volumen >$300k
   ventas/mes el modelo de suscripción fija gana.

3. **Setup fee** es desincentivo de entrada — la mayoría de SMB chilenos
   prefieren costo predecible mensual sin barrera inicial.

4. **Onboarding crítico**: el SMB necesita 1-2h de soporte personalizado al
   inicio para configurar productos, RUT, IVA. **Comerciantes pagan por esa
   tranquilidad**.

---

## 2. Posicionamiento estratégico recomendado

**DyPos CL = "Tu POS profesional al precio de la simple"**

Mensaje a prospects:
> "Mismo poder que Defontana ($300k/mes), interface intuitiva como Square
> ($0 entry), e-boleta SII incluida, soporte en español 24/7, todo a precio
> SMB chileno justo."

### Diferenciadores clave a comunicar en sales

1. **e-boleta SII incluida** desde el plan más barato (post F-8)
2. **Mobile offline real** — no se cae si Movistar tiene problema
3. **Dashboard tiempo real** — KPIs profesionales como Defontana
4. **Multi-cajero con turnos** y cierre Z digital
5. **Devoluciones completas** (no solo total, también parcial con ítems)
6. **Soporte en español WhatsApp** (no chat en inglés)
7. **Tu data es tuya**: si te vas, te llevás un dump SQL completo
8. **Sin lock-in tecnológico** (PostgreSQL estándar, no propietario)

---

## 3. Estructura de precios recomendada

### Recomendación principal — modelo "Suscripción mensual + setup gratuito"

| Plan | Precio (CLP/mes) | Target | Incluye |
|---|---|---|---|
| **Starter** | **$24.990** | Comercio chico (1 punto venta) | 1 caja activa simultánea, 2 usuarios (admin + cajero), e-boleta SII (post F-8), web + mobile, dashboard básico, soporte email 24h, hasta 500 ventas/mes |
| **Pro** ⭐ | **$44.990** | Comercio mediano (1-2 sucursales) | 3 cajas, 5 usuarios, e-boleta SII, dashboard avanzado, kardex (post F-12), reportes PDF/Excel, soporte WhatsApp 4h, hasta 5.000 ventas/mes |
| **Business** | **$84.990** | Comercio multi-sucursal | Cajas ilimitadas, usuarios ilimitados, multi-sucursal, API access, branding mobile custom, soporte priority 1h, ventas ilimitadas, onboarding 2h presencial |

### Setup fee — recomendado **GRATIS** (ver razón abajo)

Razones para NO cobrar setup inicial:

1. **Reducir fricción de entrada**: el comerciante decide sin gastarse
   $200k upfront.
2. **Vendor commitment**: si Dyon Labs cobra setup, asume responsabilidad
   pesada upfront. Si lo regala, el cliente prueba 30 días (período
   compromiso) y si no le sirve, puede cancelar sin pleitos.
3. **Ventaja competitiva contra Bsale** (que cobra setup $300k+).

**ALTERNATIVA**: si querés monetizar el setup, cobralo bajo nombre de
"Onboarding Premium" como **add-on opcional** ($150.000) que incluye:
- 4h de configuración asistida en sus instalaciones
- Carga inicial de tu catálogo de productos (hasta 200 SKU)
- Capacitación 2h presencial al equipo
- Personalización de logo en boleta + APK

### Por qué estos precios

**Plan Starter $24.990**:
- Más barato que Bsale Lite ($19.000) **+ e-boleta incluida**.
- Misma altura que POS Reliant simple, **+ mobile offline real**.
- Posiciona DyPos CL como "el ticket de entrada digno".

**Plan Pro $44.990**:
- ~10% más barato que Toteat ($45-50k).
- 50% más barato que Defontana entry.
- Dispositivo de upselling natural desde Starter.

**Plan Business $84.990**:
- Sigue por debajo de Bsale Premium ($80k+).
- Compite directo con Toteat top ($120k).
- Puerta de entrada a clientes "casi enterprise".

---

## 4. Estrategia de lanzamiento

### Fase 1 — Soft launch (mes 1-2)

**Objetivo**: 3 clientes pagantes (early adopters).

**Estrategia**:
- **Plan único**: ofrecer Pro $44.990 a primeros 3 clientes con
  garantía de **precio congelado por 24 meses** ($1.080.000 valor total
  asegurado para vos).
- **Setup GRATIS** confirmado.
- **30 días free trial** sin tarjeta de crédito.
- **WhatsApp directo con Pierre** durante onboarding.

**Por qué Pro y no Starter al inicio**:
- 3 early adopters generan testimonials + casos de uso para landing.
- Plan Pro tiene margen para invertir en pulir features.
- Si los 3 vienen del network del owner (referencias), conversión más fácil.

### Fase 2 — Public launch (mes 3-6)

**Objetivo**: 10 clientes pagantes.

**Estrategia**:
- **Lanzar los 3 planes** públicos con tabla comparativa.
- **Demo permanente** en `dy-pos.zgamersa.com` (la web actual del owner).
- **Landing page** con calculadora "cuánto ahorrarías vs Bsale".
- **Marketing de boca a boca** desde los 3 early adopters (referido =
  $10.000 descuento en el mes siguiente para referente).

### Fase 3 — Crecimiento (mes 7+)

**Objetivo**: 20+ clientes pagantes.

**Estrategia**:
- **Plan Business** ataca SMB grande (multi-sucursal).
- **Partnership con contadores chilenos**: ellos recomiendan DyPos CL
  a sus clientes a cambio de comisión $5.000/cliente/mes durante 6
  meses.
- **Feature requests** de clientes existentes priorizados (community-driven
  roadmap visible).
- Considerar **migración a multi-tenant compartido** según trigger
  ADR-002.

---

## 5. Cálculos de viabilidad económica

### Costo operacional por cliente (estimado)

| Item | Costo mensual |
|---|---|
| VPS Vultr (1 GB / 1 vCPU / 25GB SSD) | $7.000 CLP (~$8 USD) |
| DNS Cloudflare | $0 (free tier) |
| SSL Let's Encrypt | $0 |
| Backup R2 (~5 GB cliente típico) | $1.000 CLP |
| Sentry (proyecto separado) | $0 (free tier hasta 5K events/mes) |
| **TOTAL costo directo** | **~$8.000 CLP/mes** |

### Margen bruto por plan

| Plan | Precio | Costo | Margen | % |
|---|---|---|---|---|
| Starter | $24.990 | $8.000 | $16.990 | 68% |
| Pro | $44.990 | $8.000 | $36.990 | 82% |
| Business | $84.990 | $12.000 (más recursos) | $72.990 | 86% |

### Soporte humano (variable)

- Cliente Starter típico: ~2h soporte/mes → ~$10.000 costo
  (a $5.000/h propio o tercerizado).
- Cliente Pro: ~3h soporte/mes → ~$15.000.
- Cliente Business: ~5h soporte/mes → ~$25.000.

**Margen NETO post-soporte**:
- Starter: $7.000 (28%)
- Pro: $22.000 (49%)
- Business: $48.000 (56%)

### Punto de equilibrio del owner

Asumiendo costo fijo Dyon Labs $300.000/mes (servidor base + admin time
+ herramientas), need:
- **3 clientes Pro pagantes** para break-even.
- A partir del 4to cliente Pro = profit.

---

## 6. Decisiones pendientes para Pierre

Las siguientes requieren confirmación final del owner antes de aplicar:

- [ ] ¿Confirmar precios $24.990 / $44.990 / $84.990 o ajustar?
- [ ] ¿Cobrar setup como Onboarding Premium $150k opcional o no
  cobrar nada?
- [ ] ¿Qué método de cobro? (Webpay Plus vs MercadoPago suscripciones
  vs Stripe vs facturar manual al inicio).
- [ ] ¿Período mínimo de compromiso? (1 mes / 3 meses / 12 meses
  con descuento).
- [ ] ¿Qué política de cancelación? (notificación 7 días vs cancelación
  inmediata con prorrata).

---

## 7. Estrategia anti-Bsale específica

Bsale es el competidor #1 directo (mismo target SMB, mismo país).
Ataque puntual:

1. **Calculadora pública** en `dy-pos.zgamersa.com/calculadora`:
   "Andás con Bsale Pro $39k + Plan e-boleta $15k = $54k/mes. Con
   DyPos CL Pro: $44.990. Ahorrás $9.010/mes = $108.120/año."

2. **Comparativa landing** Bsale vs DyPos CL feature-by-feature
   (sin difamación, datos públicos).

3. **Migración asistida**: ofrecer carga gratuita de catálogo desde
   export Bsale (CSV de productos + clientes) — como descontento
   typical de usuarios Bsale es lock-in en su data, esto es
   diferenciador grande.

---

> Documento de strategy. Mantener actualizado conforme cambien las
> condiciones del mercado o aparezca research nuevo.
