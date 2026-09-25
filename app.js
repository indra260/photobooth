/* Booth lokal. Foto tidak dikirim ke mana pun. */
const TEMPLATES = {
  vertikal: { frames: 4, layout: "stack", label: "" },
  kotak: { frames: 4, layout: "grid", label: "" },
  couple: { frames: 2, layout: "row", label: "COUPLE" },
  ulangtahun: { frames: 3, layout: "stack", label: "ULANG TAHUN" },
  pose4: { frames: 4, layout: "stack", label: "4 POSE" },
};

const FILTERS = [
  { group: "Asli", items: [{ id: "none", name: "Tanpa filter", css: "none" }] },
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
].map(function (g) {
  return {
    group: g.group,
    items: g.items.map(function (item) {
      return Array.isArray(item) ? { id: item[0], name: item[1], css: item[2] } : item;
    }),
  };
});

const STICKERS = ["❤️", "😂", "🔥", "⭐", "👑", "🎉", "😎", "🥰", "✨", "💋", "🌸", "🖤"];

function filterById(id) {
  for (let i = 0; i < FILTERS.length; i++) {
    const hit = FILTERS[i].items.find(function (item) { return item.id === id; });
    if (hit) return hit;
  }
  return FILTERS[0].items[0];
}

function geometry(templateKey, mode) {
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
  let width = 0;
  let height = 0;

  function pushFrame(x0, y) {
    const slots = [];
    for (let k = 0; k < per; k++) {
      slots.push({ x: x0 + k * (cellW + gap), y: y, w: cellW, h: cellH });
    }
    frames.push(slots);
  }

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
      const c = i % cols;
      const r = Math.floor(i / cols);
      pushFrame(pad + c * (frameW + gap), pad + labelH + r * (cellH + gap));
    }
  }

  return {
    w: width,
    h: height,
    frames: frames,
    label: t.label,
    footer: { x: pad, y: height - pad - footerH, w: width - pad * 2, h: footerH },
  };
}

function cropRect(srcW, srcH, dstW, dstH, zoom, panX, panY) {
  const z = Math.max(1, zoom || 1);
  const cover = Math.max(dstW / srcW, dstH / srcH);
  const scale = cover * z;
  const sw = dstW / scale;
  const sh = dstH / scale;
  const maxX = Math.max(0, srcW - sw);
  const maxY = Math.max(0, srcH - sh);
  const sx = Math.min(maxX, Math.max(0, (srcW - sw) / 2 + (panX || 0) * (maxX / 2)));
  const sy = Math.min(maxY, Math.max(0, (srcH - sh) / 2 + (panY || 0) * (maxY / 2)));
  return { sx: sx, sy: sy, sw: sw, sh: sh };
}

function qrCanvas(text) {
  if (!text || typeof qrcode !== "function") return null;
  try {
    const qr = qrcode(0, "M");
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
  } catch (err) {
    return null;
  }
}

