import sharp from "/Users/devlmer/Dysa-Projects/system_pos/apps/web/node_modules/sharp/lib/index.js";
import { writeFileSync, mkdirSync } from "node:fs";

/**
 * Dyon — generador FINAL de assets móvil.
 *
 * Produce los 6 PNGs que exige M7:
 *   1. icon.png                         1024×1024  squircle gradient, Dy blanco
 *   2. splash-icon.png                  1024×1024  Dy naranjo sobre transparente
 *   3. android-icon-foreground.png       512×512   Dy blanco sobre transparente (safe zone 66%)
 *   4. android-icon-background.png       512×512   gradiente naranjo plano
 *   5. android-icon-monochrome.png       432×432   silueta blanca transparente
 *   6. favicon.png                        48×48    D simplificada (y no sobrevive)
 *
 * Primitivas (D, y) compartidas — misma geometría en todas las variantes para
 * consistencia visual. Colores exactos: #f97316 / #ea580c / #FFFFFF.
 */

const WEB_PUBLIC = "/Users/devlmer/Dysa-Projects/system_pos/apps/web/public";
const MOBILE_ASSETS = "/Users/devlmer/Dysa-Projects/system_pos/apps/mobile/assets/images";

// === Primitiva: D geométrica ===
function drawD({ cx, cy, height, color = "#FFFFFF", strokeFactor = 0.28 }) {
  const H = height;
  const stroke = Math.round(H * strokeFactor);
  const W = Math.round(H * 0.92);
  const xLeft = cx - W / 2;
  const xRight = cx + W / 2;
  const dTop = cy - H / 2;
  const dBottom = cy + H / 2;
  const outerRadiusR = H / 2;
  const outerCurveStart = xRight - outerRadiusR;

  const innerTop = dTop + stroke;
  const innerBottom = dBottom - stroke;
  const innerHeight = innerBottom - innerTop;
  const innerRadius = innerHeight / 2;
  const innerLeft = xLeft + stroke;
  const innerRight = xRight - stroke;
  const innerCurveStart = innerRight - innerRadius;

  const outer = `M ${xLeft} ${dTop} L ${outerCurveStart} ${dTop} A ${outerRadiusR} ${outerRadiusR} 0 0 1 ${outerCurveStart} ${dBottom} L ${xLeft} ${dBottom} Z`;
  const inner = `M ${innerLeft} ${innerTop} L ${innerCurveStart} ${innerTop} A ${innerRadius} ${innerRadius} 0 0 1 ${innerCurveStart} ${innerBottom} L ${innerLeft} ${innerBottom} Z`;
  return {
    svg: `<path d="${outer} ${inner}" fill="${color}" fill-rule="evenodd"/>`,
    width: W,
    stroke,
  };
}

// === Primitiva: y geométrica ===
function drawY({ cx, yTop, height, color = "#FFFFFF", strokeFactor = 0.24, descenderExtra = 0.5 }) {
  const H = height;
  const stroke = Math.round(H * strokeFactor);
  const W = Math.round(H * 0.85);
  const xLeft = cx - W / 2;
  const xRight = cx + W / 2;
  const yBottom = yTop + H;
  const convergeX = cx;
  const convergeY = yTop + H * 0.55;
  const descBottom = yBottom + H * descenderExtra;

  const leftStem = `<polygon points="${xLeft},${yTop} ${xLeft + stroke},${yTop} ${convergeX + stroke / 2},${convergeY} ${convergeX - stroke / 2},${convergeY}" fill="${color}"/>`;
  const rightStem = `<polygon points="${xRight - stroke},${yTop} ${xRight},${yTop} ${convergeX + stroke / 2},${descBottom} ${convergeX - stroke / 2},${descBottom}" fill="${color}"/>`;
  return { svg: leftStem + rightStem, width: W, stroke };
}

// === Lockup Dy (ligadura — Variante B) ===
// Produce el bloque Dy centrado dentro de un viewBox dado, con opción de color
// y opción de "contenerlo en safe-zone" (para Android adaptive foreground).
function dyLockup({
  size,
  color = "#FFFFFF",
  safeZone = false, // si true, reduce el tamaño para caber en el 66% interior
  bleed = 1.0, // multiplicador adicional sobre la altura base
}) {
  const scale = safeZone ? 0.62 : 1.0;
  const baseH = size * 0.46 * scale * bleed; // altura de la D — deja padding cómodo
  const dH = Math.round(baseH);
  const yH = Math.round(dH * 0.65); // y más chica que D (proporción x-height ~0.65)

  const dW = Math.round(dH * 0.92);
  const yW = Math.round(yH * 0.85);
  const overlap = Math.round(size * 0.008); // mini-gap (ligadura = casi tocándose)
  const totalW = dW + yW - overlap;
  const blockLeft = (size - totalW) / 2;
  const dCx = blockLeft + dW / 2;
  const yCx = blockLeft + dW - overlap + yW / 2;

  // Baseline común (pie de D y de y sin descendente) — optical center, ligeramente sobre medio
  const baselineY = size * 0.56;
  const dCy = baselineY - dH / 2;
  const yTop = baselineY - yH;

  const dPart = drawD({ cx: dCx, cy: dCy, height: dH, color });
  const yPart = drawY({ cx: yCx, yTop, height: yH, color, descenderExtra: 0.45 });
  return dPart.svg + yPart.svg;
}

