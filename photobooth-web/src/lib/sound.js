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

export function shutter(enabled = true, variant = "retro") {
  if (!enabled) return;
  
  const variants = {
    // 1. Retro - klasik double-beep kamera film
    retro: () => {
      beep(160, 0.09);
      setTimeout(() => beep(90, 0.12), 40);
    },
    
    // 2. Mechanical - SLR camera dengan lebih banyak mekanikal sound
    mechanical: () => {
      beep(300, 0.05);
      setTimeout(() => beep(150, 0.08), 25);
      setTimeout(() => beep(200, 0.06), 40);
      setTimeout(() => beep(120, 0.10), 60);
    },
    
    // 3. Cinematic - dramatic whoosh + deep thud
    cinematic: () => {
      beep(800, 0.2, false); // high tone whoosh (quiet volume via gain manipulation if needed)
      setTimeout(() => beep(60, 0.2), 150); // deep thud
    },
    
    // 4. Arcade - 8-bit blip blip style
    arcade: () => {
      beep(1200, 0.03);
      setTimeout(() => beep(800, 0.04), 30);
      setTimeout(() => beep(1500, 0.02), 50);
    }
  };
  
  variants[variant]?.();
}

/** Suara "nging" printer kecil buat momen strip keluar. */
export function printer(enabled = true) {
  if (!enabled) return;
  for (let i = 0; i < 6; i++) setTimeout(() => beep(64 + (i % 2) * 26, 0.045, enabled), i * 60);
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
