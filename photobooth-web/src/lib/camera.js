import { filterById, filterWithIntensity } from "../booth.js";

const SIZE_MAP = { "4:3": [1280, 960], "1:1": [1080, 1080], "9:16": [720, 1280] };

/**
 * Draw AR prop (emoji) onto a canvas at face-landmark position.
 * Shared between the live preview overlay and the real capture path, so the
 * photo you save matches what you saw.
 */
export function drawARProp(ctx, landmarks, prop, canvasW, canvasH, mirrored = true) {
  if (!landmarks || !prop) return;
  const face = landmarks[0];
  if (!face || face.length < 474) return;

  const nose = face[1];
  const eyeL = face[468];
  const eyeR = face[473];
  const mouth = face[13];
  if (!nose || !eyeL || !eyeR || !mouth) return;

  // Landmarks are normalized 0..1 against the *unmirrored* video frame.
  const px = (p) => (mirrored ? canvasW - p.x * canvasW : p.x * canvasW);
  const py = (p) => p.y * canvasH;

  const faceW = Math.abs(px(eyeR) - px(eyeL));
  const faceH = Math.abs(py(mouth) - py(nose));
  const cx = (px(eyeL) + px(eyeR)) / 2;
  const cy = (py(nose) + py(mouth)) / 2;

  const unit = Math.max(faceW, faceH) || 1;

  let dy = 0;
  let scale = 1;
  switch (prop.type) {
    case "hat": dy = -unit * 0.62; scale = 0.9; break;
    case "eyes": dy = -unit * 0.14; scale = 0.62; break;
    case "top": dy = -unit * 0.85; scale = 0.7; break;
    case "mouth": dy = unit * 0.18; scale = 0.5; break;
    default: break;
  }

  ctx.save();
  ctx.translate(cx, cy + dy);
  ctx.scale(scale, scale);
  ctx.font = `${Math.round(unit * 0.72)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(prop.emoji, 0, 0);
  ctx.restore();
}

export function cameraErrorMessage(err) {
  if (err && err.name === "NotAllowedError") {
    return "Kamera diblokir browser. Klik ikon 🔒 di address bar → izinkan Kamera, lalu coba lagi.";
  }
  if (err && err.name === "NotFoundError") {
    return "Tidak ada kamera terdeteksi di perangkat ini.";
  }
  if (err && err.name === "NotReadableError") {
    return "Kamera dipakai aplikasi lain (Zoom/Meet/OBS?). Tutup aplikasi itu lalu coba lagi.";
  }
  return (err && err.message) || "Kamera tidak bisa dibuka.";
}

/**
 * Buka satu kamera (fallback aman kalau device terpilih hilang).
 * Mode lama "2 webcam sekaligus" dipindah ke toggle eksplisit, bukan syarat crash.
 */
export async function openCamera({ ratio = "4:3", deviceId = "" } = {}) {
  const [w, h] = SIZE_MAP[ratio] || SIZE_MAP["4:3"];
  const request = (video) => navigator.mediaDevices.getUserMedia({ audio: false, video });
  async function getCam(id, facing) {
    const size = { width: { ideal: w }, height: { ideal: h } };
    try {
      return await request({
        ...(facing ? { facingMode: "user" } : {}),
        ...(id ? { deviceId: { exact: id } } : {}),
        ...size,
      });
    } catch (err) {
      // Device terpilih bisa hilang/terblokir (OBS Virtual Cam, OMEN, dsb).
      if (err && (err.name === "OverconstrainedError" || err.name === "NotFoundError") && id) {
        return await request(facing ? { facingMode: "user", ...size } : undefined);
      }
      throw err;
    }
  }
  return [await getCam(deviceId, true)];
}

/** Dua webcam di SATU laptop — fitur terpisah, fallback ke 1 kamera + peringatan. */
export async function openDualCameras(opts) {
  const cams = await openCamera(opts);
  const used = cams[0].getVideoTracks()[0].getSettings().deviceId;
  const all = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  const other = all.find((d) => d.kind === "videoinput" && d.deviceId && d.deviceId !== used);
  if (!other) {
    return { cams, dualError: "Webcam kedua tidak ketemu — jalan dengan 1 kamera dulu." };
  }
  try {
    const second = await openCamera({ ...opts, deviceId: other.deviceId });
    return { cams: [...cams, ...second], dualError: "" };
  } catch {
    return { cams, dualError: "Webcam kedua gagal dibuka — jalan dengan 1 kamera dulu." };
  }
}

export async function discoverCameras() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

export function stopStreams(cams) {
  (cams || []).forEach((s) => s.getTracks().forEach((t) => t.stop()));
}

/** Jepret satu frame video → canvas, dengan filter. Flip hanya kalau mirror ON (samakan dgn preview). */
export function grab(video, filterId, strength, mirrored = true) {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1280 / w);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  ctx.save();
  if (mirrored) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.filter = filterWithIntensity(filterById(filterId).css, (strength ?? 100) / 100);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  return canvas;
}
