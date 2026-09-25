export const TEMPLATES = {
  vertikal: { frames: 4, layout: "stack", label: "" },
  kotak: { frames: 4, layout: "grid", label: "" },
  couple: { frames: 2, layout: "row", label: "COUPLE" },
  ulangtahun: { frames: 3, layout: "stack", label: "ULANG TAHUN" },
  pose4: { frames: 4, layout: "stack", label: "4 POSE" },
  komik: { frames: 4, layout: "stack", label: "KOMIK" },
  buah: { frames: 4, layout: "stack", label: "FRESH FRUIT" },
  pelangi: { frames: 4, layout: "stack", label: "RAINBOW GLOW" },
  macan: { frames: 4, layout: "grid", label: "CUTE LEOPARD" },
  minimal: { frames: 4, layout: "stack", label: "MINIMAL" },
};

const RAW = [
  { group: "Asli", items: [["none", "Tanpa filter", "none"]] },
  { group: "iPhone", items: [
    ["iphone-std", "iPhone Standar", "contrast(1.05) saturate(1.12) brightness(1.04)"],
    ["iphone-warm", "iPhone Hangat", "sepia(0.16) saturate(1.2) contrast(1.05) brightness(1.03)"],
    ["iphone-cool", "iPhone Dingin", "hue-rotate(-8deg) saturate(0.95) contrast(1.08) brightness(1.02)"],
    ["iphone-vivid", "iPhone Vivid", "saturate(1.45) contrast(1.12) brightness(1.02)"],
    ["iphone-portrait", "iPhone Portrait", "contrast(1.06) saturate(0.9) brightness(1.06) sepia(0.06)"],
    ["iphone-silver", "iPhone Silver", "grayscale(0.35) contrast(1.1) saturate(0.75) brightness(1.06)"],
    ["iphone-chrome", "iPhone Chrome", "contrast(1.2) saturate(0.85) brightness(0.98)"],
    ["iphone-noir", "iPhone Noir", "grayscale(1) contrast(1.28) brightness(1.04)"],
  ]},
  { group: "Fujifilm", items: [
    ["provia", "Provia", "contrast(1.08) saturate(1.15)"],
    ["velvia", "Velvia", "saturate(1.6) contrast(1.18)"],
    ["astia", "Astia", "saturate(0.95) contrast(0.98) brightness(1.06) sepia(0.08)"],
    ["classic-chrome", "Classic Chrome", "saturate(0.75) contrast(1.15) sepia(0.12)"],
    ["classic-neg", "Classic Neg", "contrast(1.12) saturate(0.8) sepia(0.22) brightness(0.98)"],
    ["pro-neg-hi", "Pro Neg Hi", "contrast(1.2) saturate(0.9) brightness(1.02)"],
    ["pro-neg-std", "Pro Neg Std", "contrast(1.05) saturate(0.88) brightness(1.04) sepia(0.06)"],
    ["nostalgic", "Nostalgic Neg", "sepia(0.28) saturate(1.1) contrast(1.05) brightness(1.05)"],
    ["eterna", "Eterna", "saturate(0.7) contrast(0.92) brightness(1.08)"],
    ["acros", "Acros", "grayscale(1) contrast(1.32)"],
    ["fuji-sepia", "Fuji Sepia", "sepia(0.85) contrast(1.05)"],
  ]},
  { group: "Sony", items: [
    ["sony-std", "Sony Standar", "contrast(1.06) saturate(1.1)"],
    ["sony-vivid", "Sony Vivid", "saturate(1.5) contrast(1.15)"],
    ["sony-portrait", "Sony Portrait", "saturate(0.92) contrast(1.02) brightness(1.05) sepia(0.06)"],
    ["sony-land", "Sony Landscape", "saturate(1.25) contrast(1.12) hue-rotate(-6deg)"],
    ["sony-neutral", "Sony Neutral", "saturate(0.85) contrast(1) brightness(1.02)"],
    ["sony-clear", "Sony Clear", "contrast(1.18) saturate(1.05) brightness(1.04)"],
    ["sony-deep", "Sony Deep", "saturate(1.2) contrast(1.22) brightness(0.95)"],
    ["sony-light", "Sony Light", "brightness(1.12) contrast(0.95) saturate(0.95)"],
    ["sony-bw", "Sony BW", "grayscale(1) contrast(1.15)"],
    ["sony-sepia", "Sony Sepia", "sepia(0.7) contrast(1.08)"],
  ]},
  { group: "Canon", items: [
    ["canon-std", "Canon Standar", "contrast(1.04) saturate(1.08)"],
    ["canon-portrait", "Canon Portrait", "sepia(0.08) saturate(0.95) brightness(1.06)"],
    ["canon-land", "Canon Landscape", "saturate(1.3) contrast(1.1) hue-rotate(6deg)"],
    ["canon-neutral", "Canon Neutral", "saturate(0.9) contrast(0.98)"],
    ["canon-faithful", "Canon Faithful", "saturate(1) contrast(1.02)"],
    ["canon-detail", "Canon Fine Detail", "contrast(1.16) saturate(1.05) brightness(1.02)"],
    ["canon-mono", "Canon Mono", "grayscale(1) contrast(1.2)"],
  ]},
];