// === Backgrounds ===
function gradientSquircle(size) {
  const r = Math.round(size * 0.225);
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f97316"/>
        <stop offset="1" stop-color="#ea580c"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  `;
}

function gradientSolidRect(size) {
  return `
    <defs>
      <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f97316"/>
        <stop offset="1" stop-color="#ea580c"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg2)"/>
  `;
}

function flatSquircle(size, color) {
  const r = Math.round(size * 0.225);
  return `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${color}"/>`;
}

// === D solo para favicon (la y no sobrevive a 48px) ===
function dOnlyFavicon(size) {
  const dH = Math.round(size * 0.6);
  const dPart = drawD({ cx: size / 2, cy: size / 2, height: dH, color: "#FFFFFF", strokeFactor: 0.3 });
  return dPart.svg;
}

// === Builder genérico ===
function svgDoc(size, bgSvg, contentSvg) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bgSvg}
  ${contentSvg}
</svg>`;
}

async function renderPng(svg, outPath, size) {
  await sharp(Buffer.from(svg), { density: 600 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`  ✓ ${outPath}`);
}

mkdirSync(MOBILE_ASSETS, { recursive: true });

// === 1. icon.png — 1024×1024 iOS squircle gradient ===
{
  const svg = svgDoc(1024, gradientSquircle(1024), dyLockup({ size: 1024, color: "#FFFFFF" }));
  writeFileSync(`${MOBILE_ASSETS}/icon.svg`, svg);
  await renderPng(svg, `${MOBILE_ASSETS}/icon.png`, 1024);
}

// === 2. splash-icon.png — 1024×1024 Dy naranjo sobre transparente ===
// (El splash plugin pinta un fondo blanco detrás; el Dy va en #f97316 para contraste)
{
  const svg = svgDoc(1024, "", dyLockup({ size: 1024, color: "#f97316", bleed: 0.75 }));
  writeFileSync(`${MOBILE_ASSETS}/splash-icon.svg`, svg);
  await renderPng(svg, `${MOBILE_ASSETS}/splash-icon.png`, 1024);
}

// === 3. android-icon-foreground.png — 512×512 Dy blanco, safe zone 66% ===
{
  const svg = svgDoc(512, "", dyLockup({ size: 512, color: "#FFFFFF", safeZone: true }));
  writeFileSync(`${MOBILE_ASSETS}/android-icon-foreground.svg`, svg);
  await renderPng(svg, `${MOBILE_ASSETS}/android-icon-foreground.png`, 512);
}

// === 4. android-icon-background.png — 512×512 gradiente plano edge-to-edge ===
{
  const svg = svgDoc(512, gradientSolidRect(512), "");
  writeFileSync(`${MOBILE_ASSETS}/android-icon-background.svg`, svg);
  await renderPng(svg, `${MOBILE_ASSETS}/android-icon-background.png`, 512);
}

// === 5. android-icon-monochrome.png — 432×432 silueta blanca sobre transparente ===
{
  const svg = svgDoc(432, "", dyLockup({ size: 432, color: "#FFFFFF", safeZone: true }));
  writeFileSync(`${MOBILE_ASSETS}/android-icon-monochrome.svg`, svg);
  await renderPng(svg, `${MOBILE_ASSETS}/android-icon-monochrome.png`, 432);
}

// === 6. favicon.png — 48×48 solo D sobre naranjo flat ===
{
  const svg = svgDoc(48, flatSquircle(48, "#f97316"), dOnlyFavicon(48));
  writeFileSync(`${MOBILE_ASSETS}/favicon.svg`, svg);
  await renderPng(svg, `${MOBILE_ASSETS}/favicon.png`, 48);
}

// === BONUS: también actualizo los íconos web (icon-192, icon-512) para coherencia ===
{
  const svg192 = svgDoc(192, gradientSquircle(192), dyLockup({ size: 192, color: "#FFFFFF" }));
  const svg512 = svgDoc(512, gradientSquircle(512), dyLockup({ size: 512, color: "#FFFFFF" }));
  writeFileSync(`${WEB_PUBLIC}/icon-192.svg`, svg192);
  writeFileSync(`${WEB_PUBLIC}/icon-512.svg`, svg512);
  await renderPng(svg192, `${WEB_PUBLIC}/icon-192.png`, 192);
  await renderPng(svg512, `${WEB_PUBLIC}/icon-512.png`, 512);
}

console.log("\n✅ Assets Dyon generados en apps/mobile/assets/images/ y apps/web/public/");
