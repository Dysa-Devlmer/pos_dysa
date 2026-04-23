import sharp from "/Users/devlmer/Dysa-Projects/system_pos/apps/web/node_modules/sharp/lib/index.js";
import { mkdirSync } from "node:fs";

/**
 * Procesa las 7 imágenes generadas en Gemini → 8 assets finales del sistema.
 *
 * Pasos por cada imagen:
 *  1. Recortar watermark ✦ de la esquina inferior derecha (composite dest-out
 *     con rect transparente — si el fondo no es sólido; si es sólido naranjo,
 *     se rellena con el color exacto).
 *  2. Resize al tamaño target con lanczos3.
 *  3. Guardar PNG optimizado.
 *
 * Para el foreground de Android, además se inserta el Dy dentro de un canvas
 * transparente más grande para respetar la safe zone del 66%.
 */

const SRC = "/Users/devlmer/Dysa-Projects/system_pos/img-nano";
const MOBILE = "/Users/devlmer/Dysa-Projects/system_pos/apps/mobile/assets/images";
const WEB = "/Users/devlmer/Dysa-Projects/system_pos/apps/web/public";

mkdirSync(MOBILE, { recursive: true });
mkdirSync(WEB, { recursive: true });

// --- Helpers ---

/** Borra el watermark ✦ de la esquina inferior derecha dejando transparencia.
 *  Estrategia: crop el 10% inferior-derecho y rellenar con transparencia.
 *  Como el watermark está fuera del Dy (en padding), no se pierde contenido. */
