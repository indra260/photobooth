// Serialisasi sesi edit ke localStorage — versi lama nyimpen canvas hasil JSON.stringify
// yang jadi "{}" dan menyuntik data rusak saat restore. Sekarang tiap shot dikecilin
// jadi dataURL JPEG kecil, dan pas restore dimuat balik jadi canvas beneran.
const KEY = "kentamal-session";

function shotToDataUrl(shot) {
  const images = (shot.images || []).map((img) => {
    const c = document.createElement("canvas");
    const scale = Math.min(1, 720 / Math.max(img.width, 1));
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.62);
  });
  return { images, crops: (shot.crops || []).map((cr) => ({ ...cr })) };
}

function loadCanvas(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function saveSession(state) {
  try {
    const shots = (state.shots || []).filter(Boolean).map(shotToDataUrl).slice(0, 8);
    localStorage.setItem(KEY, JSON.stringify({ ...state, shots }));
  } catch { /* quota / private mode */ }
}

export async function loadSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || !Array.isArray(raw.shots) || !raw.shots.length) return null;
    const shots = [];
    for (const s of raw.shots) {
      const images = await Promise.all((s.images || []).map(loadCanvas));
      if (images.some(Boolean)) shots.push({ images: images.filter(Boolean), crops: s.crops || images.map(() => ({ zoom: 1, panX: 0, panY: 0 })) });
    }
    if (!shots.length) return null;
    return { ...raw, shots };
  } catch {
    return null;
  }
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