export const FILTERS = RAW.map((g) => ({
  group: g.group,
  items: g.items.map(([id, name, css]) => ({ id, name, css })),
}));

export function filterById(id) {
  for (const g of FILTERS) {
    const hit = g.items.find((item) => item.id === id);
    if (hit) return hit;
  }
  return FILTERS[0].items[0];
}

// Interpolate every filter parameter toward neutral by strength s (0..2)
export function filterWithIntensity(css, s) {
  if (!css || s >= 1) return css;
  return css.replace(/(\w+)\(([\d.]+)(%|deg)?\)/g, (m, f, v, unit) => {
    const n = parseFloat(v);
    const keepUnit = unit || "";
    // directional filters (grayscale, sepia, hue-rotate, blur, invert): scale toward 0
    if (f === "grayscale" || f === "sepia" || f === "hue-rotate" || f === "blur" || f === "invert") {
      return `${f}(${(n * s).toFixed(2)}${keepUnit})`;
    }
    // scaling filters (contrast, saturate, brightness): interpolate toward 1
    return `${f}(${(1 + (n - 1) * s).toFixed(3)})`;
  });
}

export function geometry(templateKey, mode) {
  const t = TEMPLATES[templateKey] || TEMPLATES.vertikal;
  const pad = 36;
  const gap = 18;
  const cellW = 420;
  const cellH = 560;
  const per = mode === "2" ? 2 : 1;
  const footerH = 150;
  const labelH = t.label ? 56 : 0;
  const frameW = cellW * per + gap * (per - 1);
  const frames = [];

  function pushFrame(x0, y) {
    const slots = [];
    for (let k = 0; k < per; k++) slots.push({ x: x0 + k * (cellW + gap), y, w: cellW, h: cellH });
    frames.push(slots);
  }

  let width = 0;
  let height = 0;
  if (t.layout === "stack") {
    width = pad * 2 + frameW;
    const body = t.frames * cellH + (t.frames - 1) * gap;
    height = pad + labelH + body + gap + footerH + pad;
    for (let i = 0; i < t.frames; i++) pushFrame(pad, pad + labelH + i * (cellH + gap));
  } else if (t.layout === "row") {
    width = pad * 2 + t.frames * frameW + (t.frames - 1) * gap;
    height = pad + labelH + cellH + gap + footerH + pad;
    for (let i = 0; i < t.frames; i++) pushFrame(pad + i * (frameW + gap), pad + labelH);
  } else {
    const cols = 2;
    const rows = Math.ceil(t.frames / cols);
    width = pad * 2 + cols * frameW + (cols - 1) * gap;
    height = pad + labelH + rows * cellH + (rows - 1) * gap + gap + footerH + pad;
    for (let i = 0; i < t.frames; i++) {
      pushFrame(pad + (i % cols) * (frameW + gap), pad + labelH + Math.floor(i / cols) * (cellH + gap));
    }
  }

  return {
    w: width,
    h: height,
    frames,
    label: t.label,
    footer: { x: pad, y: height - pad - footerH, w: width - pad * 2, h: footerH },
  };
}

export function cropRect(srcW, srcH, dstW, dstH, zoom, panX, panY) {
  const z = Math.max(1, zoom || 1);
  const cover = Math.max(dstW / srcW, dstH / srcH);
  const scale = cover * z;
  const sw = dstW / scale;
  const sh = dstH / scale;
  const maxX = Math.max(0, srcW - sw);
  const maxY = Math.max(0, srcH - sh);
  const sx = Math.min(maxX, Math.max(0, (srcW - sw) / 2 + (panX || 0) * (maxX / 2)));
  const sy = Math.min(maxY, Math.max(0, (srcH - sh) / 2 + (panY || 0) * (maxY / 2)));
  return { sx, sy, sw, sh };
}
