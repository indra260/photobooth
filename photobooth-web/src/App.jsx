import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { FILTERS, TEMPLATES, filterById, filterWithIntensity, geometry } from "./booth";
import { paintStrip, downloadStrip, fitRatio } from "./draw";

const STICKER_PACKS = {
  Komik: ["💬", "💥", "💭", "🗯️", "⚡", "🔥", "❓", "❗", "😱", "😵"],
  Cute: ["🌸", "🥰", "🧸", "🎀", "🐰", "🐻", "🍓", "💐", "🫶", "☁️"],
  Party: ["🎉", "🎊", "🥳", "🎈", "🍰", "🕶️", "🎂", "✨", "🪩", "🎁"],
  Y2K: ["🌈", "🦋", "💫", "🌟", "👛", "💽", "📼", "🔮", "🩷", "🫧"],
  Cinta: ["❤️", "💋", "😍", "💕", "💖", "💘", "🖤", "😘", "💞", "💌"],
};
const LOOKS = [
  ["cream", "#f4f1ea"],
  ["komik", "#ffffff"],
  ["lilac", "#f3e9ff"],
  ["blush", "#ffe8ef"],
  ["ink", "#1c1a22"],
  ["film", "#111111"],
  ["lemon", "#fff6c8"],
];
const TIMERS = [1, 3, 5, 10];
const TRENDING = ["✨ Comic Strip", "📸 Polaroid Story", "⚡ Y2K Retro", "💖 Couple Frame", "🎉 Party Pop", "🦄 Cute Leopard", "🌈 Rainbow Glow", "🔥 3L Catch It"];
const SHAPES = [
  ["vertikal", "Classic Strip", "4 foto", "Gaya photobox klasik vertikal", "/templates/t4r.png"],
  ["pose4", "Polaroid", "4 foto", "Estetik ala foto polaroid", "/templates/t-polaroid.webp"],
  ["kotak", "Grid 2x2", "4 foto", "Format grid kotak seimbang", "/templates/t-grid.webp"],
  ["couple", "Couple", "2 foto", "Format khusus berdua", "/templates/t-couple.png"],
  ["ulangtahun", "Party", "3 foto", "Spesial ulang tahun & acara", "/templates/t-party.png"],
  ["komik", "Komik Pop", "4 foto", "Gaya komik strip border tebal", "/templates/t-cute.png"],
  ["buah", "Fresh Fruit", "4 foto", "Warna ceria ala buah segar", "/templates/t-fruit.png"],
  ["pelangi", "Rainbow Glow", "4 foto", "Gradasi pelangi lembut", "/templates/t-rainbow.png"],
  ["macan", "Cute Leopard", "4 foto", "Motif leopard lucu kekinian", "/templates/t-extra2.webp"],
  ["minimal", "Minimal Clean", "4 foto", "Bersih, simple, elegan", "/templates/t-extra1.webp"],
];
const RATIOS = [
  ["asli", "Strip Asli"],
  ["9:16", "Story (9:16)"],
  ["4:5", "Feed (4:5)"],
  ["1:1", "Kotak (1:1)"],
];

const STRINGS = {
  id: {
    mulaimenu: "Mulai Jepret",
    coba: "Coba Sekarang — Gratis",
    unggah: "Unggah Foto",
    nanocam: "Nama Booth",
    qrcode: "QR Code (opsional)",
    undo: "Undo",
    redo: "Redo",
    simpan: "Simpan",
    print: "Cetak",
  },
  en: {
    mulaimenu: "Start Shooting",
    coba: "Try Now — Free",
    unggah: "Upload Photos",
    nanocam: "Booth Name",
    qrcode: "QR Code (optional)",
    undo: "Undo",
    redo: "Redo",
    simpan: "Save",
    print: "Print",
  },
};