function fitRatio(strip, ratio) {
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

if (typeof document !== "undefined") boot();

function boot() {
  const $ = function (id) { return document.getElementById(id); };
  const state = {
    mode: "1",
    template: "vertikal",
    timer: 3,
    filter: "iphone-std",
    shots: [],
    stickers: [],
    selectedShot: 0,
    selectedSlot: 0,
    selectedSticker: -1,
    streams: [],
    abort: false,
    busy: false,
  };

  const filterSelect = $("filterPick");
  FILTERS.forEach(function (group) {
    const og = document.createElement("optgroup");
    og.label = group.group;
    group.items.forEach(function (item) {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      if (item.id === state.filter) opt.selected = true;
      og.appendChild(opt);
    });
    filterSelect.appendChild(og);
  });

  STICKERS.forEach(function (emoji) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    btn.setAttribute("aria-label", "Stiker " + emoji);
    btn.addEventListener("click", function () { addSticker(emoji); });
    $("stickerBar").appendChild(btn);
  });

  bindChoice("modePick", function (v) { state.mode = v; });
  bindChoice("shapePick", function (v) { state.template = v; });
  bindChoice("timerPick", function (v) { state.timer = Number(v); });
  filterSelect.addEventListener("change", function () {
    state.filter = filterSelect.value;
    applyPreviewFilter();
  });

  $("setupForm").addEventListener("submit", function (e) {
    e.preventDefault();
    startSession();
  });
  $("shootBtn").addEventListener("click", runSequence);
  $("cancelBtn").addEventListener("click", function () {
    state.abort = true;
    resetToSetup();
  });
  $("tightBtn").addEventListener("click", function () {
    const crop = currentCrop();
    if (!crop) return;
    crop.zoom = 1.7;
    crop.panX = 0;
    crop.panY = -0.15;
    syncCropInputs();
    paint();
  });
  ["zoom", "panX", "panY"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      const crop = currentCrop();
      if (!crop) return;
      crop.zoom = Number($("zoom").value);
      crop.panX = Number($("panX").value);
      crop.panY = Number($("panY").value);
      paint();
    });
  });
  $("stickerSize").addEventListener("input", function () {
    const s = state.stickers[state.selectedSticker];
    if (!s) return;
    s.size = Number($("stickerSize").value);
    paint();
  });
  $("delSticker").addEventListener("click", function () {
    if (state.selectedSticker < 0) return;
    state.stickers.splice(state.selectedSticker, 1);
    state.selectedSticker = -1;
    paint();
  });
  $("saveBtn").addEventListener("click", download);
  $("againBtn").addEventListener("click", resetToSetup);
  $("boothName").addEventListener("input", function () { if (! $("edit").hidden) paint(); });
  $("qrUrl").addEventListener("input", function () { if (! $("edit").hidden) paint(); });

  const preview = $("preview");
  preview.addEventListener("pointerdown", onPointerDown);
  preview.addEventListener("pointermove", onPointerMove);
  preview.addEventListener("pointerup", onPointerUp);

  if (location.protocol === "file:") {
    showError("Buka lewat localhost. Kamera tidak jalan dari file.");
  }
  if (new URLSearchParams(location.search).has("demo")) enterDemo();

  function bindChoice(id, fn) {
    const box = $(id);
    box.addEventListener("click", function (e) {
      const btn = e.target.closest("button");
      if (!btn || !box.contains(btn)) return;
      box.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      fn(btn.dataset.value);
    });
  }

  function showError(msg) {
    const el = $("error");
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  function show(which) {
    ["setup", "live", "edit"].forEach(function (id) { $(id).hidden = id !== which; });
    $("stepLabel").textContent = which === "setup" ? "Siapkan" : which === "live" ? "Jepret" : "Atur";
  }

  function currentCrop() {
    const shot = state.shots[state.selectedShot];
    if (!shot) return null;
    return shot.crops[state.selectedSlot] || shot.crops[0];
  }

  function syncCropInputs() {
    const crop = currentCrop();
    if (!crop) return;
    $("zoom").value = String(crop.zoom);
    $("panX").value = String(crop.panX);
    $("panY").value = String(crop.panY);
  }

  async function startSession() {
    showError("");
    if (location.protocol === "file:") {
      showError("Buka lewat localhost. Kamera tidak jalan dari file.");
      return;
    }
    $("startBtn").disabled = true;
    try {
      stopStreams();
      state.streams = await openCameras(state.mode);
      mountVideos();
      state.shots = [];
      state.stickers = [];
      state.abort = false;
      state.busy = false;
      drawDots();
      show("live");
    } catch (err) {
      showError(err.message || "Kamera tidak bisa dibuka.");
      stopStreams();
    } finally {
      $("startBtn").disabled = false;
    }
  }

  async function openCameras(mode) {
    const first = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    if (mode !== "2") return [first];
    const used = first.getVideoTracks()[0].getSettings().deviceId;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(function (d) { return d.kind === "videoinput" && d.deviceId && d.deviceId !== used; });
    if (!cams.length) {
      first.getTracks().forEach(function (t) { t.stop(); });
      throw new Error("Butuh dua webcam. Yang terbaca cuma satu.");
    }
    const second = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId: { exact: cams[0].deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    return [first, second];
  }

  function mountVideos() {
    const box = $("cams");
    box.className = "cams" + (state.streams.length > 1 ? " dual" : "");
    box.replaceChildren();
    state.streams.forEach(function (stream) {
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      box.appendChild(video);
    });
    applyPreviewFilter();
  }

  function applyPreviewFilter() {
    const css = filterById(state.filter).css;
    document.querySelectorAll("#cams video").forEach(function (video) {
      video.style.filter = css;
    });
  }

  function drawDots() {
    const n = (TEMPLATES[state.template] || TEMPLATES.vertikal).frames;
    const box = $("dots");
    box.replaceChildren();
    for (let i = 0; i < n; i++) {
      const dot = document.createElement("i");
      if (i < state.shots.length) dot.className = "done";
      else if (i === state.shots.length && state.busy) dot.className = "on";
      box.appendChild(dot);
    }
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      const start = performance.now();
      function tick() {
        if (state.abort) return resolve(false);
        if (performance.now() - start >= ms) return resolve(true);
        requestAnimationFrame(tick);
      }
      tick();
    });
  }

  function beep(freq, dur) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!beep.ctx) beep.ctx = new Ctx();
    const ctx = beep.ctx;
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
    osc.stop(ctx.currentTime + dur);
  }

  function shutterSound() {
    beep(160, 0.09);
    setTimeout(function () { beep(90, 0.12); }, 40);
  }

  function flash() {
    const el = $("flash");
    el.classList.add("on");
    setTimeout(function () { el.classList.remove("on"); }, 180);
  }

  function grab(video) {
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    const maxW = 1280;
    const scale = Math.min(1, maxW / w);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.filter = filterById(state.filter).css;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    return canvas;
  }

  async function runSequence() {
    if (state.busy) return;
    const videos = Array.from(document.querySelectorAll("#cams video"));
    if (!videos.length || videos.some(function (v) { return !v.videoWidth; })) {
      showError("Kamera belum siap. Tunggu gambarnya muncul.");
      return;
    }
    showError("");
    state.busy = true;
    state.abort = false;
    state.shots = [];
    $("shootBtn").disabled = true;
    const n = TEMPLATES[state.template].frames;
    for (let i = 0; i < n; i++) {
      drawDots();
      for (let sec = state.timer; sec >= 1; sec--) {
        $("count").textContent = String(sec);
        beep(sec === 1 ? 990 : 740, 0.07);
        const ok = await sleep(1000);
        if (!ok) return finishLive(false);
      }
      $("count").textContent = "";
      const images = videos.map(grab);
      const crops = images.map(function () { return { zoom: 1, panX: 0, panY: 0 }; });
      state.shots.push({ images: images, crops: crops });
      shutterSound();
      flash();
      drawDots();
      const gap = await sleep(450);
      if (!gap) return finishLive(false);
    }
    finishLive(true);
  }

  function finishLive(goEdit) {
    state.busy = false;
    $("shootBtn").disabled = false;
    $("count").textContent = "";
    if (!goEdit) return;
    state.selectedShot = 0;
    state.selectedSlot = 0;
    state.selectedSticker = -1;
    buildThumbs();
    syncCropInputs();
    show("edit");
    paint();
  }

  function buildThumbs() {
    const box = $("thumbs");
    box.replaceChildren();
    state.shots.forEach(function (shot, i) {
      shot.images.forEach(function (_, k) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = state.mode === "2" ? (i + 1) + (k === 0 ? " kiri" : " kanan") : "Foto " + (i + 1);
        btn.setAttribute("aria-pressed", i === 0 && k === 0 ? "true" : "false");
        btn.addEventListener("click", function () {
          state.selectedShot = i;
          state.selectedSlot = k;
          box.querySelectorAll("button").forEach(function (b) {
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
          syncCropInputs();
        });
        box.appendChild(btn);
      });
    });
  }

  function renderStrip() {
    const geo = geometry(state.template, state.mode);
    const canvas = document.createElement("canvas");
    canvas.width = geo.w;
    canvas.height = geo.h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, geo.w, geo.h);
    ctx.fillStyle = "#1a1814";
    ctx.textAlign = "center";
    if (geo.label) {
      ctx.font = "600 28px Segoe UI, sans-serif";
      ctx.fillText(geo.label, geo.w / 2, 36 + 28);
    }
    geo.frames.forEach(function (slots, i) {
      const shot = state.shots[i];
      slots.forEach(function (slot, k) {
        roundClip(ctx, slot.x, slot.y, slot.w, slot.h, 18);
        ctx.fillStyle = "#d9d3c8";
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
        const img = shot && shot.images[k];
        const crop = shot && shot.crops[k];
        if (img && crop) {
          const r = cropRect(img.width, img.height, slot.w, slot.h, crop.zoom, crop.panX, crop.panY);
          ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, slot.x, slot.y, slot.w, slot.h);
        }
        ctx.restore();
      });
    });
    state.stickers.forEach(function (s) {
      ctx.font = s.size + "px Segoe UI Emoji, Segoe UI Symbol, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.emoji, s.x, s.y);
    });
    const name = ($("boothName").value || "Booth").slice(0, 24);
    const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const foot = geo.footer;
    const qr = qrCanvas(($("qrUrl").value || "").trim());
    const maxText = qr ? foot.w - 150 : foot.w;
    ctx.fillStyle = "#1a1814";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "650 32px Segoe UI, sans-serif";
    ctx.fillText(name, foot.x, foot.y + 58, maxText);
    ctx.font = "22px Segoe UI, sans-serif";
    ctx.fillText(date, foot.x, foot.y + 98, maxText);
    if (qr) {
      const size = 110;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(foot.x + foot.w - size - 8, foot.y + 16, size + 8, size + 8);
      ctx.drawImage(qr, foot.x + foot.w - size - 4, foot.y + 20, size, size);
    }
    return canvas;
  }

  function roundClip(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.clip();
  }

  function paint() {
    const strip = renderStrip();
    preview.width = strip.width;
    preview.height = strip.height;
    preview.getContext("2d").drawImage(strip, 0, 0);
  }

  function canvasPoint(e) {
    const rect = preview.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (preview.width / rect.width),
      y: (e.clientY - rect.top) * (preview.height / rect.height),
    };
  }

  function hitSticker(x, y) {
    for (let i = state.stickers.length - 1; i >= 0; i--) {
      const s = state.stickers[i];
      const dx = x - s.x;
      const dy = y - s.y;
      if (dx * dx + dy * dy <= (s.size * 0.6) * (s.size * 0.6)) return i;
    }
    return -1;
  }

  function onPointerDown(e) {
    const p = canvasPoint(e);
    state.selectedSticker = hitSticker(p.x, p.y);
    if (state.selectedSticker >= 0) {
      $("stickerSize").value = String(state.stickers[state.selectedSticker].size);
      preview.setPointerCapture(e.pointerId);
    }
  }

  function onPointerMove(e) {
    if (state.selectedSticker < 0 || !preview.hasPointerCapture(e.pointerId)) return;
    const p = canvasPoint(e);
    const s = state.stickers[state.selectedSticker];
    s.x = Math.max(0, Math.min(preview.width, p.x));
    s.y = Math.max(0, Math.min(preview.height, p.y));
    paint();
  }

  function onPointerUp(e) {
    if (preview.hasPointerCapture(e.pointerId)) preview.releasePointerCapture(e.pointerId);
  }

  function addSticker(emoji) {
    if (!state.shots.length) return;
    const geo = geometry(state.template, state.mode);
    state.stickers.push({ emoji: emoji, x: geo.w / 2, y: geo.h / 3, size: Number($("stickerSize").value) });
    state.selectedSticker = state.stickers.length - 1;
    paint();
  }

  function download() {
    const strip = renderStrip();
    const out = fitRatio(strip, $("ratio").value);
    const a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = "booth-" + Date.now() + ".png";
    a.click();
  }

  function stopStreams() {
    state.streams.forEach(function (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
    });
    state.streams = [];
    $("cams").replaceChildren();
  }

  function resetToSetup() {
    state.abort = true;
    state.busy = false;
    state.shots = [];
    state.stickers = [];
    stopStreams();
    show("setup");
  }

  function enterDemo() {
    const colors = ["#c4271b", "#2f5d50", "#1d4e89", "#c47b1b", "#5c3d6e", "#333"];
    const n = TEMPLATES[state.template].frames;
    const per = state.mode === "2" ? 2 : 1;
    state.shots = [];
    for (let i = 0; i < n; i++) {
      const images = [];
      const crops = [];
      for (let k = 0; k < per; k++) {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = colors[(i + k) % colors.length];
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = "#fff";
        ctx.font = "64px sans-serif";
        ctx.fillText(String(i + 1), 280, 260);
        images.push(canvas);
        crops.push({ zoom: 1, panX: 0, panY: 0 });
      }
      state.shots.push({ images: images, crops: crops });
    }
    state.stickers = [{ emoji: "⭐", x: 200, y: 200, size: 72 }];
    buildThumbs();
    syncCropInputs();
    show("edit");
    paint();
  }

  window.addEventListener("pagehide", stopStreams);
}