async function removeWatermark(inputPath) {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width;
  const h = meta.height;
  const wmSize = Math.round(Math.max(w, h) * 0.2);
  // Creamos un PNG del tamaño del watermark que es transparente puro
  const eraser = await sharp({
    create: { width: wmSize, height: wmSize, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .png()
    .toBuffer();
  return sharp(inputPath).composite([
    { input: eraser, left: w - wmSize, top: h - wmSize, blend: "dest-out" },
  ]);
}

/** Para fondo sólido: cubre watermark con gradiente naranjo que matchea el original */
async function paintWatermark(inputPath) {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width;
  const h = meta.height;
  const wmSize = Math.round(Math.max(w, h) * 0.13);
  // Creamos un parche con gradiente naranjo del tamaño necesario
  const patch = await sharp({
    create: {
      width: wmSize,
      height: wmSize,
      channels: 4,
      background: { r: 234, g: 88, b: 12, alpha: 1 }, // #ea580c (bottom del gradiente)
    },
  })
    .png()
    .toBuffer();
  return sharp(inputPath).composite([
    { input: patch, left: w - wmSize, top: h - wmSize, blend: "over" },
  ]);
}

async function finalize(pipeline, outPath, size) {
  // Materializa primero a buffer para evitar problemas de orden resize+composite en sharp
  const buf = await pipeline.png().toBuffer();
  await sharp(buf).resize(size, size, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`  ✓ ${outPath}`);
}

// --- Procesamiento ---

const HERO = `${SRC}/Gemini_Generated_Image_fin9pbfin9pbfin9.png`;
const SPLASH = `${SRC}/Gemini_Generated_Image_kdr29jkdr29jkdr2.png`;
const FOREGROUND_SRC = `${SRC}/Gemini_Generated_Image_rfk7w5rfk7w5rfk7.png`;
const MONOCHROME = `${SRC}/Gemini_Generated_Image_ncm642ncm642ncm6.png`;
const FAVICON = `${SRC}/Gemini_Generated_Image_p6l0q0p6l0q0p6l0.png`;
const IRIDESCENT = `${SRC}/Gemini_Generated_Image_fvz7bcfvz7bcfvz7.png`;
const BACKGROUND = `${SRC}/Gemini_Generated_Image_6h1b2e6h1b2e6h1b.png`;

console.log("\n📱 Mobile assets:");

/** Los PNG de Gemini NO tienen transparencia real — el "checker pattern" es pintado.
 *  Esta función hace chroma-key del fondo ajedrezado gris/negro → transparente. */
async function chromaKey(pipeline) {
  const rawBuf = await pipeline.png().toBuffer();
  const { data, info } = await sharp(rawBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const isGray = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;
    const isDark = r + g + b < 600;
    const notOrange = r < 200 || g > 150;
    if (isGray && isDark && notOrange) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

/** Chroma-key + máscara squircle. Para íconos con fondo squircle naranjo. */
async function squircleMask(pipeline, padding = 0.07) {
  const cleaned = await chromaKey(pipeline);
  const buf = await cleaned.png().toBuffer();
  const meta = await sharp(buf).metadata();
  const w = meta.width;
  const pad = Math.round(w * padding);
  const squircleSize = w - pad * 2;
  const r = Math.round(squircleSize * 0.225);
  const maskSvg = Buffer.from(
    `<svg width="${w}" height="${w}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${pad}" y="${pad}" width="${squircleSize}" height="${squircleSize}" rx="${r}" ry="${r}" fill="white"/>
    </svg>`,
  );
  const mask = await sharp(maskSvg).png().toBuffer();
  return sharp(buf).composite([{ input: mask, blend: "dest-in" }]);
}

// 1. icon.png (1024) — hero sobre squircle (con máscara para eliminar artefactos externos)
await finalize(await squircleMask(await removeWatermark(HERO)), `${MOBILE}/icon.png`, 1024);

// 2. splash-icon.png (1024) — Dy perla transparente (chroma-key para eliminar checker falso)
await finalize(await chromaKey(await removeWatermark(SPLASH)), `${MOBILE}/splash-icon.png`, 1024);

// 3. android-icon-foreground.png (512) — Dy con safe zone 66% + chroma-key
{
  const cleanedBuf = await (await chromaKey(await removeWatermark(FOREGROUND_SRC))).png().toBuffer();
  // Trim para ajustar el bounding box del Dy al contenido real (sin padding residual)
  const trimmed = await sharp(cleanedBuf).trim({ threshold: 10 }).toBuffer();
  const buf = await sharp(trimmed).resize(318, 318, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: buf, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(`${MOBILE}/android-icon-foreground.png`);
  console.log(`  ✓ ${MOBILE}/android-icon-foreground.png`);
}

// 4. android-icon-background.png (512) — gradiente naranjo generado programáticamente
// No uso el PNG original porque el watermark crea un parche visible; es solo un gradiente.
{
  const bgSvg = Buffer.from(
    `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f97316"/>
          <stop offset="1" stop-color="#ea580c"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#g)"/>
    </svg>`,
  );
  await sharp(bgSvg).png({ compressionLevel: 9 }).toFile(`${MOBILE}/android-icon-background.png`);
  console.log(`  ✓ ${MOBILE}/android-icon-background.png`);
}

// 5. android-icon-monochrome.png (432) — silueta blanca pura (alpha mask) + safe zone
// Para Android 13+, lo único que importa es el canal alpha. Construimos una máscara
// basada en brillo (grayscale): pixels claros → blanco opaco, oscuros → transparente.
{
  const cleaned = await removeWatermark(MONOCHROME);
  const buf = await cleaned.png().toBuffer();
  // Convertir a grayscale y usar como alpha mask sobre fondo blanco puro
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    const origAlpha = pixels[i + 3];
    // Pixel es "contenido" si es brillante Y tiene alpha
    const isContent = brightness > 180 && origAlpha > 128;
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = isContent ? 255 : 0;
  }
  const mask = await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  // Trim zonas transparentes y recentrar con safe zone
  const trimmed = await sharp(mask).trim({ threshold: 1 }).toBuffer();
  const scaled = await sharp(trimmed)
    .resize(270, 270, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: { width: 432, height: 432, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: scaled, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(`${MOBILE}/android-icon-monochrome.png`);
  console.log(`  ✓ ${MOBILE}/android-icon-monochrome.png`);
}

// 6. favicon.png (48) — solo D (con máscara squircle)
await finalize(await squircleMask(await removeWatermark(FAVICON)), `${MOBILE}/favicon.png`, 48);

console.log("\n🌐 Web assets:");

// 7. icon-192.png
await finalize(await squircleMask(await removeWatermark(HERO)), `${WEB}/icon-192.png`, 192);
// 8. icon-512.png
await finalize(await squircleMask(await removeWatermark(HERO)), `${WEB}/icon-512.png`, 512);

// 9. BONUS: dy-iridescent.png (para secciones especiales web — chroma-keyed)
await finalize(await chromaKey(await removeWatermark(IRIDESCENT)), `${WEB}/dy-iridescent-512.png`, 512);
await finalize(await chromaKey(await removeWatermark(IRIDESCENT)), `${WEB}/dy-iridescent-1024.png`, 1024);

console.log("\n✅ Procesamiento completo.");