export default function App() {
  const [page, setPage] = useState("home"); // 'home', 'software', 'booth', 'creators', 'pricing', 'login'
  const [step, setStep] = useState("boot"); // 'boot' (landing), 'mode' (1/2 device), 'live', 'edit'
  const [mode, setMode] = useState("1"); // '1' = 1 device, '2' = 2 devices (room)
  const [room, setRoom] = useState("");
  const [join, setJoin] = useState("");
  const [template, setTemplate] = useState("vertikal");
  const [timer, setTimer] = useState(3);
  const [filter, setFilter] = useState("iphone-std");
  const [name, setName] = useState("Kentamal Booth");
  const [eventName, setEventName] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [ratio, setRatio] = useState("asli");
  const [look, setLook] = useState("komik");
  const [retouch, setRetouch] = useState({ brightness: 100, contrast: 100, saturate: 100, smooth: 0 });
  const [stickerPack, setStickerPack] = useState("Komik");
  const [mirror, setMirror] = useState(true);
  const [camRatio, setCamRatio] = useState("4:3");
  const [lang, setLang] = useState("id");
  const [dark, setDark] = useState(false);
  const [customFrame, setCustomFrame] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [stats, setStats] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [favTemplates, setFavTemplates] = useState([]);
  const [devices, setDevices] = useState([]);
  const [camDeviceId, setCamDeviceId] = useState("");
  const [peer, setPeer] = useState(null);
  const [peerConn, setPeerConn] = useState(null);
  const [peerStatus, setPeerStatus] = useState("");
  const [filterStrength, setFilterStrength] = useState(100);
  const [confetti, setConfetti] = useState([]);
  const [showOnboard, setShowOnboard] = useState(false);
  const [retakeSlot, setRetakeSlot] = useState(-1);
  const [ink, setInk] = useState(false);
  const [doodles, setDoodles] = useState([]);
  const [texts, setTexts] = useState([]);
  const [pickedText, setPickedText] = useState(-1);
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#202030");
  const [textSize, setTextSize] = useState(36);
  const [animOn, setAnimOn] = useState(false);
  const [animIndex, setAnimIndex] = useState(0);
  const hist = useRef({ past: [], future: [] });
  const pen = useRef(null);
  const [shots, setShots] = useState([]);
  const [order, setOrder] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [picked, setPicked] = useState(-1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState("");
  const [flash, setFlash] = useState(false);
  const [cams, setCams] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [progress, setProgress] = useState(0);
  const abort = useRef(false);
  const audio = useRef(null);
  const soundOnRef = useRef(true);
  useEffect(() => { soundOnRef.current = soundOn; window.__soundOn = soundOn; }, [soundOn]);
  const preview = useRef(null);
  const drag = useRef(null);
  const pinch = useRef(null);

  const frames = TEMPLATES[template].frames;
  const camsRef = useRef([]);
  const T = STRINGS[lang] || STRINGS.id;

  useEffect(() => {
    try { setFavTemplates(JSON.parse(localStorage.getItem("kentamal-favs") || "[]")); } catch { setFavTemplates([]); }
    try {
      const saved = JSON.parse(localStorage.getItem("kentamal-session") || "null");
      if (saved && saved.shots && saved.shots.length) {
        setShots(saved.shots);
        setOrder(saved.order || saved.shots.map((_, i) => i));
        setStickers(saved.stickers || []);
        setTexts(saved.texts || []);
        setTemplate(saved.template || "vertikal");
      }
    } catch { /* ignore */ }
    try {
      const frameUrl = localStorage.getItem("kentamal-frame");
      if (frameUrl) {
        const img = new Image();
        img.onload = () => {
          const saved = JSON.parse(localStorage.getItem("kentamal-session") || "null");
          if (saved && saved.template) {
            const geo = geometry(saved.template, "1");
            const canvas = document.createElement("canvas");
            canvas.width = geo.w;
            canvas.height = geo.h;
            const ctx = canvas.getContext("2d");
            const s = Math.max(geo.w / img.width, geo.h / img.height);
            ctx.drawImage(img, (geo.w - img.width * s) / 2, (geo.h - img.height * s) / 2, img.width * s, img.height * s);
            setCustomFrame(canvas);
          } else setCustomFrame(img);
        };
        img.src = frameUrl;
      }
    } catch { /* ignore */ }
    if (!localStorage.getItem("kentamal-seen")) setShowOnboard(true);
  }, []);

  function dismissOnboard() {
    setShowOnboard(false);
    try { localStorage.setItem("kentamal-seen", "1"); } catch { /* ignore */ }
  }

  useEffect(() => {
    if (step !== "edit") return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem("kentamal-session", JSON.stringify({ shots, order, stickers, texts, template }));
      } catch { /* quota */ }
    }, 600);
    return () => clearTimeout(t);
  }, [shots, order, stickers, texts, template, step]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const from = (params.get("room") || "").toUpperCase();
    if (/^[A-Z0-9]{4}$/.test(from)) {
      setRoom(from);
      setJoin(from);
      return;
    }
    setRoom(Math.random().toString(36).slice(2, 6).toUpperCase());
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("kentamal-gallery") || "[]");
      setGallery(Array.isArray(saved) ? saved : []);
    } catch {
      setGallery([]);
    }
  }, []);

  function saveToGallery() {
    const canvas = document.createElement("canvas");
    const orderedShots = order.map((i) => shots[i]).filter(Boolean);
    paintStrip(canvas, { template, mode: "1", shots: orderedShots, stickers, texts, name, qrUrl, look, ink: doodles, retouch, customFrame });
    const out = fitRatio(canvas, ratio);
    // JPEG small to save quota
    const dataUrl = out.toDataURL("image/jpeg", 0.72);
    const item = { id: Date.now(), url: dataUrl, name, date: new Date().toISOString() };
    setGallery((prev) => {
      const next = [item, ...prev].slice(0, 12);
      try { localStorage.setItem("kentamal-gallery", JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
    return dataUrl;
  }

  function clearGallery() {
    setGallery([]);
    try { localStorage.removeItem("kentamal-gallery"); } catch { /* ignore */ }
  }

  useEffect(() => {
    if (step === "live" && cams.length === 0) open();
  }, [step, cams.length, open]);

  useEffect(() => {
    return () => {
      camsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    };
  }, []);

  useEffect(() => {
    if (step !== "edit" || !preview.current) return;
    const orderedShots = displayOrder.map((i) => shots[i]).filter(Boolean);
    if (orderedShots.length !== frames) return;
    const animShots = animOn && orderedShots.length > 1
      ? [...orderedShots.slice(1), orderedShots[0]]
      : orderedShots;
    paintStrip(preview.current, { template, mode: "1", shots: animShots, stickers, texts, name, qrUrl, look, ink: doodles, retouch, pickedSticker: picked, pickedText, customFrame });
  }, [step, template, displayOrder, shots, stickers, texts, name, qrUrl, frames, look, doodles, retouch, picked, pickedText, animOn, customFrame]);

  useEffect(() => {
    if (!animOn || step !== "edit") return;
    const id = setInterval(() => {
      setAnimIndex((c) => (c + 1) % Math.max(1, order.length));
    }, 900);
    return () => clearInterval(id);
  }, [animOn, step, order.length]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space" && step === "live" && !busy) {
        e.preventDefault();
        if (retakeSlot >= 0) shootSingle(retakeSlot);
        else shoot();
      }
      if ((e.key === "u" || e.key === "U") && step === "edit") undo();
      if ((e.key === "r" || e.key === "R") && step === "edit") redo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // When animating, swap display order so each photo shows briefly
  const displayOrder = animOn && order.length > 1
    ? [...order.slice(animIndex), ...order.slice(0, animIndex)]
    : order;

  function stop() {
    camsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    camsRef.current = [];
    setCams([]);
  }

  async function enterRoom(code) {
    const next = (code || "").toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(next)) {
      setError("Kode room 4 huruf.");
      return;
    }
    setError("");
    setRoom(next);
  }

  async function open() {
    setError("");
    try {
      stop();
      const cams = await openCameras(mode, camRatio, camDeviceId);
      camsRef.current = cams;
      setCams(cams);
      setShots([]);
      setOrder([]);
      setStickers([]);
      abort.current = false;
      setStep("live");
    } catch (err) {
      const msg = err && err.name === "NotAllowedError"
        ? "Kamera diblokir browser. Klik ikon 🔒 di address bar → izinkan Kamera, lalu coba lagi."
        : err && err.name === "NotFoundError"
        ? "Tidak ada kamera terdeteksi di perangkat ini."
        : (err.message || "Kamera tidak bisa dibuka.");
      setError(msg);
      setStep("boot");
      stop();
    }
  }

  function retryCamera() {
    setError("");
    setStep("mode");
  }

  async function openCameras(mode, camRatio, deviceId) {
    const [rw, rh] = (camRatio || "4:3").split(":").map(Number);
    const first = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1280 * rw / rh }, height: { ideal: 720 } },
    });
    if (mode !== "2") { discoverCameras(); return [first]; }
    const used = first.getVideoTracks()[0].getSettings().deviceId;
    const devicesAll = await navigator.mediaDevices.enumerateDevices();
    const list = devicesAll.filter((d) => d.kind === "videoinput" && d.deviceId && d.deviceId !== used);
    if (!list.length) {
      first.getTracks().forEach((t) => t.stop());
      throw new Error("Butuh dua webcam. Yang terbaca cuma satu.");
    }
    const second = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId: { exact: list[0].deviceId }, width: { ideal: 1280 * rw / rh }, height: { ideal: 720 } },
    });
    discoverCameras();
    return [first, second];
  }

  async function discoverCameras() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "videoinput"));
    } catch { /* ignore */ }
  }

  async function loadFiles(files) {
    const list = Array.from(files || []).filter((f) => f.type.startsWith("image/")).slice(0, frames);
    if (!list.length) return;
    const images = await Promise.all(list.map(fileToCanvas));
    const next = images.map((img) => ({ images: [img], crops: [{ zoom: 1, panX: 0, panY: 0 }] }));
    while (next.length < frames) next.push(structuredCloneShot(next[next.length - 1]));
    setShots(next.slice(0, frames));
    setOrder(next.slice(0, frames).map((_, i) => i));
    setStickers([]);
    setPicked(-1);
    setDoodles([]);
    setStep("edit");
  }

  function back() {
    abort.current = true;
    stop();
    setBusy(false);
    setCount("");
    setStep("boot");
  }

  async function shoot() {
    if (busy) return;
    const videos = Array.from(document.querySelectorAll("#cams video"));
    if (!videos.length || videos.some((v) => !v.videoWidth)) {
      setError("Kamera belum siap. Tunggu gambar muncul.");
      return;
    }
    setError("");
    setBusy(true);
    abort.current = false;
    const next = [];
    for (let i = 0; i < frames; i++) {
      for (let sec = timer; sec >= 1; sec--) {
        setCount(String(sec));
        setProgress(((timer - sec + 1) / timer) * 100);
        beep(audio, sec === 1 ? 990 : 740, 0.07);
        vibrateIf(soundOn, 30);
        if (!(await sleep(1000, abort))) return endShoot(false);
      }
      setCount("");
      setProgress(0);
      next.push({
        images: videos.map((video) => grab(video, filter, filterStrength)),
        crops: videos.map(() => ({ zoom: 1, panX: 0, panY: 0 })),
      });
      setShots(next.slice());
      shutter(audio);
      vibrateIf(soundOn, 80);
      setFlash(true);
      setTimeout(() => setFlash(false), 180);
      if (!(await sleep(450, abort))) return endShoot(false);
    }
    setOrder(next.map((_, i) => i));
    setPicked(-1);
    endShoot(true);
  }

  function endShoot(goEdit) {
    setBusy(false);
    setCount("");
    if (goEdit) setStep("edit");
  }

  async function shootSingle(index) {
    // Retake one specific slot
    const videos = Array.from(document.querySelectorAll("#cams video"));
    if (!videos.length || videos.some((v) => !v.videoWidth)) {
      setError("Kamera belum siap.");
      return;
    }
    setError("");
    setBusy(true);
    abort.current = false;
    for (let sec = timer; sec >= 1; sec--) {
      setCount(String(sec));
      beep(audio, sec === 1 ? 990 : 740, 0.07);
      if (!(await sleep(1000, abort))) return endShoot(false);
    }
    setCount("");
    const snap = {
      images: videos.map((video) => grab(video, filter, filterStrength)),
      crops: videos.map(() => ({ zoom: 1, panX: 0, panY: 0 })),
    };
    setShots((prev) => {
      const next = prev.slice();
      if (index < next.length) next[index] = snap;
      else next.push(snap);
      return next;
    });
    shutter(audio);
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    setRetakeSlot(-1);
    endShoot(true);
  }

  function tweakSticker(patch) {
    if (picked < 0) return;
    setStickers((prev) => prev.map((s, i) => (i === picked ? { ...s, ...patch(s) } : s)));
  }

  function addSticker(emoji) {
    pushHistory();
    const geo = geometry(template, "1");
    setStickers((prev) => {
      setPicked(prev.length);
      return [...prev, { emoji, x: geo.w / 2, y: geo.h / 3, size: 88, rot: 0, flip: false }];
    });
  }

  function dropSticker(emoji, e) {
    if (!preview.current) return;
    e.preventDefault();
    const canvas = preview.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    setStickers((prev) => {
      setPicked(prev.length);
      return [...prev, { emoji, x, y, size: 88, rot: 0, flip: false }];
    });
  }

  function addText() {
    if (!textInput.trim()) return;
    pushHistory();
    const geo = geometry(template, "1");
    setTexts((prev) => {
      setPickedText(prev.length);
      return [...prev, { text: textInput, x: geo.w / 2, y: geo.h / 2, size: textSize, color: textColor, rot: 0 }];
    });
    setTextInput("");
  }

  function tweakText(patch) {
    if (pickedText < 0) return;
    setTexts((prev) => prev.map((t, i) => (i === pickedText ? { ...t, ...patch(t) } : t)));
  }

  function editTextContent() {
    if (pickedText < 0) return;
    const t = texts[pickedText];
    if (!t) return;
    const next = window.prompt("Ubah teks:", t.text);
    if (next !== null && next.trim()) {
      pushHistory();
      tweakText(() => ({ text: next.trim() }));
    }
  }

  function pushHistory() {
    hist.current.past.push({ shots, order, stickers, texts, doodles });
    if (hist.current.past.length > 50) hist.current.past.shift();
    hist.current.future = [];
  }

  function undo() {
    const prev = hist.current.past.pop();
    if (!prev) return;
    hist.current.future.push({ shots, order, stickers, texts, doodles });
    setShots(prev.shots); setOrder(prev.order); setStickers(prev.stickers); setTexts(prev.texts); setDoodles(prev.doodles);
  }

  function redo() {
    const next = hist.current.future.pop();
    if (!next) return;
    hist.current.past.push({ shots, order, stickers, texts, doodles });
    setShots(next.shots); setOrder(next.order); setStickers(next.stickers); setTexts(next.texts); setDoodles(next.doodles);
  }

  function reorderShot(from, to) {
    if (from === to || from < 0 || to < 0) return;
    setOrder((prev) => {
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function toggleFav(id) {
    setFavTemplates((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try { localStorage.setItem("kentamal-favs", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function saveJpeg() {
    const canvas = document.createElement("canvas");
    const orderedShots = order.map((i) => shots[i]).filter(Boolean);
    paintStrip(canvas, { template, mode: "1", shots: orderedShots, stickers, texts, name, qrUrl, look, ink: doodles, retouch, customFrame });
    const out = fitRatio(canvas, ratio);
    const a = document.createElement("a");
    a.href = out.toDataURL("image/jpeg", 0.9);
    a.download = `kentamal-${Date.now()}.jpg`;
    a.click();
    saveToGallery();
    bumpStats();
  }

  function onPointerDown(e) {
    if (ink) { pen.current = point(preview.current, e); return; }
    if (e.pointerType === "touch" && pinch.current) return;
    const p = point(preview.current, e);
    const cell = hitCell(template, "1", p.x, p.y);
    const sticker = hitSticker(stickers, p.x, p.y);
    const textHit = hitText(texts, p.x, p.y);
    setPicked(sticker);
    setPickedText(textHit);
    const kind = sticker >= 0 ? "sticker" : textHit >= 0 ? "text" : cell ? "crop" : "none";
    if (kind === "crop") pushHistory();
    drag.current = { kind, ...p, cell, sticker, text: textHit, dist: 0 };
    preview.current.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (ink && pen.current) {
      const p = point(preview.current, e);
      const a = pen.current;
      setDoodles((prev) => [...prev, { x1: a.x, y1: a.y, x2: p.x, y2: p.y }]);
      pen.current = p;
      return;
    }
    const d = drag.current;
    if (!d || d.kind === "none") return;
    const p = point(preview.current, e);
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    d.dist += Math.hypot(dx, dy);
    d.x = p.x;
    d.y = p.y;
    if (d.kind === "sticker") {
      setStickers((prev) => prev.map((s, i) => (i === d.sticker
        ? { ...s, x: clamp(s.x + dx, 0, preview.current.width), y: clamp(s.y + dy, 0, preview.current.height) }
        : s)));
      return;
    }
    if (d.kind === "text") {
      setTexts((prev) => prev.map((t, i) => (i === d.text
        ? { ...t, x: clamp(t.x + dx, 0, preview.current.width), y: clamp(t.y + dy, 0, preview.current.height) }
        : t)));
      return;
    }
    const { shot, slot, w } = d.cell;
    const shotIndex = order[shot];
    const zoom = shots[shotIndex]?.crops[slot]?.zoom || 1;
    const span = Math.max(80, w) * zoom;
    setShots((prev) => prev.map((item, i) => {
      if (i !== shotIndex) return item;
      return {
        ...item,
        crops: item.crops.map((c, k) => (k === slot
          ? { ...c, panX: clamp(c.panX - (dx / span) * 2, -1, 1), panY: clamp(c.panY - (dy / span) * 2, -1, 1) }
          : c)),
      };
    }));
  }

  function onPointerUp(e) {
    if (ink) { pen.current = null; return; }
    const d = drag.current;
    if (preview.current?.hasPointerCapture(e.pointerId)) preview.current.releasePointerCapture(e.pointerId);
    if (d?.kind === "crop" && d.dist < 6 && e.pointerType !== "touch") cycle(d.cell.shot);
    drag.current = null;
  }

  function onWheel(e) {
    const p = point(preview.current, e);
    const cell = hitCell(template, "1", p.x, p.y);
    if (!cell) return;
    e.preventDefault();
    zoomCell(cell, e.deltaY > 0 ? -0.08 : 0.08);
  }

  function onTouchStart(e) {
    if (e.touches.length !== 2) return;
    pinch.current = { dist: touchDist(e), cell: cellAtTouch(e, template, "1") };
  }

  function onTouchMove(e) {
    if (!pinch.current || e.touches.length !== 2 || !pinch.current.cell) return;
    const dist = touchDist(e);
    zoomCell(pinch.current.cell, (dist - pinch.current.dist) / 280);
    pinch.current.dist = dist;
  }

  function onTouchEnd() { pinch.current = null; }

  function zoomCell(cell, delta) {
    pushHistory();
    const shotIndex = order[cell.shot];
    setShots((prev) => prev.map((item, i) => {
      if (i !== shotIndex) return item;
      return {
        ...item,
        crops: item.crops.map((c, k) => (k === cell.slot ? { ...c, zoom: clamp(c.zoom + delta, 1, 2.6) } : c)),
      };
    }));
  }

  function cycle(frameIndex) {
    setOrder((prev) => {
      const next = prev.slice();
      const b = (frameIndex + 1) % next.length;
      [next[frameIndex], next[b]] = [next[b], next[frameIndex]];
      return next;
    });
  }

  function stripLabel() {
    return eventName ? `${name} • ${eventName}` : name;
  }

  function save() {
    const canvas = document.createElement("canvas");
    const orderedShots = order.map((i) => shots[i]).filter(Boolean);
    paintStrip(canvas, { template, mode: "1", shots: orderedShots, stickers, texts, name: stripLabel(), qrUrl, look, ink: doodles, retouch, customFrame });
    downloadStrip(canvas, ratio);
    saveToGallery();
    bumpStats();
    burstConfetti();
  }

  function printStrip() {
    const canvas = document.createElement("canvas");
    const orderedShots = order.map((i) => shots[i]).filter(Boolean);
    paintStrip(canvas, { template, mode: "1", shots: orderedShots, stickers, texts, name, qrUrl, look, ink: doodles, retouch, customFrame });
    const out = fitRatio(canvas, ratio);
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) { setError("Pop-up diblokir. Izinkan pop-up lalu coba lagi."); return; }
    win.document.write(`<html><head><title>Cetak Kentamal</title><style>body{text-align:center;font-family:sans-serif}img{max-width:100%;height:auto}button{margin:12px;padding:10px 24px;font-size:16px;border-radius:8px;border:2px solid #202030;background:#8e36ff;color:#fff;font-weight:bold;cursor:pointer}</style></head><body><img src="${out.toDataURL("image/png")}" /><br/><button onclick="window.print()">🖨️ Cetak</button></body></html>`);
    win.document.close();
  }

  async function shareStrip() {
    const dataUrl = saveToGallery();
    const text = encodeURIComponent(`📸 Hasil photostrip ${name} — bikin punyamu di Kentamal Booth!`);
    const url = encodeURIComponent(typeof location !== "undefined" ? location.href.split("?")[0] : "");
    if (navigator.share) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "kentamal.png", { type: "image/png" });
        await navigator.share({ text: decodeURIComponent(text), files: [file] });
        return;
      } catch { /* fallthrough */ }
    }
    const wa = `https://wa.me/?text=${text}%20${url}`;
    const tg = `https://t.me/share/url?url=${url}&text=${text}`;
    const x = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    const chooser = window.open("", "_blank", "width=480,height=360");
    if (!chooser) return;
    chooser.document.write(`<html><head><title>Bagikan</title><style>body{font-family:sans-serif;text-align:center;padding:24px}a{display:block;margin:12px auto;padding:14px;width:280px;border-radius:12px;border:2px solid #202030;font-weight:bold;text-decoration:none;color:#202030;background:#fff}a:hover{background:#faf5ff}</style></head><body><h3>Bagikan hasil:</h3><a href="${wa}" target="_blank">💬 WhatsApp</a><a href="${tg}" target="_blank">✈️ Telegram</a><a href="${x}" target="_blank">🐦 X / Twitter</a></body></html>`);
    chooser.document.close();
  }

  function deleteFromGallery(id) {
    setGallery((prev) => {
      const next = prev.filter((g) => g.id !== id);
      try { localStorage.setItem("kentamal-gallery", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  // ——— Dark mode ———
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  // ——— Booth stats ———
  useEffect(() => {
    try { setStats(Number(localStorage.getItem("kentamal-stats") || 0)); } catch { setStats(0); }
  }, []);

  // ——— Page transition: wrap page switch in View Transitions API ———
  function goPage(next) {
    const apply = () => setPage(next);
    if (document.startViewTransition) document.startViewTransition(apply);
    else apply();
  }

  // ——— Scroll reveal (IntersectionObserver) ———
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [page, step]);

  // ——— Ripple feedback on any button click ———
  useEffect(() => {
    function onPointerDown(e) {
      const btn = e.target.closest("button");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const d = Math.max(rect.width, rect.height);
      const span = document.createElement("span");
      span.className = "ripple-ink";
      span.style.width = span.style.height = d + "px";
      span.style.left = (e.clientX - rect.left - d / 2) + "px";
      span.style.top = (e.clientY - rect.top - d / 2) + "px";
      btn.appendChild(span);
      setTimeout(() => span.remove(), 550);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // ——— Confetti on save ———
  function burstConfetti() {
    const emojis = ["🎉", "✨", "💜", "⭐", "💖", "🎊"];
    const items = Array.from({ length: 18 }, (_, i) => ({
      id: Date.now() + i,
      emoji: emojis[i % emojis.length],
      x: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 1.2 + Math.random() * 0.8,
    }));
    setConfetti(items);
    setTimeout(() => setConfetti([]), 2400);
  }
  function bumpStats() {
    setStats((s) => {
      const n = s + 1;
      try { localStorage.setItem("kentamal-stats", String(n)); } catch { /* ignore */ }
      return n;
    });
  }

  // ——— Template Creator (custom transparent PNG frame) ———
  function onFrameUpload(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const geo = geometry(template, "1");
      const canvas = document.createElement("canvas");
      canvas.width = geo.w;
      canvas.height = geo.h;
      const ctx = canvas.getContext("2d");
      // Cover-fit the frame image to the strip, preserving transparency
      const s = Math.max(geo.w / img.width, geo.h / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.drawImage(img, (geo.w - dw) / 2, (geo.h - dh) / 2, dw, dh);
      setCustomFrame(canvas);
      try { localStorage.setItem("kentamal-frame", canvas.toDataURL("image/png")); } catch { /* quota */ }
      URL.revokeObjectURL(url);
      setError("");
    };
    img.onerror = () => setError("Gambar frame gagal dibaca.");
    img.src = url;
  }
  function clearFrame() {
    setCustomFrame(null);
    try { localStorage.removeItem("kentamal-frame"); } catch { /* ignore */ }
  }

  // ——— Export WebM animation ———
  async function exportVideo() {
    const canvas = document.createElement("canvas");
    const orderedShots = order.map((i) => shots[i]).filter(Boolean);
    if (orderedShots.length < 2) { setError("Butuh minimal 2 foto buat video animasi."); return; }
    paintStrip(canvas, { template, mode: "1", shots: orderedShots, stickers, texts, name, qrUrl, look, ink: doodles, retouch, customFrame });
    const stream = canvas.captureStream(5);
    const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `kentamal-${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };
    rec.start();
    // Cycle frames: redraw each 600ms, 2 loops
    for (let loop = 0; loop < 2; loop++) {
      for (let i = 0; i < orderedShots.length; i++) {
        const rot = [...orderedShots.slice(i), ...orderedShots.slice(0, i)];
        paintStrip(canvas, { template, mode: "1", shots: rot, stickers, texts, name, qrUrl, look, ink: doodles, retouch, customFrame });
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    rec.stop();
  }

  // ——— PeerJS Room (2 devices real) ———
  function initPeer(roomCode) {
    if (peer) peer.destroy();
    const p = new Peer(roomCode || `kentamal-${Math.random().toString(36).slice(2, 6)}`);
    setPeer(p);
    p.on("open", (id) => {
      setPeerStatus(`Room aktif: ${id}`);
      setRoom(id.replace("kentamal-", "").toUpperCase());
    });
    p.on("connection", (conn) => {
      setPeerConn(conn);
      setPeerStatus("HP teman terhubung! 📱");
      conn.on("data", (data) => {
        if (data && data.type === "photo") {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 1280;
            canvas.height = 960;
            const ctx = canvas.getContext("2d");
            const s = Math.max(canvas.width / img.width, canvas.height / img.height);
            const dw = img.width * s, dh = img.height * s;
            ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
            addRemoteShot(canvas);
          };
          img.src = data.url;
        }
      });
      conn.on("close", () => { setPeerStatus("Teman terputus."); setPeerConn(null); });
    });
    p.on("error", (err) => { setPeerStatus("Room error: " + err.type); });
  }

  function joinPeer(roomCode) {
    const code = (roomCode || join || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (!code) { setError("Masukkan kode room 4 huruf."); return; }
    setError("");
    const p = new Peer();
    setPeer(p);
    p.on("open", () => {
      const conn = p.connect(`kentamal-${code.toLowerCase()}`);
      setPeerConn(conn);
      setPeerStatus("Menghubungkan ke room " + code + "…");
      conn.on("open", () => setPeerStatus("Terhubung ke room " + code + "! 📱"));
      conn.on("data", (d) => { if (d && d.type === "ping") setPeerStatus("Room " + code + " aktif"); });
      conn.on("close", () => { setPeerStatus("Koneksi tertutup."); setPeerConn(null); });
      conn.on("error", () => setPeerStatus("Room tidak ditemukan. Cek kode."));
    });
    p.on("error", (err) => setPeerStatus("Error: " + err.type));
    setRoom(code);
  }

  function addRemoteShot(canvasImg) {
    pushHistory();
    setShots((prev) => {
      const next = prev.slice();
      const target = next.findIndex((s) => !s);
      const snap = { images: canvasImg ? [canvasImg] : [], crops: [{ zoom: 1, panX: 0, panY: 0 }] };
      if (target >= 0) next[target] = snap;
      else if (next.length < frames) next.push(snap);
      else next[0] = snap;
      return next;
    });
    setOrder((prev) => (prev.length < frames ? [...prev, prev.length] : prev));
    bumpStats();
  }

  function sendPhotoToRoom() {
    if (!peerConn || !peerConn.open) { setError("Belum ada room / teman belum terhubung."); return; }
    const canvas = document.createElement("canvas");
    const orderedShots = order.map((i) => shots[i]).filter(Boolean);
    if (!orderedShots.length) { setError("Jepret dulu sebelum kirim."); return; }
    paintStrip(canvas, { template, mode: "1", shots: orderedShots, stickers, texts, name, qrUrl, look, ink: doodles, retouch, customFrame });
    const url = canvas.toDataURL("image/png");
    peerConn.send({ type: "photo", url });
    setPeerStatus("Foto terkirim ke room! ✅");
  }

  async function copyToClipboard() {
    const canvas = document.createElement("canvas");
    const orderedShots = order.map((i) => shots[i]).filter(Boolean);
    paintStrip(canvas, { template, mode: "1", shots: orderedShots, stickers, texts, name, qrUrl, look, ink: doodles, retouch, customFrame });
    const out = fitRatio(canvas, ratio);
    try {
      const blob = await new Promise((r) => out.toBlob(r, "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setError("");
      alert("Fotonya sudah di-copy. Tinggal paste di chat/status.");
    } catch {
      setError("Browser tidak mengizinkan copy otomatis. Pakai tombol Unduh.");
    }
  }

  return (
    <div className={"app " + step}>
      {confetti.length > 0 && (
        <div className="confetti" aria-hidden="true">
          {confetti.map((c) => (
            <span key={c.id} style={{ left: `${c.x}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}>{c.emoji}</span>
          ))}
        </div>
      )}
      {showOnboard && (
        <div className="onboard" role="dialog" aria-modal="true" aria-label="Cara pakai">
          <div className="onboard-card">
            <h2>👋 Selamat datang di Kentamal Booth!</h2>
            <div className="onboard-steps">
              <div><span>1</span><p><b>Pilih template</b> — strip, komik, polaroid, atau couple.</p></div>
              <div><span>2</span><p><b>Jepret</b> — hitung mundur + filter kamera estetik.</p></div>
              <div><span>3</span><p><b>Edit & unduh</b> — stiker, teks, retouch, langsung share.</p></div>
            </div>
            <button className="jp-btn-giant" type="button" onClick={dismissOnboard}>Mulai! 🚀</button>
          </div>
        </div>
      )}
      {error ? (
        <p className="err" role="alert">
          {error}
          {error.includes("Kamera") && <button type="button" className="ghost" style={{ marginLeft: 8 }} onClick={retryCamera}>🔄 Coba Lagi</button>}
        </p>
      ) : null}
      {step === "boot" && (
        <div className="landing">
          <header className="jp-nav">
            <div className="jp-logo">
              <img src="/logo-komik.svg" alt="Kentamal Booth" className="jp-logo-img" style={{ cursor: "pointer" }} onClick={() => goPage("home")} />
              <span className="logo-sub" style={{ display: "none" }}>Booth Photobooth</span>
            </div>
            <nav className="jp-nav-links">
              <button type="button" className={page === "home" ? "on" : ""} onClick={() => goPage("home")}>Home</button>
              <button type="button" className={page === "software" ? "on" : ""} onClick={() => goPage("software")}>Software</button>
              <button type="button" className={page === "booth" ? "on" : ""} onClick={() => goPage("booth")}>Booth</button>
              <button type="button" className={page === "creators" ? "on" : ""} onClick={() => goPage("creators")}>Kreator</button>
              <button type="button" className={page === "pricing" ? "on" : ""} onClick={() => goPage("pricing")}>Harga</button>
            </nav>
            <div className="jp-nav-actions">
              {mode === "2" && (
                <div className="room-badge-nav">
                  <span>Room:</span> <b>{room || "----"}</b>
                </div>
              )}
              <input
                aria-label="Kode room"
                maxLength={4}
                placeholder="Join"
                style={{ width: 62, textAlign: "center", border: "2px solid var(--line)", borderRadius: 12, padding: "4px 8px", fontWeight: 700 }}
                value={join}
                onChange={(e) => setJoin(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") enterRoom(join); }}
              />
              <button className="jp-btn-primary" type="button" onClick={() => setStep("mode")}>{T.mulaimenu}</button>
              <button className="ghost" type="button" onClick={() => goPage("login")}>Masuk</button>
              <button className="ghost" type="button" onClick={() => setLang((l) => (l === "id" ? "en" : "id"))} title="Ganti bahasa">{lang === "id" ? "🇬🇧 EN" : "🇮🇩 ID"}</button>
              <button className="ghost" type="button" onClick={() => setDark((d) => !d)} aria-label="Mode gelap">{dark ? "🌙" : "☀️"}</button>
              <button className="ghost" type="button" onClick={() => setSoundOn((s) => !s)} aria-label="Suara" title="Suara">{soundOn ? "🔊" : "🔇"}</button>
              <span className="stat-pill" title="Total foto dari booth ini">📸 {stats}</span>
            </div>
          </header>

          {page === "home" && (
          <main className="jp-hero-section">
            <div className="jp-hero-content">
              <div className="jp-badge-pill">✦ Photobooth Digital #1 di Indonesia</div>
              <h1>Abadikan Momen <span className="highlight">Bareng Kentamal!</span></h1>
              <p className="jp-subtitle">Abadikan momen seru bersama teman dengan photobooth digital yang keren, praktis, dan modern. Tanpa install aplikasi, langsung dari browser.</p>
              
              <div className="jp-cta-group">
                <button className="jp-btn-giant" type="button" onClick={() => setStep("mode")}>
                  ✨ Coba Sekarang — Gratis
                </button>
                <label className="jp-btn-outline upload">
                  📁 Unggah Foto
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => { loadFiles(e.target.files); e.target.value = ""; }} />
                </label>
              </div>

              <div className="jp-stats-row">
                <div className="stat-card"><b>+72</b><span>Kreator</span></div>
                <div className="stat-card"><b>200K</b><span>Pengguna</span></div>
                <div className="stat-card"><b>100K+</b><span>Template</span></div>
                <div className="stat-card"><b>5.0 ★</b><span>Rating</span></div>
              </div>
            </div>

            <div className="jp-template-showcase" data-reveal>
              <h2>Pilih Template Favoritmu</h2>
              <input
                className="search-box"
                type="search"
                placeholder="🔍 Cari template…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                aria-label="Cari template"
              />
              <div className="catalog">
                {SHAPES.filter(([id, label, , desc]) =>
                  (label + " " + desc + " " + id).toLowerCase().includes(searchQ.toLowerCase())
                ).map(([id, label, count, desc, img]) => (
                  <div key={id} className={"card-wrap" + (favTemplates.includes(id) ? " fav" : "")}>
                    <button type="button" className={template === id ? "card on" : "card"} onClick={() => setTemplate(id)}>
                      <span className="shot">
                        <img src={img} alt={label} loading="lazy" />
                      </span>
                      <span className="meta">
                        <b>{label}</b>
                        <small>{count} • {desc}</small>
                      </span>
                    </button>
                    <button type="button" className="fav-btn" aria-label={`Favorit ${label}`} onClick={() => toggleFav(id)}>
                      {favTemplates.includes(id) ? "⭐" : "☆"}
                    </button>
                  </div>
                ))}
              </div>
              <p className="fine">Klik template lalu <b>Mulai Jepret</b>. Foto kamu otomatis disusun sesuai bentuk template.</p>
            </div>

            <div className="jp-trending" data-reveal>
              <h2>Template Trending</h2>
              <div className="marquee">
                <div className="marquee-track">
                  {TRENDING.concat(TRENDING).map((t, i) => (
                    <span key={i} className="chip">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="jp-steps-section" data-reveal>
              <h2>Cara Kerjanya</h2>
              <div className="steps-grid">
                <div className="step-card">
                  <span className="step-num">1</span>
                  <h3>Pilih Template</h3>
                  <p>Pilih desain strip, komik, atau polaroid yang paling pas buat acaramu.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">2</span>
                  <h3>Jepret Kamera</h3>
                  <p>Hitung mundur otomatis dengan pilihan filter kamera estetik (iPhone, Fuji, Sony).</p>
                </div>
                <div className="step-card">
                  <span className="step-num">3</span>
                  <h3>Edit & Stiker</h3>
                  <p>Geser crop foto, tarik stiker komik lucu, atau coret-coret bebas.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">4</span>
                  <h3>Unduh & Bagikan</h3>
                  <p>Simpan hasil photostrip HD ber-QR code siap pamer di story.</p>
                </div>
              </div>
            </div>

            <div className="jp-creators" data-reveal>
              <h2>Kreator Teratas</h2>
              <div className="creators-row">
                <div className="creator-card">
                  <span className="rank">#1</span>
                  <div className="avatar">🎨</div>
                  <div className="info"><b>jepret cambox</b><small>118 template • 71.5K pakai</small></div>
                </div>
                <div className="creator-card">
                  <span className="rank">#2</span>
                  <div className="avatar">✨</div>
                  <div className="info"><b>Fitrah Ramdani</b><small>19 template • 40.9K pakai</small></div>
                </div>
                <div className="creator-card">
                  <span className="rank">#3</span>
                  <div className="avatar">💖</div>
                  <div className="info"><b>Yuko Studio</b><small>11 template • 39.1K pakai</small></div>
                </div>
              </div>
            </div>

            <div className="jp-testimonials" data-reveal>
              <h2>Kata Pengguna</h2>
              <div className="testi-card">
                <p>“Pas kemarin pake Kentamal buat event kampus, gila sih hasilnya rapi bener dan sat-set banget. Tamu-tamu langsung paham cara pakainya!”</p>
                <span className="testi-author">— Raka, Ketua Panitia Event</span>
              </div>
            </div>
          </main>
          )}

          {page === "software" && (
            <main className="jp-page">
              <h1>Software <span className="highlight">Photobooth</span></h1>
              <p className="jp-subtitle">Alat photobooth lengkap buat event, pernikahan, ulang tahun, dan acara kantor. Semua jalan di browser, tanpa install.</p>
              <div className="steps-grid">
                <div className="step-card">
                  <span className="step-num">🖥️</span>
                  <h3>100% Browser</h3>
                  <p>Buka link, izinkan kamera, langsung jepret. Kompatibel laptop & HP.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">🎞️</span>
                  <h3>Filter Kamera</h3>
                  <p>Preset aesthetic iPhone, Fujifilm, Sony, Canon — langsung di preview kamera.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">🖼️</span>
                  <h3>Template Strip</h3>
                  <p>Puluhan layout: classic strip, polaroid, grid, komik, couple, party.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">📤</span>
                  <h3>QR & Share</h3>
                  <p>Setiap strip punya QR code yang bisa di-scan langsung menuju situs ini.</p>
                </div>
              </div>
              <div className="jp-cta-group">
                <button className="jp-btn-giant" type="button" onClick={open}>✨ Coba Sekarang — Gratis</button>
                <button className="jp-btn-outline" type="button" onClick={() => goPage("pricing")}>💰 Lihat Harga</button>
              </div>
            </main>
          )}

          {page === "creators" && (
            <main className="jp-page">
              <h1>Kreator <span className="highlight">Template</span></h1>
              <p className="jp-subtitle">Bikin dan bagikan template photostrip-mu sendiri ke ribuan pengguna.</p>
              <div className="creators-row">
                <div className="creator-card">
                  <span className="rank">#1</span>
                  <div className="avatar">🎨</div>
                  <div className="info"><b>jepret cambox</b><small>118 template • 71.5K pakai</small></div>
                </div>
                <div className="creator-card">
                  <span className="rank">#2</span>
                  <div className="avatar">✨</div>
                  <div className="info"><b>Fitrah Ramdani</b><small>19 template • 40.9K pakai</small></div>
                </div>
                <div className="creator-card">
                  <span className="rank">#3</span>
                  <div className="avatar">💖</div>
                  <div className="info"><b>Yuko Studio</b><small>11 template • 39.1K pakai</small></div>
                </div>
              </div>
              <div className="jp-cta-group">
                <button className="jp-btn-giant" type="button" onClick={() => goPage("login")}>🎨 Buat Template</button>
                <button className="jp-btn-outline" type="button" onClick={() => goPage("home")}>← Kembali</button>
              </div>
            </main>
          )}

          {page === "pricing" && (
            <main className="jp-page">
              <h1>Harga <span className="highlight">Kentamal</span></h1>
              <p className="jp-subtitle">Mulai gratis. Upgrade kalau butuh fitur lebih buat event besar.</p>
              <div className="steps-grid">
                <div className="step-card">
                  <h3>🆓 Gratis</h3>
                  <p className="price">Rp 0</p>
                  <p>Kamera, template dasar, filter, stiker, unduh PNG. Tanpa batas waktu.</p>
                </div>
                <div className="step-card">
                  <h3>🚀 Pro</h3>
                  <p className="price">Rp 49rb/bulan</p>
                  <p>Semua template premium, QR khusus, hapus watermark, prioritas support.</p>
                </div>
                <div className="step-card">
                  <h3>📦 Event</h3>
                  <p className="price">Rp 199rb/event</p>
                  <p>Printer langsung, backdrop custom, multi-kamera, unlimited tamu.</p>
                </div>
              </div>
              <div className="jp-cta-group">
                <button className="jp-btn-giant" type="button" onClick={() => goPage("login")}>Pilih Paket</button>
              </div>
            </main>
          )}

          {page === "login" && (
            <main className="jp-page">
              <h1>Masuk <span className="highlight">Kentamal</span></h1>
              <p className="jp-subtitle">Masuk buat simpan template, jadi kreator, atau kelola event.</p>
              <div className="login-card">
                <label>Email<input type="email" placeholder="kamu@email.com" /></label>
                <label>Kata Sandi<input type="password" placeholder="••••••••" /></label>
                <button className="jp-btn-giant" type="button">Masuk</button>
                <button className="ghost" type="button" onClick={() => goPage("home")}>← Kembali</button>
              </div>
            </main>
          )}

          {page === "booth" && (
            <main className="jp-page">
              <h1>Booth <span className="highlight">Interaktif</span></h1>
              <p className="jp-subtitle">Fitur photobooth lengkap: filter kamera, template frame, stiker, retouch, QR share.</p>
              <div className="steps-grid">
                <div className="step-card">
                  <span className="step-num">📸</span>
                  <h3>Jepret</h3>
                  <p>Hitung mundur otomatis, flash, suara shutter, mirror preview.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">🎨</span>
                  <h3>Edit</h3>
                  <p>Crop, zoom, stiker kategori, coret bebas, retouch kulit.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">📤</span>
                  <h3>Unduh</h3>
                  <p>PNG HD, rasio story/feed, copy langsung ke clipboard.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">🔗</span>
                  <h3>Share</h3>
                  <p>QR code otomatis mengarah ke situs ini, siap di-scan tamu.</p>
                </div>
              </div>
              <div className="jp-cta-group">
                <button className="jp-btn-giant" type="button" onClick={open}>✨ Buka Booth</button>
              </div>
            </main>
          )}

          <footer className="jp-footer">
            <p>© 2026 Kentamal Booth • Dibuat dengan cinta & semangat web modern Indonesia.</p>
            <div className="jp-nav-links" style={{ justifyContent: "center" }}>
              <button type="button" onClick={() => goPage("home")}>Home</button>
              <button type="button" onClick={() => goPage("software")}>Software</button>
              <button type="button" onClick={() => goPage("pricing")}>Harga</button>
              <button type="button" onClick={() => goPage("creators")}>Kreator</button>
            </div>
          </footer>
        </div>
      )}

      {step === "mode" && (
        <section className="mode-screen">
          <header className="jp-nav" style={{ width: "100%", maxWidth: 900 }}>
            <div className="jp-logo">
              <img src="/logo-komik.svg" alt="Kentamal Booth" className="jp-logo-img" style={{ cursor: "pointer" }} onClick={() => setStep("boot")} />
            </div>
            <button className="ghost" type="button" onClick={() => setStep("boot")}>← Kembali</button>
          </header>

          <main className="jp-page" style={{ maxWidth: 700 }}>
            <h1>Pilih <span className="highlight">Cara Jepret</span></h1>
            <p className="jp-subtitle">Jepret sendiri di satu perangkat, atau ajak teman gabung dari HP masing-masing.</p>

            <div className="mode-grid">
              <button type="button" className="mode-card" onClick={() => { setMode("1"); open(); }}>
                <span className="mode-icon">📱</span>
                <b>1 Perangkat</b>
                <small>Jepret langsung di layar ini. Tanpa kode, tanpa room.</small>
                <span className="mode-cta">Mulai Jepret →</span>
              </button>

              <button type="button" className="mode-card" onClick={() => { setMode("2"); open(); }}>
                <span className="mode-icon">📱📱</span>
                <b>2 Perangkat (Room)</b>
                <small>Laptop = layar utama, HP teman = remote jepret. Butuh room code.</small>
                <span className="mode-cta">Buat Room →</span>
              </button>
            </div>

            <div className="room-help">
              <h3>📲 Cara Gabung ke Room Orang Lain</h3>
              <ol>
                <li>Teman buka <b>Kentamal Booth</b> di HP-nya.</li>
                <li>Klik <b>Mulai Jepret</b> → pilih <b>2 Perangkat (Room)</b>.</li>
                <li>Masukkan <b>Room Code 4 huruf</b> yang tampil di layar utama.</li>
                <li>Klik <b>Gabung</b> — foto dari HP langsung masuk ke strip utama.</li>
              </ol>
              <p>💡 Room code-nya <b>{room || "----"}</b> (otomatis dibuat). Bagikan ke temanmu!</p>
              {peerStatus && <p className="peer-status">🔗 {peerStatus}</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button className="ghost" type="button" onClick={() => initPeer(`kentamal-${(room || "ABCD").toLowerCase()}`)}>🌐 Aktifkan Room Peer</button>
                <button className="ghost" type="button" onClick={() => joinPeer()}>📱 Gabung Room</button>
                <button className="ghost" type="button" onClick={sendPhotoToRoom} disabled={!peerConn || !peerConn.open}>📤 Kirim Foto ke Room</button>
              </div>
            </div>

            <div className="room-help">
              <h3>🎨 Template Creator</h3>
              <p>Upload frame transparan PNG (bolong di tengah) — fotomu muncul di belakangnya.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <label className="ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  🖼️ Upload Frame PNG
                  <input
                    type="file"
                    accept="image/png,image/webp"
                    hidden
                    onChange={(e) => { onFrameUpload(e.target.files[0]); e.target.value = ""; }}
                  />
                </label>
                {customFrame && <button className="ghost" type="button" onClick={clearFrame}>🗑️ Hapus Frame</button>}
              </div>
            </div>
          </main>
        </section>
      )}

      {step === "live" && (
        <section className="live">
          <header>
            <strong>Kentamal Live {mode === "2" ? <span className="room-pill">Room: {room}</span> : null}</strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={camRatio}
                onChange={(e) => setCamRatio(e.target.value)}
                aria-label="Rasio kamera"
                style={{ padding: "8px 10px", borderRadius: 10, border: "2px solid var(--line)", fontWeight: 700, background: "var(--card)", color: "var(--ink)" }}
              >
                <option value="4:3">📐 4:3</option>
                <option value="1:1">⬜ 1:1 Kotak</option>
                <option value="9:16">📱 9:16</option>
              </select>
              {devices.length > 1 && (
                <select
                  value={camDeviceId}
                  onChange={(e) => { setCamDeviceId(e.target.value); if (step === "live") open(); }}
                  aria-label="Pilih kamera"
                  style={{ padding: "8px 10px", borderRadius: 10, border: "2px solid var(--line)", fontWeight: 700, background: "var(--card)", color: "var(--ink)", maxWidth: 160 }}
                >
                  <option value="">📷 Kamera 1</option>
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>📷 Kamera {i + 1}{d.label ? ` — ${d.label}` : ""}</option>
                  ))}
                </select>
              )}
              <button className="ghost" type="button" onClick={() => setMirror((m) => !m)}>
                {mirror ? "🪞 Mirror: On" : "🪞 Mirror: Off"}
              </button>
              <button className="ghost" type="button" onClick={back}>← Batal</button>
            </div>
          </header>
          {progress > 0 && (
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
          {error ? <p className="err" role="alert">{error}</p> : null}
          <Stage cams={cams} filterCss={filterWithIntensity(filterById(filter).css, filterStrength / 100)} count={count} flash={flash} mirror={mirror} />
          <div className="dock">
            <div className="filters" role="listbox" aria-label="Filter">
              <span className="filter-label">🎞️ Filter Kamera</span>
              {FILTERS.flatMap((g) => g.items.map((it) => [g.group, it])).map(([group, item]) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={filter === item.id}
                  className={filter === item.id ? "on" : ""}
                  disabled={busy}
                  onClick={() => setFilter(item.id)}
                  title={`${group} — ${item.name}`}
                >
                  <i className="cam-icon" aria-hidden="true">
                    <img src="/filter-base.jpg" alt="" loading="lazy" style={{ filter: filterWithIntensity(item.css, filterStrength / 100) }} />
                  </i>
                  <b>{item.name}</b>
                  <small>{group}</small>
                </button>
              ))}
            </div>
            <div className="filter-strength">
              <label>Kekuatan Filter: {filterStrength}%</label>
              <input type="range" min={0} max={100} value={filterStrength} onChange={(e) => setFilterStrength(Number(e.target.value))} aria-label="Kekuatan filter" />
            </div>
            <div className="timers">
              {TIMERS.map((n) => (
                <button key={n} type="button" className={timer === n ? "on" : ""} aria-pressed={timer === n} disabled={busy} onClick={() => setTimer(n)}>{n} dtk</button>
              ))}
            </div>
            <div className="bar">
              <div className="dots" aria-label={`${shots.length} dari ${frames} foto`}>
                {Array.from({ length: frames }, (_, i) => (
                  <i key={i} className={i < shots.length ? "done" : i === shots.length && busy ? "on" : ""} />
                ))}
              </div>
              <button
                className="shutter"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (retakeSlot >= 0) shootSingle(retakeSlot);
                  else shoot();
                }}
                aria-label="Jepret"
              >
                <b />
              </button>
              <button className="ghost" type="button" onClick={back}>Batal</button>
            </div>
          </div>
        </section>
      )}

      {step === "edit" && (
        <section className="edit">
          <header>
            <strong>Kentamal Studio</strong>
            <button className="ghost" type="button" onClick={back}>← Beranda</button>
          </header>
          {error ? <p className="err" role="alert">{error}</p> : null}
          <canvas
            id="preview"
            ref={preview}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const emoji = e.dataTransfer.getData("text/emoji");
              if (emoji) { dropSticker(emoji, e); return; }
              const file = e.dataTransfer.files && e.dataTransfer.files[0];
              if (file && file.type.startsWith("image/")) {
                const canvas = preview.current;
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                const cell = hitCell(template, "1", x, y);
                if (cell) {
                  pushHistory();
                  fileToCanvas(file).then((img) => {
                    const shotIndex = order[cell.shot];
                    if (shotIndex === undefined) return;
                    setShots((prev) => prev.map((item, i) => (i === shotIndex
                      ? { ...item, images: item.images.map((im, k) => (k === cell.slot ? img : im)) }
                      : item)));
                  });
                }
              }
            }}
          />
          <p className="fine">Geser foto untuk crop. Cubit untuk zoom. Stiker: tarik & drop ke foto, lalu atur ukuran/putar.</p>
          <div className="thumbs">
            {order.map((shotIdx, i) => {
              const shot = shots[shotIdx];
              return (
                <div key={i} className="thumb-wrap">
                  <button
                    type="button"
                    draggable
                    aria-label={`Foto urutan ${i + 1}, tarik untuk pindah posisi`}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/shot-index", String(i));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIdx = Number(e.dataTransfer.getData("text/shot-index"));
                      if (!isNaN(fromIdx)) reorderShot(fromIdx, i);
                    }}
                  >
                    <Thumb shot={shot} />
                  </button>
                  <button
                    type="button"
                    className="retake-btn"
                    onClick={() => { setRetakeSlot(i); setStep("live"); }}
                  >
                    📸 Foto Ulang
                  </button>
                </div>
              );
            })}
          </div>
          <div className="looks" role="group" aria-label="Warna frame">
            {LOOKS.map(([id, color]) => (
              <button key={id} type="button" className={look === id ? "on" : ""} aria-label={id} aria-pressed={look === id} style={{ background: color }} onClick={() => setLook(id)} />
            ))}
          </div>
          <div className="shapes slim">
            {SHAPES.map(([id, label]) => (
              <button key={id} type="button" className={template === id ? "on" : ""} aria-pressed={template === id} onClick={() => setTemplate(id)}>{label}</button>
            ))}
          </div>
          <div className="sticker-tabs" role="tablist">
            {Object.keys(STICKER_PACKS).map((pack) => (
              <button
                key={pack}
                type="button"
                className={stickerPack === pack ? "on" : ""}
                onClick={() => setStickerPack(pack)}
              >
                {pack}
              </button>
            ))}
          </div>

          <div className="stickers">
            {(STICKER_PACKS[stickerPack] || []).map((emoji) => (
              <button
                key={emoji}
                type="button"
                draggable
                aria-label={`Stiker ${emoji}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/emoji", emoji);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => addSticker(emoji)}
              >
                {emoji}
              </button>
            ))}
            <button type="button" disabled={picked < 0} onClick={() => tweakSticker((s) => ({ size: clamp(s.size + 14, 36, 200) }))}>➕ Besar</button>
            <button type="button" disabled={picked < 0} onClick={() => tweakSticker((s) => ({ rot: (s.rot + 15) % 360 }))}>🔄 Putar</button>
            <button type="button" disabled={picked < 0} onClick={() => tweakSticker((s) => ({ flip: !s.flip }))}>↔️ Balik</button>
            <button type="button" className={ink ? "on" : ""} aria-pressed={ink} onClick={() => setInk((v) => !v)}>{ink ? "✏️ Selesai Coret" : "✏️ Coret"}</button>
            <button type="button" disabled={!doodles.length} onClick={() => setDoodles([])}>🗑️ Hapus Coret</button>
            <button type="button" disabled={picked < 0} onClick={() => {
              setStickers((prev) => prev.filter((_, i) => i !== picked));
              setPicked(-1);
            }}>❌ Hapus Stiker</button>
          </div>
          <div className="text-tools">
            <input
              aria-label="Tambah teks"
              placeholder="Tulis caption…"
              value={textInput}
              maxLength={40}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addText(); }}
            />
            <input type="color" aria-label="Warna teks" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            <input type="range" aria-label="Ukuran teks" min={20} max={80} value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} />
            <button type="button" className="ghost" onClick={addText} disabled={!textInput.trim()}>➕ Tambah</button>
            <button type="button" className="ghost" disabled={pickedText < 0} onClick={editTextContent}>✏️ Edit</button>
            <button type="button" className="ghost" disabled={pickedText < 0} onClick={() => tweakText((t) => ({ rot: (t.rot + 15) % 360 }))}>🔄 Putar</button>
            <button type="button" className="ghost" disabled={pickedText < 0} onClick={() => {
              setTexts((prev) => prev.filter((_, i) => i !== pickedText));
              setPickedText(-1);
            }}>🗑️ Hapus</button>
          </div>

          <div className="undo-bar">
            <button type="button" className="ghost" onClick={undo} disabled={!hist.current.past.length}>↩️ Undo</button>
            <button type="button" className="ghost" onClick={redo} disabled={!hist.current.future.length}>↪️ Redo</button>
            <button type="button" className="ghost" onClick={() => setAnimOn((v) => !v)}>{animOn ? "⏸️ Animasi Nyala" : "▶️ Preview Animasi"}</button>
          </div>

          <div className="foot">
            <label>Nama Booth<input maxLength={24} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Nama Event (opsional)<input maxLength={24} value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Ultah Rara, Wisuda, dll" /></label>
            <label>Tautan QR (opsional)<input type="url" inputMode="url" placeholder={typeof location !== "undefined" ? location.origin : "https://"} value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} /></label>
          </div>
          <p className="fine">QR kosong = otomatis mengarah ke <b>{typeof location !== "undefined" ? location.href.split("?")[0] : "situs ini"}</b>, bisa di-scan langsung dari strip.</p>

          <div className="retouch-panel">
            <label>Kecerahan ({retouch.brightness}%)
              <input type="range" min={70} max={140} value={retouch.brightness} onChange={(e) => setRetouch((r) => ({ ...r, brightness: Number(e.target.value) }))} />
            </label>
            <label>Kontras ({retouch.contrast}%)
              <input type="range" min={70} max={140} value={retouch.contrast} onChange={(e) => setRetouch((r) => ({ ...r, contrast: Number(e.target.value) }))} />
            </label>
            <label>Saturasi ({retouch.saturate}%)
              <input type="range" min={50} max={160} value={retouch.saturate} onChange={(e) => setRetouch((r) => ({ ...r, saturate: Number(e.target.value) }))} />
            </label>
            <label>Smooth Kulit ({retouch.smooth})
              <input type="range" min={0} max={5} value={retouch.smooth} onChange={(e) => setRetouch((r) => ({ ...r, smooth: Number(e.target.value) }))} />
            </label>
            <button type="button" className="ghost" onClick={() => setRetouch({ brightness: 100, contrast: 100, saturate: 100, smooth: 0 })}>Reset Retouch</button>
          </div>

          <div className="timers">
            {RATIOS.map(([id, label]) => (
              <button key={id} type="button" className={ratio === id ? "on" : ""} aria-pressed={ratio === id} onClick={() => setRatio(id)}>{label}</button>
            ))}
          </div>
          <div className="bar">
            <button className="shutter big" type="button" onClick={save}>{T.simpan} PNG</button>
            <button className="ghost" type="button" onClick={saveJpeg}>🗜️ JPEG</button>
            <button className="ghost" type="button" onClick={copyToClipboard}>📋 Copy Gambar</button>
            <button className="ghost" type="button" onClick={shareStrip}>📤 Bagikan</button>
            <button className="ghost" type="button" onClick={printStrip}>🖨️ Cetak</button>
            <button className="ghost" type="button" onClick={exportVideo}>🎬 Unduh Video</button>
            <button className="ghost" type="button" onClick={open}>Foto Ulang</button>
          </div>
          {gallery.length > 0 && (
            <div className="gallery">
              <div className="gallery-head">
                <h3>🖼️ Hasil Tersimpan ({gallery.length})</h3>
                <button type="button" className="ghost" onClick={clearGallery}>🗑️ Hapus Semua</button>
              </div>
              <div className="gallery-row">
                {gallery.map((g) => (
                  <div key={g.id} className="gallery-item">
                    <img src={g.url} alt={g.name} loading="lazy" />
                    <div className="gallery-actions">
                      <a href={g.url} download={`kentamal-${g.id}.png`}>⬇️</a>
                      <button type="button" onClick={() => deleteFromGallery(g.id)} title="Hapus">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function StripMark({ id }) {
  const n = TEMPLATES[id].frames;
  const grid = TEMPLATES[id].layout === "grid";
  return (
    <span className={"mark " + (grid ? "grid" : "")} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <i key={i} />)}
    </span>
  );
}

function Stage({ cams, filterCss, count, flash, mirror }) {
  return (
    <div className="stage">
      <div className={"cams" + (cams.length > 1 ? " dual" : "")} id="cams">
        {cams.map((stream, i) => <Cam key={stream.id || i} stream={stream} filterCss={filterCss} mirror={mirror} />)}
      </div>
      <div className="count" aria-live="assertive">{count}</div>
      <div className={flash ? "flash on" : "flash"} />
    </div>
  );
}

function Cam({ stream, filterCss, mirror }) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    video.srcObject = stream;
    video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted style={{ filter: filterCss, transform: mirror !== false ? "scaleX(-1)" : "none" }} />;
}

function Thumb({ shot }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const img = shot.images[0];
    if (!canvas || !img) return;
    canvas.width = 96;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const s = Math.max(canvas.width / img.width, canvas.height / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  }, [shot]);
  return <canvas ref={ref} />;
}

function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gambar gagal dibaca.")); };
    img.src = url;
  });
}

function structuredCloneShot(shot) {
  return { images: shot.images, crops: shot.crops.map((c) => ({ ...c })) };
}

function grab(video, filterId, strength) {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1280 / w);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.filter = filterWithIntensity(filterById(filterId).css, (strength ?? 100) / 100);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  return canvas;
}

function vibrate(ms) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch { /* unsupported */ }
}

function vibrateIf(on, ms) {
  if (on === false) return;
  vibrate(ms);
}

function sleep(ms, abort) {
  return new Promise((resolve) => {
    const start = performance.now();
    function tick() {
      if (abort.current) return resolve(false);
      if (performance.now() - start >= ms) return resolve(true);
      requestAnimationFrame(tick);
    }
    tick();
  });
}

function beep(audio, freq, dur, enabled) {
  if (enabled === false || window.__soundOn === false) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audio.current) audio.current = new Ctx();
  const ctx = audio.current;
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

function shutter(audio) {
  beep(audio, 160, 0.09);
  setTimeout(() => beep(audio, 90, 0.12), 40);
}

function point(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function hitCell(template, mode, x, y) {
  const geo = geometry(template, mode);
  for (let i = 0; i < geo.frames.length; i++) {
    for (let k = 0; k < geo.frames[i].length; k++) {
      const s = geo.frames[i][k];
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return { shot: i, slot: k, w: s.w };
    }
  }
  return null;
}

function cellAtTouch(e, template, mode) {
  const touch = e.touches[0];
  const target = e.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = (touch.clientX - rect.left) * (target.width / rect.width);
  const y = (touch.clientY - rect.top) * (target.height / rect.height);
  return hitCell(template, mode, x, y);
}

function touchDist(e) {
  const [a, b] = e.touches;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function hitSticker(stickers, x, y) {
  for (let i = stickers.length - 1; i >= 0; i--) {
    const s = stickers[i];
    const r = s.size / 2 + 10;
    if (Math.hypot(x - s.x, y - s.y) <= r) return i;
  }
  return -1;
}

function hitText(texts, x, y) {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    const half = (t.size || 36) / 2 + 12;
    if (Math.abs(x - t.x) <= half * 2.5 && Math.abs(y - t.y) <= half) return i;
  }
  return -1;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
