// Audio + getar + sleep yang abort-safe dan tetap jalan saat tab di background
// (rAF freeze saat tab tidak_visible — bikin countdown nyangkut; setTimeout tidak).

let ctx = null;

export function beep(freq, dur = 0.07, enabled = true) {
  if (!enabled) return;
  const Ctor = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return;
  try {
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur + 0.02);
  } catch { /* audio ops blocked before gesture; ignore */ }
}

export function shutter(enabled = true) {
  beep(160, 0.09, enabled);
  setTimeout(() => beep(90, 0.12, enabled), 40);
}

export function vibrate(ms) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch { /* unsupported */ }
}

/** Tidur yang bisa dibatalkan via abortRef ({ current: true }). Resolve false kalau batal. */
export function sleep(ms, abortRef) {
  return new Promise((resolve) => {
    const start = Date.now();
    const id = setInterval(() => {
      if (abortRef && abortRef.current) { clearInterval(id); resolve(false); return; }
      if (Date.now() - start >= ms) { clearInterval(id); resolve(true); }
    }, 80);
  });
}
