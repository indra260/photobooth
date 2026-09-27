import { filterById, filterWithIntensity } from "../booth.js";

const SIZE_MAP = { "4:3": [1280, 960], "1:1": [1080, 1080], "9:16": [720, 1280] };

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
