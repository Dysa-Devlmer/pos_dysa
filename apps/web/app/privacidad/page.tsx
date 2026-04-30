import type { Metadata } from "next";

/**
 * Política de Privacidad — DyPos CL.
 *
 * Página pública bajo `/privacidad` (excluida del middleware NextAuth).
 * Contenido renderizado como JSX estático: sin fs.readFile, sin MDX, sin
 * dependencias de runtime. El Dockerfile standalone no incluye docs/ al
 * bundle, y `process.cwd()` en el container apunta a /app — cualquier
 * approach con lectura de filesystem rompe en prod.
 *
 * Placeholders pendientes de confirmación legal:
 *   - Razón social, RUT, domicilio de Dysa
 *   - Nombre + teléfono del DPO designado
 *
 * Ver docs/privacy-rollout-plan.md Fase A.3 y el skill
 * `.claude/skills/privacy-compliance/` para contexto completo.
 */

export const metadata: Metadata = {
  title: "Política de Privacidad — DyPos CL",
  description:
    "Política de Privacidad y tratamiento de datos personales de DyPos CL conforme a la Ley N° 19.628 y Ley N° 21.719 de Chile.",
  robots: { index: true, follow: true },
};

// Datos parametrizables — un solo punto de edición cuando legal Dysa
// confirme los valores definitivos. Los placeholders entre corchetes son
// VISIBLES intencionalmente en la página mientras esté en revisión.
const DYSA = {
  razonSocial: "[Dysa SpA — pendiente confirmación legal]",
  rut: "[XX.XXX.XXX-X — pendiente]",
  domicilio: "[Dirección legal pendiente]",
  comuna: "[Comuna pendiente]",
  ciudad: "Santiago",
  contactoGeneral: "contacto@dysa.cl",
  emailDPO: "privacidad@dysa.cl",
  telefonoDPO: "[teléfono pendiente]",
  nombreDPO: "[Nombre DPO pendiente]",
  sitio: "https://dy-pos.zgamersa.com",
  version: "1.0-draft",
  ultimaActualizacion: "23 de abril de 2026",
};

