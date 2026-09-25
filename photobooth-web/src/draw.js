import { cropRect, geometry } from "./booth";

const LOOKS = {
  cream: ["#f4f1ea", "#1a1814"],
  komik: ["#ffffff", "#111111"],
  lilac: ["#f3e9ff", "#3a2158"],
  blush: ["#ffe8ef", "#6b2340"],
  ink: ["#1c1a22", "#f6f1ea"],
  film: ["#111111", "#f2efe8"],
  lemon: ["#fff6c8", "#2c2410"],
};

const TEMPLATE_COLORS = {
  vertikal: "#f4f1ea",
  pose4: "#fdf3e7",
  kotak: "#eef4ff",
  couple: "#ffe8ef",
  ulangtahun: "#fff6c8",
  komik: "#ffffff",
  buah: "#ffefe0",
  pelangi: "#f0eaff",
  macan: "#fff3d6",
  minimal: "#f5f5f5",
};

function slotMidY(geo, i) {
  const currentSlot = geo.frames[i][0];
  const nextSlot = geo.frames[i + 1][0];
  return (currentSlot.y + currentSlot.h + nextSlot.y) / 2;
}

export function qrCanvas(text) {
  if (!text || typeof window.qrcode !== "function") return null;
  try {
    const qr = window.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const cell = 4;
    const canvas = document.createElement("canvas");
    canvas.width = n * cell;
    canvas.height = n * cell;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1814";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
    return canvas;
  } catch {
    return null;
  }
}

