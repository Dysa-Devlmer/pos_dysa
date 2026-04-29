# Política de Seguridad — DyPos CL

## Reportar una vulnerabilidad

Tomamos la seguridad de DyPos CL muy en serio. Si descubriste una
vulnerabilidad, **NO la divulgues públicamente** (en GitHub Issues, foros,
redes sociales). Reportala de forma privada para que podamos investigar
y publicar un fix antes de que sea explotada.

### Canal autorizado

**Email**: `private@zgamersa.com`
**Asunto**: `[SECURITY] Breve descripción de la vulnerabilidad`
**DPO/Receptor**: Pierre Benites Solier — Dyon Labs

### Información a incluir

Cuanta más información, más rápido podemos responder:

- Tipo de vulnerabilidad (XSS, SQL injection, auth bypass, etc.)
- Componente afectado (web / mobile / API / infrastructure)
- Pasos para reproducir
- Impacto potencial (data leak, takeover, denial of service)
- Versión del sistema donde lo encontraste (commit SHA si tenés acceso)
- Tu identidad para acreditarte en el patch (opcional)

### Tiempo de respuesta esperado

| Severidad | First response | Patch deploy |
|---|---|---|
| **Crítica** (RCE, auth bypass, data leak) | 24h | 7 días |
| **Alta** (XSS, CSRF, leak limitado) | 72h | 14 días |
| **Media** (info disclosure menor, DoS) | 7 días | 30 días |
| **Baja** (best practices, hardening) | 14 días | next release |

Si no recibís respuesta en el plazo indicado, podés escalar reenviando
con `[ESCALATION]` en el subject.

## Alcance (scope)

**EN SCOPE** (reportable):

- ✅ Aplicación web (`*.zgamersa.com` y deployments de clientes)
- ✅ App móvil DyPos CL Android (APK distribuido por
  `apk-dypos.zgamersa.com`)
- ✅ API REST (`/api/v1/*`, `/api/mobile/*`)
- ✅ Endpoints de auth (login, password reset, JWT validation)
- ✅ Server actions de Next.js
- ✅ Schema y migraciones de base de datos
- ✅ Scripts de despliegue (`scripts/deploy.sh`, `scripts/provision-tenant.sh`)
- ✅ Configuración Docker / nginx / Cloudflare

**FUERA DE SCOPE** (NO reportable como vulnerabilidad):

- ❌ Versiones beta, demos, branches no-`main`
- ❌ Bibliotecas de terceros (esos van al upstream)
- ❌ Vulnerabilidades que requieren acceso físico al device del usuario
- ❌ Self-XSS (requiere que el usuario se exploite a sí mismo)
- ❌ Reportes generados por scanners automatizados sin verificación manual
- ❌ Best practices SEO / accesibility (no son seguridad)
- ❌ Vulnerabilidades en infraestructura de terceros (Vultr, Cloudflare, etc.)
  — esas van directo al proveedor, no a nosotros.

## Compromiso de Dyon Labs

Cuando recibimos un reporte válido nos comprometemos a:

1. **Acusar recibo** dentro del SLA arriba.
2. **Investigar** seriamente (no descartar sin análisis).
3. **Mantenerte informado** del progreso semanalmente.
4. **Patch + deploy** según severidad.
5. **Acreditarte públicamente** en el changelog del fix (si querés).
6. **NO emprender acciones legales** contra reportes hechos de buena fe
   bajo esta política, mientras no haya:
   - Acceso a datos de clientes ajenos al investigador.
   - Modificación / destrucción de datos.
   - Interrupción del servicio (DoS).
   - Solicitud de extorsión / ransomware.

## Cumplimiento normativo

DyPos CL opera bajo:

- **Ley 19.628** (Protección de la Vida Privada de Chile)
- **Ley 21.719** (Protección de Datos Personales — vigente 2026)
- **Ley 19.220** (Mercado de Valores, donde aplique)
- **Servicio de Impuestos Internos (SII)** — para integraciones DTE
  cuando F-8 esté activo

El **Data Protection Officer (DPO)** designado por Dyon Labs es:

> Pierre Benites Solier — `private@zgamersa.com`

Cumpliendo Art. 14 Ley 21.719, el DPO recibe:
- Solicitudes ARCOP+ de titulares (Acceso, Rectificación, Cancelación,
  Oposición, Portabilidad, no decisiones automatizadas).
- Notificaciones de breach internas y externas.
- Consultas regulatorias.

## Hall of Fame (a futuro)

Investigadores que hayan contribuido vulnerabilidades válidas serán
reconocidos aquí (con su consentimiento):

> _Aún sin entradas — sé el primero._

## Política PGP/GPG

(A configurar en próximas iteraciones — por ahora email cifrado opcional
via ProtonMail desde el lado del reporter si se desea).

---

> Esta política se actualiza periódicamente. Versión vigente: 1.0 —
> 2026-04-29.
