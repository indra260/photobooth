// Satu-satunya jalan membuat strip final: semua export (PNG/JPEG/print/share/video/room)
// memanggil ini — dulu blok paintStrip diduplikasi ~7 kali di App.jsx.
import { paintStrip } from "../draw.js";

export function composeStrip(opts, target = null) {
  const canvas = target || document.createElement("canvas");
  const { pickedSticker, pickedText, ...clean } = opts;
  void pickedSticker; void pickedText;
  paintStrip(canvas, clean);
  return canvas;
}

export function stripBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat blob."))), type, 0.9);
  });
}
