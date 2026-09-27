// Generate PWA PNG icons dari SVG murni-shape (tanpa teks → aman dari soal font).
// Jalankan: node scripts/generate-icons.js
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const INK = "#241D3D";
const PURPLE = "#4F46E5";
const YELLOW = "#FFCF3F";

// Starburst simetris, dipusatkan di (256,256): 12 kaki, outer 218, inner 158.
function starburst(cx, cy, outer, inner, spikes = 12, jitter = 18) {
  const pts = [];
  const steps = spikes * 2;
  for (let i = 0; i < steps; i++) {
    const angle = (Math.PI * 2 * i) / steps - Math.PI / 2;
    const isOuter = i % 2 === 0;
    const r = (isOuter ? outer : inner) + (isOuter ? Math.sin(i * 3.7) * jitter : Math.cos(i * 2.3) * jitter * 0.5);
    pts.push([
      Math.round((cx + Math.cos(angle) * r) * 10) / 10,
      Math.round((cy + Math.sin(angle) * r) * 10) / 10,
    ]);
  }
  return `M${pts.map((p) => p.join(" ")).join(" L")} Z`;
}

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path d="${starburst(256, 256, 216, 158)}" fill="${YELLOW}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
  <circle cx="256" cy="256" r="146" fill="${PURPLE}" stroke="${INK}" stroke-width="16"/>
  <g transform="translate(256 256)" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">
    <rect x="-84" y="-52" width="168" height="118" rx="28"/>
    <path d="M-42 -52 L-28 -80 L28 -80 L42 -52"/>
    <circle cx="0" cy="7" r="38"/>
    <circle cx="55" cy="-27" r="6.5" fill="#fff" stroke="none"/>
  </g>
  <circle cx="256" cy="263" r="14" fill="${YELLOW}" stroke="${INK}" stroke-width="6"/>
</svg>`;

// Versi maskable: artefak dikecil ke safe zone (~72%) + latar penuh.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#FFFDF7"/>
  <g transform="translate(256 256) scale(0.72) translate(-256 -256)">
    <path d="${starburst(256, 256, 216, 158)}" fill="${YELLOW}" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
    <circle cx="256" cy="256" r="146" fill="${PURPLE}" stroke="${INK}" stroke-width="16"/>
    <g transform="translate(256 256)" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">
      <rect x="-84" y="-52" width="168" height="118" rx="28"/>
      <path d="M-42 -52 L-28 -80 L28 -80 L42 -52"/>
      <circle cx="0" cy="7" r="38"/>
    </g>
  </g>
</svg>`;

async function render(name, svgStr, size) {
  const out = path.join(baseDir, "public", name);
  await sharp(Buffer.from(svgStr)).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log("✓", name, size + "px");
}

await render("icon-512.png", iconSvg, 512);
await render("icon-192.png", iconSvg, 192);
await render("icon-maskable-512.png", maskableSvg, 512);
console.log("Ikon PWA selesai.");