export default function PrivacidadPage() {
  return (
    <main className="bg-background min-h-screen py-12">
      <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl px-4">
        {/* Banner editorial — NO remover hasta que abogado Dysa apruebe v1.0 final */}
        <aside className="not-prose mb-8 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="m-0 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
            <strong>Borrador en revisión legal.</strong> Los campos entre{" "}
            <code className="rounded bg-amber-500/10 px-1">[corchetes]</code>{" "}
            están pendientes de confirmación por el equipo legal de Dysa antes
            de la publicación oficial. Versión actual:{" "}
            <strong>{DYSA.version}</strong>. Para consultas sobre esta política:{" "}
            <a href={`mailto:${DYSA.emailDPO}`} className="underline">
              {DYSA.emailDPO}
            </a>
            .
          </p>
        </aside>

        <h1>Política de Privacidad — DyPos CL</h1>

        <p>
          <strong>Versión:</strong> {DYSA.version}
          <br />
          <strong>Última actualización:</strong> {DYSA.ultimaActualizacion}
        </p>

        <p>
          En <strong>{DYSA.razonSocial}</strong> respetamos su privacidad y nos
          tomamos en serio la protección de sus datos personales. Esta Política
          describe cómo recopilamos, usamos, compartimos y protegemos sus datos
          cuando utiliza <strong>DyPos CL</strong> (en adelante, el
          &ldquo;Servicio&rdquo;), disponible en el sitio web{" "}
          <a href={DYSA.sitio}>{DYSA.sitio}</a>.
        </p>

        <p>
          Esta Política cumple con la <strong>Ley N° 19.628</strong> sobre
          Protección de la Vida Privada y la <strong>Ley N° 21.719</strong>{" "}
          sobre Protección de Datos Personales de la República de Chile.
        </p>

        <h2>1. Responsable del tratamiento</h2>
        <p>El tratamiento de sus datos personales es realizado por:</p>
        <ul>
          <li>
            <strong>Razón Social:</strong> {DYSA.razonSocial}
          </li>
          <li>
            <strong>RUT:</strong> {DYSA.rut}
          </li>
          <li>
            <strong>Domicilio:</strong> {DYSA.domicilio}, {DYSA.comuna},{" "}
            {DYSA.ciudad}, Chile
          </li>
          <li>
            <strong>Contacto:</strong>{" "}
            <a href={`mailto:${DYSA.contactoGeneral}`}>
              {DYSA.contactoGeneral}
            </a>
          </li>
        </ul>

        <h2>2. Delegado de Protección de Datos (DPO)</h2>
        <p>
          Para consultas o ejercicio de derechos sobre sus datos personales:
        </p>
        <ul>
          <li>
            <strong>Nombre:</strong> {DYSA.nombreDPO}
          </li>
          <li>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${DYSA.emailDPO}`}>{DYSA.emailDPO}</a>
          </li>
          <li>
            <strong>Teléfono:</strong> {DYSA.telefonoDPO}
          </li>
        </ul>
        <p>
          El DPO responderá cualquier consulta en un plazo máximo de{" "}
          <strong>10 días hábiles</strong>.
        </p>

        <h2>3. Finalidades del tratamiento</h2>
        <p>Tratamos sus datos personales exclusivamente para:</p>
        <ol>
          <li>
            <strong>Emisión de boleta electrónica</strong> ante el Servicio de
            Impuestos Internos (SII).
          </li>
          <li>
            <strong>Gestión de la relación comercial</strong>: historial de
            compras, devoluciones, garantías y atención al cliente.
          </li>
          <li>
            <strong>Cumplimiento de obligaciones legales</strong>: conservación
            contable y responsabilidad por producto (Ley N° 19.496).
          </li>
          <li>
            <strong>Mejora del servicio</strong>: reportes técnicos de errores
            y análisis anonimizado, cuando usted lo consiente.
          </li>
          <li>
            <strong>Ejercicio o defensa de reclamos</strong> ante autoridades
            administrativas o judiciales.
          </li>
        </ol>
        <p>
          <strong>NO tratamos sus datos</strong> para venta a terceros, marketing
          comportamental, scoring crediticio, ni decisiones automatizadas con
          efectos jurídicos significativos.
        </p>

        <h2>4. Base legal del tratamiento</h2>
        <p>
          Conforme al artículo 12 de la Ley N° 21.719, cada finalidad se apoya
          en:
        </p>
        <ul>
          <li>
            Emisión de boleta SII → <em>obligación legal</em> (DS 828).
          </li>
          <li>
            Gestión comercial → <em>ejecución de contrato</em>.
          </li>
          <li>
            Reportes técnicos → <em>interés legítimo</em> del responsable.
          </li>
          <li>
            Análisis de uso → <em>consentimiento expreso</em> (opt-in).
          </li>
        </ul>

        <h2>5. Categorías de datos personales</h2>
        <p>
          <strong>De clientes retail</strong>: RUT, nombre completo, email,
          teléfono y dirección (estos últimos opcionales), historial de
          compras, devoluciones, métodos de pago (sin datos de tarjeta).
        </p>
        <p>
          <strong>De empleados con acceso al sistema</strong>: email, contraseña
          almacenada como hash criptográfico (bcrypt), rol
          (administrador/cajero/vendedor), actividad en el sistema.
        </p>
        <p>
          <strong>Datos técnicos</strong>: identificadores de sesión y
          dispositivo, dirección IP, tipo de dispositivo, versión de
          aplicación, logs técnicos.
        </p>
        <p>
          <strong>NO tratamos datos sensibles</strong> (origen étnico, creencia
          religiosa, salud, orientación sexual, afiliación política o sindical,
          datos biométricos o genéticos).
        </p>

        <h2>6. Categorías de titulares</h2>
        <ul>
          <li>
            Clientes de locales que utilizan DyPos CL (personas naturales).
          </li>
          <li>Empleados autorizados para operar el Servicio.</li>
          <li>Visitantes del sitio web público.</li>
        </ul>

        <h2>7. Destinatarios y subprocesadores</h2>
        <p>
          Sus datos pueden ser compartidos con los siguientes encargados del
          tratamiento, quienes los procesan por nuestra cuenta bajo contratos
          de tratamiento de datos (DPA):
        </p>
        <ul>
          <li>
            <strong>Cloudflare, Inc.</strong> (Estados Unidos) — Red de
            distribución de contenido y protección DDoS.
          </li>
          <li>
            <strong>The Constant Company LLC (Vultr)</strong> (servidor en
            Santiago, Chile).
          </li>
          <li>
            <strong>Functional Software, Inc. (Sentry)</strong> (Estados
            Unidos) — Monitoreo de errores técnicos.
          </li>
          <li>
            <strong>Upstash, Inc.</strong> (Estados Unidos) — Rate limiting
            con retención de 15 minutos.
          </li>
        </ul>
        <p>
          <strong>Destinatarios por obligación legal</strong>: Servicio de
          Impuestos Internos (boletas emitidas); Tribunales de Justicia (bajo
          requerimiento judicial válido).
        </p>

        <h2>8. Transferencias internacionales</h2>
        <p>
          Algunos subprocesadores almacenan datos fuera de Chile (principalmente
          Estados Unidos). Estas transferencias se realizan bajo{" "}
          <strong>Cláusulas Contractuales Tipo</strong> (SCC) firmadas con cada
          encargado, conforme al artículo 27 de la Ley N° 21.719. Usted puede
          solicitar copia de estas cláusulas escribiendo a {DYSA.emailDPO}.
        </p>

        <h2>9. Plazos de conservación</h2>
        <p>Conservamos sus datos por los siguientes plazos:</p>
        <ul>
          <li>
            Identificación asociada a boleta (RUT, nombre):{" "}
            <strong>6 años</strong> (obligación SII).
          </li>
          <li>
            Contacto sin venta asociada: máximo <strong>12 meses</strong>.
          </li>
          <li>
            Historial de compras: <strong>6 años</strong> (obligación SII).
          </li>
          <li>
            Contraseña (hash): mientras la cuenta esté activa.
          </li>
          <li>
            Logs de acceso: <strong>90 días</strong>.
          </li>
          <li>
            Crash reports (Sentry): <strong>90 días</strong>.
          </li>
          <li>
            Registros de consentimiento: <strong>4 años</strong>.
          </li>
        </ul>
        <p>
          Cumplido el plazo, los datos se eliminan o pseudonimizan de forma
          irreversible, salvo obligación legal vigente.
        </p>

        <h2>10. Sus derechos (ARCOP+)</h2>
        <p>
          Conforme a los artículos 6 a 11 de la Ley N° 21.719, usted tiene
          derecho a:
        </p>
        <ul>
          <li>
            <strong>Acceso</strong>: conocer qué datos tratamos sobre usted.
          </li>
          <li>
            <strong>Rectificación</strong>: corregir datos inexactos.
          </li>
          <li>
            <strong>Cancelación (supresión)</strong>: solicitar su eliminación,
            sujeta a obligaciones legales (SII: 6 años).
          </li>
          <li>
            <strong>Oposición</strong>: oponerse al tratamiento por interés
            legítimo.
          </li>
          <li>
            <strong>Portabilidad</strong>: recibir sus datos en formato
            estructurado (JSON/CSV).
          </li>
          <li>
            <strong>Bloqueo / limitación</strong>: suspender el tratamiento
            mientras se resuelve una controversia.
          </li>
        </ul>
        <p>
          <strong>Cómo ejercer estos derechos</strong>: envíe un email a{" "}
          <a href={`mailto:${DYSA.emailDPO}`}>{DYSA.emailDPO}</a> indicando
          nombre completo, RUT, derecho que ejerce, y copia de su cédula de
          identidad. Responderemos en un plazo máximo de{" "}
          <strong>10 días hábiles</strong>. El ejercicio es gratuito.
        </p>

        <h2>11. Medidas de seguridad</h2>
        <p>Implementamos medidas técnicas y organizativas apropiadas:</p>
        <ul>
          <li>Comunicaciones cifradas en tránsito (TLS 1.3, HTTPS).</li>
          <li>
            Contraseñas almacenadas con hash criptográfico (bcrypt, factor 12).
          </li>
          <li>Control de acceso basado en roles (RBAC).</li>
          <li>Rate limiting y bloqueo de intentos no autorizados.</li>
          <li>Pseudonimización de identificadores en logs y telemetría.</li>
          <li>Backups cifrados con retención limitada.</li>
          <li>
            Procedimiento documentado de respuesta a incidentes de seguridad.
          </li>
        </ul>
        <p>
          En caso de brecha de seguridad que pueda afectar sus derechos, le
          notificaremos dentro de las <strong>72 horas</strong> siguientes a
          su detección, conforme al artículo 37 de la Ley N° 21.719.
        </p>

        <h2>12. Tratamiento automatizado</h2>
        <p>
          DyPos CL <strong>no realiza</strong> decisiones automatizadas con
          efectos jurídicos significativos (crédito, contratación, beneficios).
          El sistema utiliza reglas automáticas solo para funciones operativas
          internas (alertas de stock bajo), que no afectan sus derechos.
        </p>

        <h2>13. Cambios a esta Política</h2>
        <p>
          Podremos actualizar esta Política para reflejar cambios legales,
          tecnológicos u operacionales. Los cambios sustanciales serán
          notificados con al menos <strong>30 días</strong> de anticipación
          mediante aviso en la aplicación, email a titulares con contacto
          registrado, y banner en el sitio público. La fecha de la última
          actualización aparece al inicio de este documento.
        </p>

        <h2>14. Contacto y reclamos</h2>
        <p>
          <strong>Para consultas generales</strong>:{" "}
          <a href={`mailto:${DYSA.emailDPO}`}>{DYSA.emailDPO}</a>
        </p>
        <p>
          <strong>Para reclamos formales</strong>: puede plantear su reclamo
          inicialmente ante nosotros en el email anterior. Si no obtiene
          respuesta satisfactoria, puede acudir ante la <strong>
            Agencia de Protección de Datos Personales
          </strong>{" "}
          cuando esté en funcionamiento (previsto diciembre de 2026), o ante
          los Tribunales Civiles conforme a la Ley N° 19.628.
        </p>

        <h2>15. Legislación aplicable</h2>
        <p>Esta Política se rige por las leyes de la República de Chile:</p>
        <ul>
          <li>Ley N° 19.628 sobre Protección de la Vida Privada.</li>
          <li>Ley N° 21.719 sobre Protección de Datos Personales.</li>
          <li>Ley N° 19.496 de Protección del Consumidor.</li>
          <li>Decreto Supremo 828 y normativa SII sobre boleta electrónica.</li>
        </ul>
        <p>
          Cualquier controversia se somete a la jurisdicción de los Tribunales
          Ordinarios de Justicia de {DYSA.ciudad}.
        </p>

        <hr />

        <p className="text-muted-foreground text-sm">
          <strong>Última actualización:</strong> {DYSA.ultimaActualizacion} ·{" "}
          <strong>Versión:</strong> {DYSA.version}
        </p>
      </article>
    </main>
  );
}