export function paintStrip(canvas, { template, mode, shots, stickers, texts, name, qrUrl, look, ink, retouch, pickedSticker, pickedText, customFrame }) {
  const geo = geometry(template, mode);
  const paper = TEMPLATE_COLORS[template] || LOOKS[look]?.[0] || LOOKS.cream[0];
  const inkColor = LOOKS[look]?.[1] || LOOKS.cream[1];
  canvas.width = geo.w;
  canvas.height = geo.h;
  const ctx = canvas.getContext("2d");

  // Background Paper
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, geo.w, geo.h);

  // Custom creator frame (transparent PNG) behind photos
  if (customFrame) {
    ctx.drawImage(customFrame, 0, 0, geo.w, geo.h);
  }

  // Optional Frame Pattern Overlays (BeautyPlus & Jepreto style)
  if (look === "komik" || look === "cream") {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 2;
    for (let x = 0; x < geo.w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, geo.h); ctx.stroke();
    }
    for (let y = 0; y < geo.h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(geo.w, y); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle = inkColor;
  ctx.textAlign = "center";
  if (geo.label) {
    ctx.font = "800 32px Chillax, Segoe UI, sans-serif";
    ctx.fillText(geo.label, geo.w / 2, 60);
  }

  // Filter & Retouch string
  const b = retouch?.brightness ?? 100;
  const c = retouch?.contrast ?? 100;
  const s = retouch?.saturate ?? 100;
  const filterString = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

  geo.frames.forEach((slots, i) => {
    const shot = shots[i];
    const isComic = look === "komik";
    slots.forEach((slot, k) => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y, slot.w, slot.h, 20);
      ctx.clip();
      ctx.fillStyle = isComic ? "#ffffff" : "#d9d3c8";
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
      
      const img = shot?.images[k];
      const crop = shot?.crops[k];
      if (img && crop) {
        const r = cropRect(img.width, img.height, slot.w, slot.h, crop.zoom, crop.panX, crop.panY);
        ctx.filter = filterString;
        ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, slot.x, slot.y, slot.w, slot.h);
        ctx.filter = "none";
      }

      // Smooth Blur / Retouch skin glow if enabled
      if (retouch?.smooth > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 192, 203, ${retouch.smooth * 0.08})`;
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
        ctx.restore();
      }

      ctx.restore();

      // Outer border styling
      if (isComic) {
        ctx.save();
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 6;
        ctx.strokeRect(slot.x + 3, slot.y + 3, slot.w - 6, slot.h - 6);
        ctx.restore();
      }
    });

    if (isComic && i < geo.frames.length - 1) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(geo.w / 2, slotMidY(geo, i), 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
    }
  });

  // Text overlays rendering with selection box
  (texts || []).forEach((t, idx) => {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(((t.rot || 0) * Math.PI) / 180);
    ctx.font = `900 ${t.size || 36}px Chillax, Segoe UI, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(3, (t.size || 36) / 6);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(t.text, 0, 0);
    ctx.fillStyle = t.color || inkColor;
    ctx.fillText(t.text, 0, 0);

    if (idx === pickedText) {
      const w = ctx.measureText(t.text).width;
      ctx.strokeStyle = "#8e36ff";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(-w / 2 - 8, -(t.size || 36) / 2 - 8, w + 16, t.size + 16);
      ctx.fillStyle = "#8e36ff";
      ctx.setLineDash([]);
      ctx.fillRect(-w / 2 - 13, -(t.size || 36) / 2 - 13, 10, 10);
      ctx.fillRect(w / 2 + 3, -(t.size || 36) / 2 - 13, 10, 10);
      ctx.fillRect(-w / 2 - 13, (t.size || 36) / 2 + 3, 10, 10);
      ctx.fillRect(w / 2 + 3, (t.size || 36) / 2 + 3, 10, 10);
    }
    ctx.restore();
  });

  // Stickers rendering with selection bounding box and handles if picked
  stickers.forEach((st, idx) => {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(((st.rot || 0) * Math.PI) / 180);
    ctx.scale(st.flip ? -1 : 1, 1);
    ctx.font = `${st.size}px Segoe UI Emoji, Segoe UI Symbol, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(st.emoji, 0, 0);

    // If selected, draw highlight box and handles
    if (idx === pickedSticker) {
      ctx.strokeStyle = "#8e36ff";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      const sz = st.size * 0.75;
      ctx.strokeRect(-sz, -sz, sz * 2, sz * 2);

      // Handles
      ctx.fillStyle = "#8e36ff";
      ctx.setLineDash([]);
      ctx.fillRect(-sz - 5, -sz - 5, 10, 10);
      ctx.fillRect(sz - 5, -sz - 5, 10, 10);
      ctx.fillRect(-sz - 5, sz - 5, 10, 10);
      ctx.fillRect(sz - 5, sz - 5, 10, 10);
    }

    ctx.restore();
  });

  // Doodles / Ink
  ctx.strokeStyle = "#8e36ff";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  (ink || []).forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(d.x1, d.y1);
    ctx.lineTo(d.x2, d.y2);
    ctx.stroke();
  });

  // Footer Branding & QR Code
  const foot = geo.footer;
  const siteUrl = typeof window !== "undefined" ? window.location.href.split("?")[0] : "https://kentamal.com";
  const qr = qrCanvas((qrUrl || "").trim() || siteUrl);
  const maxText = qr ? foot.w - 140 : foot.w;
  const label = (name || "Kentamal Booth").slice(0, 24);
  const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  // Website name on top of frame
  ctx.save();
  ctx.fillStyle = inkColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "800 22px Chillax, Segoe UI, sans-serif";
  ctx.globalAlpha = 0.75;
  ctx.fillText("🌐 kentamal-booth", geo.w / 2, 28);
  ctx.restore();

  ctx.fillStyle = inkColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "800 28px Chillax, Segoe UI, sans-serif";
  ctx.fillText(label, foot.x, foot.y + 48, maxText);
  ctx.font = "600 20px Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText(date, foot.x, foot.y + 82, maxText);
  ctx.font = "600 16px Segoe UI, sans-serif";
  ctx.fillText("Scan QR → " + siteUrl.replace(/^https?:\/\//, "").slice(0, 30), foot.x, foot.y + 112, maxText);

  if (qr) {
    const size = 100;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(foot.x + foot.w - size - 8, foot.y + 12, size + 8, size + 8);
    ctx.strokeStyle = "#202030";
    ctx.lineWidth = 2;
    ctx.strokeRect(foot.x + foot.w - size - 8, foot.y + 12, size + 8, size + 8);
    ctx.drawImage(qr, foot.x + foot.w - size - 4, foot.y + 16, size, size);
  }

  return canvas;
}

export function fitRatio(strip, ratio) {
  if (ratio === "asli") return strip;
  const map = { "9:16": [9, 16], "4:5": [4, 5], "1:1": [1, 1] };
  const pair = map[ratio] || [9, 16];
  const long = 1800;
  const landscape = pair[0] > pair[1];
  const width = landscape ? long : Math.round(long * pair[0] / pair[1]);
  const height = landscape ? Math.round(long * pair[1] / pair[0]) : long;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / strip.width, height / strip.height);
  const dw = strip.width * scale;
  const dh = strip.height * scale;
  ctx.drawImage(strip, (width - dw) / 2, (height - dh) / 2, dw, dh);
  return canvas;
}

export function downloadStrip(strip, ratio) {
  const out = fitRatio(strip, ratio);
  const a = document.createElement("a");
  a.href = out.toDataURL("image/png");
  a.download = `kentamal-booth-${Date.now()}.png`;
  a.click();
}
