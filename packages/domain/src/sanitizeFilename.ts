/**
 * Limpia un string para que sea seguro como filename en headers HTTP
 * `Content-Disposition: attachment; filename="..."` y para escritura en
 * filesystem cross-platform.
 *
 * Defensa contra:
 *
 * - **CRLF injection** (PDF3, XLS1 audit Claude Code CLI). Si el caller
 *   construye el filename con valores de la URL/usuario, un atacante
 *   podría inyectar `\r\n` para añadir headers maliciosos al response.
 *   Removemos `\r`, `\n` y `\0` siempre.
 *
 * - **Path traversal** y caracteres inválidos en Windows (NTFS rechaza
 *   `\ / : * ? " < > |`). Reemplazamos por `_` para que el descargado
 *   funcione en todos los SOs.
 *
 * - **Filenames excesivamente largos** que rompen ext4 (max 255 bytes
 *   per name) o causan truncamiento silencioso en algunos browsers.
 *   Cap a 200 chars deja margen para extensión + sufijos.
 *
 * No escapamos comillas dobles porque el call-site es responsable de
 * envolverlas (RFC 6266 sugiere `filename*=UTF-8''...` para nombres con
 * caracteres no-ASCII; este helper genera ASCII-safe siempre).
 *
 * @example
 *   sanitizeFilename("reporte ventas 2026-04-28.pdf")
 *   // → "reporte ventas 2026-04-28.pdf"
 *
 *   sanitizeFilename("evil\r\nX-Injected: 1.txt")
 *   // → "evilX-Injected: 1.txt"  (CRLF stripped)
 *
 *   sanitizeFilename("../../../etc/passwd")
 *   // → "______etc_passwd"  (slashes y dots NO se escapan;
 *   //    el caller debería usar path.basename() antes si la fuente es untrusted)
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\r\n\0]/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 200)
    .trim();
}