if (typeof process !== "undefined" && process.argv && process.argv.indexOf("--check") !== -1) {
  const assert = require("assert");
  ["vertikal", "kotak", "couple", "ulangtahun", "pose4"].forEach(function (key) {
    ["1", "2"].forEach(function (mode) {
      const geo = geometry(key, mode);
      assert.strictEqual(geo.frames.length, TEMPLATES[key].frames);
      assert.ok(geo.w > 0 && geo.h > 0);
      geo.frames.forEach(function (slots) {
        assert.strictEqual(slots.length, mode === "2" ? 2 : 1);
        slots.forEach(function (s) {
          assert.ok(s.x >= 0 && s.y >= 0);
          assert.ok(s.x + s.w <= geo.w + 0.1);
          assert.ok(s.y + s.h <= geo.footer.y + 0.1);
        });
      });
      assert.ok(geo.footer.y + geo.footer.h <= geo.h);
    });
  });
  const tight = cropRect(640, 480, 420, 560, 1, 0, 0);
  assert.ok(tight.sw <= 640 && tight.sh <= 480);
  assert.ok(Math.abs(tight.sw / tight.sh - 420 / 560) < 0.02);
  const zoomed = cropRect(640, 480, 420, 560, 2, 0, 0);
  assert.ok(zoomed.sw < tight.sw);
  const edged = cropRect(640, 480, 420, 560, 1.4, 1, 1);
  assert.ok(edged.sx >= 0 && edged.sy >= 0);
  assert.ok(edged.sx + edged.sw <= 640.1);
  assert.ok(edged.sy + edged.sh <= 480.1);
  const ids = {};
  FILTERS.forEach(function (g) {
    g.items.forEach(function (item) {
      assert.ok(item.css);
      assert.ok(!ids[item.id]);
      ids[item.id] = true;
    });
  });
  assert.ok(Object.keys(ids).length >= 30);
  const sheet = fitRatio({ width: 400, height: 800, getContext: function () { return null; } }, "asli");
  assert.strictEqual(sheet.width, 400);
  console.log("ok", Object.keys(ids).length, "filters");
}
