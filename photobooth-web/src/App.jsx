import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FILTERS, TEMPLATES, filterById, filterWithIntensity, geometry } from "./booth";
import { downloadStrip, fitRatio, paintStrip } from "./draw";
import { authEnabled, supabase } from "./supabase";
import { cameraErrorMessage, discoverCameras, grab, openCamera, openDualCameras, stopStreams } from "./lib/camera";
import { beep, printer, shutter, sleep, vibrate } from "./lib/sound";
import MotionDetector from "./lib/motion-detector";
import { composeStrip, stripBlob } from "./lib/strip";
import { clearShots, deleteShot, listShots, putShot } from "./lib/gallery";
import { clearSession, loadSession, saveSession } from "./lib/session";
import TimelinePhotoReveal from "./components/TimelinePhotoReveal";
import AROverlay from "./components/AROverlay";

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
const RETOUCH_PRESETS = {
  Cerah: { brightness: 112, contrast: 104, saturate: 110, smooth: 2 },
  Lembut: { brightness: 106, contrast: 96, saturate: 92, smooth: 3 },
  Mono: { brightness: 102, contrast: 118, saturate: 0, smooth: 0 },
};
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
// Preset layout untuk studio: satu klik = template + rasio cetak sekaligus.
const LAYOUTS = [
  ["vertikal-9:16", "Classic Strip · 9:16", "vertikal"],
  ["pose4-1:1", "Polaroid · 1:1", "pose4"],
  ["kotak-1:1", "Kotak Grid 2x2 · 1:1", "kotak"],
  ["couple-2:3", "Couple · 2:3", "couple"],
  ["ulangtahun-4:5", "Party · 4:5", "ulangtahun"],
  ["komik-1:1", "Komik Pop · 1:1", "komik"],
  ["buah-9:16", "Fresh Fruit · 9:16", "buah"],
  ["pelangi-1:1", "Rainbow Glow · 1:1", "pelangi"],
  ["macan-1:1", "Cute Leopard · 1:1", "macan"],
  ["minimal-9:16", "Minimal Clean · 9:16", "minimal"],
];
// template id → [layoutId, ratio] (reverse lookup, biar tombol template bisa set rasio yg bener)
const LAYOUT_BY_TEMPLATE = Object.fromEntries(LAYOUTS.map(([lid, , tpl]) => [tpl, lid]));
const RATIO_BY_LAYOUT = Object.fromEntries(LAYOUTS.map(([lid, , tpl]) => [lid, lid.slice(tpl.length + 1)]));
const RATIOS = [
  ["asli", "Strip Asli"],
  ["9:16", "Story (9:16)"],
  ["4:5", "Feed (4:5)"],
  ["1:1", "Kotak (1:1)"],
  ["3:2", "Cetak 4R (3:2)"],
  ["2:3", "Cetak 4R potret (2:3)"],
];

const STRINGS = {
  id: {
    mulaimenu: "Mulai Jepret",
    coba: "Coba Sekarang — Gratis",
    unggah: "Unggah Foto",
    simpan: "Simpan",
    cetak: "Cetak",
    bagikan: "Bagikan",
    salin: "Copy Gambar",
    video: "Video",
    namaBooth: "Nama Booth",
    tautanQR: "Tautan QR (opsional)",
    tabTemplate: "Template",
    tabWarna: "Warna",
    tabStiker: "Stiker",
    tabTeks: "Teks",
    tabRetouch: "Retouch",
    tabUnduh: "Unduh",
    galeri: "Hasil Tersimpan",
    fotoUlang: "Foto Ulang",
  },
  en: {
    mulaimenu: "Start Shooting",
    coba: "Try Now — Free",
    unggah: "Upload Photos",
    simpan: "Save PNG",
    cetak: "Print",
    bagikan: "Share",
    salin: "Copy Image",
    video: "Video",
    namaBooth: "Booth Name",
    tautanQR: "QR Link (optional)",
    tabTemplate: "Template",
    tabWarna: "Colors",
    tabStiker: "Stickers",
    tabTeks: "Text",
    tabRetouch: "Retouch",
    tabUnduh: "Export",
    galeri: "Saved Strips",
    fotoUlang: "Retake",
  },
};

const emptyRetouch = { brightness: 100, contrast: 100, saturate: 100, smooth: 0 };

// ——— util motion: hormatin prefers-reduced-motion ———
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ——— Error boundary: tangkap crash render biar gak white screen ———
export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("[Kentamal] render crash:", err, info?.componentStack); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg, #f4f2fb)", color: "var(--ink, #241d3d)", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center", background: "var(--card, #fff)", border: "2.5px solid var(--line, #241d3d)", borderRadius: 18, padding: "24px", boxShadow: "4px 4px 0 var(--line, #241d3d)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px" }}>😵 Ada yang error</h2>
            <p style={{ fontSize: 14, color: "var(--muted, #6f6690)", margin: "0 0 18px" }}>
              Aplikasi sempat crash, tapi fotomu tetap aman di galeri lokal. Coba muat ulang.
            </p>
            <button type="button" onClick={() => location.reload()} style={{ background: "var(--accent, #4f46e5)", color: "#fff", border: 0, borderRadius: 999, padding: "10px 22px", fontWeight: 800, cursor: "pointer" }}>
              🔁 Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [page, setPage] = useState("home"); // home | software | booth | creators | pricing | login
  const [step, setStep] = useState("boot"); // boot (landing) | mode | live | edit
  const [mode, setMode] = useState("1"); // '1' one device, '2' room
  const [room, setRoom] = useState("");
  const [join, setJoin] = useState("");
  const [roomRole, setRoomRole] = useState("host"); // host = layar utama, guest = kirim foto
  const [template, setTemplate] = useState("vertikal");
  const [timer, setTimer] = useState(3);
  const [filter, setFilter] = useState("iphone-std");
  const [name, setName] = useState("Kentamal Booth");
  const [eventName, setEventName] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [ratio, setRatio] = useState("asli");
  const [look, setLook] = useState("komik");
  const [retouch, setRetouch] = useState(emptyRetouch);
  const [stickerPack, setStickerPack] = useState("Komik");
  const [mirror, setMirror] = useState(true);
  const [camRatio, setCamRatio] = useState("4:3");
  const [dualCams, setDualCams] = useState(false);
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("kentamal-lang") || "id"; } catch { return "id"; }
  });
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("kentamal-theme") === "dark"; } catch { return false; }
  });
  const [customFrame, setCustomFrame] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [stats, setStats] = useState(0);
  const [scrollAt, setScrollAt] = useState({ up: false, down: true });
  const [kbdHint, setKbdHint] = useState("");
  const kbdHintTimer = useRef(null);
  const [soundOn, setSoundOn] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll FAB: ↑ muncul pas udah turun, ↓ ilang pas udah mentok bawah
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollAt({ up: y > 420, down: y < max - 240 });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [favTemplates, setFavTemplates] = useState([]);
  const [devices, setDevices] = useState([]);
  const [camDeviceId, setCamDeviceId] = useState("");
  const [peerStatus, setPeerStatus] = useState("");
  const [remoteStripUrl, setRemoteStripUrl] = useState("");
  const [filterStrength, setFilterStrength] = useState(100);
  const [confetti, setConfetti] = useState([]);
  const [showOnboard, setShowOnboard] = useState(false);
  const [retakeSlot, setRetakeSlot] = useState(-1);
  const [ink, setInk] = useState(false);
  const [doodles, setDoodles] = useState([]);
  const [texts, setTexts] = useState([]);
  const [pickedText, setPickedText] = useState(-1);
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#241d3d");
  const [textSize, setTextSize] = useState(36);
  const [animOn, setAnimOn] = useState(false);
  const [animIndex, setAnimIndex] = useState(0);
  const [tab, setTab] = useState("template");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState(""); // "camera" memicu tombol retry
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState("");
  const [flash, setFlash] = useState(false);
  const [cams, setCams] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [progress, setProgress] = useState(0);
  const [shots, setShots] = useState([]);
  const [order, setOrder] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [picked, setPicked] = useState(-1);
  const [fly, setFly] = useState(null); // animasi foto "terbang" kamera → studio
  const [developing, setDeveloping] = useState(false);
  const [printerShot, setPrinterShot] = useState("");
  const [guestFlags, setGuestFlags] = useState([]); // index shots hasil dari HP teman
  const [tourHint, setTourHint] = useState(false);

  // === FITUR BARU: Motion & Face Detection ===
  const [motionDetect, setMotionDetect] = useState(false); // toggle auto-capture via gerakan
  const [smileDetect, setSmileDetect] = useState(false); // toggle auto-capture via senyum
  const [faceVisible, setFaceVisible] = useState(false); // wajah terdeteksi realtime
  const [smileLevel, setSmileLevel] = useState(0); // 0-100% untuk progress ring
  const [motionLevel, setMotionLevel] = useState(0); // 0-100% motion intensity
  const motionDetector = useRef(null);
  const autoCaptureLock = useRef(false); // anti-spam guard

  // === FITUR BARU: Live Counter & Stats ===
  const [sessionStats, setSessionStats] = useState(() => {
    try {
      const raw = localStorage.getItem("kentamal-stats");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Validasi shape — migrasi dari format lama (plain number) ke object
        if (typeof parsed === "object" && parsed && "total" in parsed) return parsed;
        if (!isNaN(Number(parsed))) return { today: Number(parsed), total: Number(parsed), date: new Date().toDateString(), badges: [] };
      }
    } catch { /* ignore */ }
    return { today: 0, total: 0, date: new Date().toDateString(), badges: [] };
  });
  const [badgePopup, setBadgePopup] = useState(null); // badge baru yang barusan unlock
  const [timelineIndex, setTimelineIndex] = useState(-1); // foto yg lagi dilihat di timeline

  // === FITUR BARU: Shutter Sound FX Variants ===
  const [shutterFx, setShutterFx] = useState(() => {
    try { return localStorage.getItem("kentamal-shutterfx") || "retro"; } catch { return "retro"; }
  });
  const SHUTTER_FX = [
    ["retro", "Retro", "📷", "Klasik kamera film"],
    ["mechanical", "Mechanical", "⚙️", "SLR professional"],
    ["cinematic", "Cinematic", "🎬", "Whoosh dramatis"],
    ["arcade", "Arcade", "🕹️", "8-bit blip"],
  ];

  // === FITUR BARU: Timeline Photo Reveal ===
  const [showTimeline, setShowTimeline] = useState(false);
  
  // === FITUR BARU: AR Sticker Props (head-following accessories) ===
  const [arProp, setArProp] = useState(null);
  const arPropRef = useRef(null);
  const [lastLandmarks, setLastLandmarks] = useState(null);
  
  const [collabActive, setCollabActive] = useState(false);
  const [collabFeed, setCollabFeed] = useState([]); // incoming foto dari device lain
  const [collabCode, setCollabCode] = useState("");

  const abort = useRef(false);
  const tiltWrap = useRef(null);
  const hist = useRef({ past: [], future: [] });
  const [histLen, setHistLen] = useState([0, 0]); // [past, future] — buat disabled state tombol
  const pen = useRef(null);
  const preview = useRef(null);
  const drag = useRef(null);
  const pinch = useRef(null);
  const peer = useRef(null);
  const conns = useRef([]);
  const peerMod = useRef(null);
  const roomSeq = useRef(0);
  const camsRef = useRef([]);
  const canRetryCamera = errorKind === "camera";
  const frames = TEMPLATES[template].frames;
  const T = STRINGS[lang] || STRINGS.id;
  // layout aktif: id preset yg cocok dgn template+ratio sekarang, else default preset template itu
  const layout = RATIO_BY_LAYOUT[`${template}-${ratio}`] ? `${template}-${ratio}` : LAYOUT_BY_TEMPLATE[template];

  // ——— derived ———
  const displayOrder = useMemo(
    () => (animOn && order.length > 1 ? [...order.slice(animIndex), ...order.slice(0, animIndex)] : order),
    [animOn, order, animIndex]
  );
  const orderedShots = useMemo(() => order.map((i) => shots[i]).filter(Boolean), [order, shots]);

  const stripLabel = () => (eventName ? `${name} • ${eventName}` : name);
  const paintOpts = useCallback((extra) => ({
    template,
    mode: "1",
    shots: order.map((i) => shots[i]).filter(Boolean),
    stickers,
    texts,
    name: stripLabel(),
    qrUrl,
    look,
    ink: doodles,
    retouch,
    customFrame,
    ...extra,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [template, order, shots, stickers, texts, name, eventName, qrUrl, look, doodles, retouch, customFrame]);

  // ——— auth ———
  useEffect(() => {
    if (!authEnabled) return;
    supabase.auth.getSession().then(({ data, error: err }) => {
      if (err) setAuthMessage("Tidak bisa cek sesi. Coba lagi.");
      else setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) setPage("home");
  }, [user]);

  async function submitAuth(event) {
    event.preventDefault();
    const email = authEmail.trim().toLowerCase();
    if (!authEnabled) {
      setAuthMessage("Akun sedang tidak aktif di perangkat ini. Semua fitur booth tetap bisa dipakai tanpa login.");
      return;
    }
    if (!email || !authPassword) {
      setAuthMessage("Email dan kata sandi wajib diisi.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    if (authMode === "register") {
      const { error: err } = await supabase.auth.signUp({ email, password: authPassword });
      setAuthBusy(false);
      if (err) {
        setAuthMessage(err.message.toLowerCase().includes("already registered")
          ? "Email sudah terdaftar — langsung Masuk saja."
          : "Pendaftaran gagal: " + err.message);
        return;
      }
      setAuthMessage("Cek email untuk konfirmasi, lalu Masuk. ✅");
      setAuthMode("login");
      setAuthPassword("");
      return;
    }
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: authPassword });
    setAuthBusy(false);
    if (err) {
      setAuthMessage("Email atau kata sandi salah.");
      return;
    }
    setUser(data.user);
    setAuthPassword("");
    goPage("home");
  }

  async function logout() {
    if (!authEnabled) { setUser(null); return; }
    const { error: err } = await supabase.auth.signOut();
    if (err) { setAuthMessage("Gagal keluar. Coba lagi."); return; }
    setUser(null);
    goPage("home");
  }

  // ——— bootstrap: favs, session, frame, gallery, onboarding, stats ———
  useEffect(() => {
    try { setFavTemplates(JSON.parse(localStorage.getItem("kentamal-favs") || "[]")); } catch { setFavTemplates([]); }
    try { setStats(Number(localStorage.getItem("kentamal-stats") || 0)); } catch { setStats(0); }
    if (!localStorage.getItem("kentamal-seen")) setShowOnboard(true);
    loadSession().then((saved) => {
      if (saved && saved.shots?.length) {
        setShots(saved.shots);
        setOrder(saved.order || saved.shots.map((_, i) => i));
        setStickers(saved.stickers || []);
        setTexts(saved.texts || []);
        setTemplate(saved.template || "vertikal");
      }
    });
    listShots().then((items) => {
      setGallery(items.map((it) => ({ id: it.id, url: URL.createObjectURL(it.blob), name: it.name })));
    });
    try {
      const frameUrl = localStorage.getItem("kentamal-frame");
      if (frameUrl) {
        const img = new Image();
        img.onload = () => {
          const geo = geometry(template, "1");
          const canvas = document.createElement("canvas");
          canvas.width = geo.w;
          canvas.height = geo.h;
          const ctx = canvas.getContext("2d");
          const s = Math.max(geo.w / img.width, geo.h / img.height);
          ctx.drawImage(img, (geo.w - img.width * s) / 2, (geo.h - img.height * s) / 2, img.width * s, img.height * s);
          setCustomFrame(canvas);
        };
        img.src = frameUrl;
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismissOnboard() {
    setShowOnboard(false);
    try { localStorage.setItem("kentamal-seen", "1"); } catch { /* ignore */ }
  }

  // autosave sesi edit (shots jadi dataURL kecil, bukan objek canvas rusak)
  useEffect(() => {
    if (step !== "edit") return;
    const t = setTimeout(() => {
      saveSession({ shots, order, stickers, texts, template });
    }, 600);
    return () => clearTimeout(t);
  }, [shots, order, stickers, texts, template, step]);

  // ——— room code dari URL: ?room=ABCD → auto-gabung ———
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const from = (params.get("room") || "").toUpperCase();
    if (/^[A-Z0-9]{4}$/.test(from)) {
      setRoom(from);
      setJoin(from);
      setMode("2");
      setRoomRole("guest");
      setStep("mode");
      return;
    }
    setRoom(Math.random().toString(36).slice(2, 6).toUpperCase());
  }, []);

  useEffect(() => {
    try { localStorage.setItem("kentamal-lang", lang); } catch { /* ignore */ }
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    try { localStorage.setItem("kentamal-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);

  // === PERSISTENCE: Shutter FX variant ===
  useEffect(() => {
    try { localStorage.setItem("kentamal-shutterfx", shutterFx); } catch { /* ignore */ }
  }, [shutterFx]);

  // === MOTION DETECTOR: Initialize & manage lifecycle ===
  useEffect(() => {
    if (!motionDetect && !smileDetect) {
      motionDetector.current?.stop();
      return;
    }

    const video = document.querySelector("#cams video");
    if (!video || motionDetector.current) return;

    motionDetector.current = new MotionDetector(video, {
      onFaceDetected: ({ landmarks, smile, motion }) => {
        setFaceVisible(true);
        setLastLandmarks(landmarks); // Save for AR overlay
        
        // Update UI indicators
        const openness = Math.round(smile.mouthOpenness * 100);
        setSmileLevel(openness);
        setMotionLevel(Math.round(motionLevel)); // Keep existing level (updated separately)
        
        // Auto-capture via smile
        if (smileDetect && smile.isSmiling && !autoCaptureLock.current) {
          autoCaptureLock.current = true;
          
          // Trigger shutter with delay
          setTimeout(async () => {
            if (!abort.current) {
              await shoot();
              autoCaptureLock.current = false;
            }
          }, 800); // Wait for clear smile detection
        }
        
        // Auto-capture via motion (if enabled)
        if (motionDetect && motion.distance > 15 && !autoCaptureLock.current) {
          autoCaptureLock.current = true;
          setTimeout(async () => {
            if (!abort.current) {
              await shoot();
              autoCaptureLock.current = false;
            }
          }, 500);
        }
      },
      
      onSmileDetected: ({ mouthOpenness }) => {
        setSmileLevel(Math.round(mouthOpenness * 100));
        if (smileDetect && mouthOpenness > 0.35 && !autoCaptureLock.current) {
          autoCaptureLock.current = true;
          setTimeout(() => {
            abort.current = false;
            shoot();
            setTimeout(() => autoCaptureLock.current = false, 2000);
          }, 600);
        }
      },
      
      onMotionDetected: ({ distance }) => {
        setMotionLevel(Math.min(100, Math.round(distance)));
        if (motionDetect && distance > 15 && !autoCaptureLock.current) {
          autoCaptureLock.current = true;
          setTimeout(() => {
            abort.current = false;
            shoot();
            setTimeout(() => autoCaptureLock.current = false, 2000);
          }, 500);
        }
      }
    });

    return () => {
      motionDetector.current?.dispose();
      motionDetector.current = null;
    };
  }, [motionDetect, smileDetect, motionLevel]); // Re-init when toggles change

  // ——— kamera ———
  const open = useCallback(async (opts = {}) => {
    const { ratio: r = camRatio, device = camDeviceId, dual = dualCams, openMode = mode } = opts;
    setError(""); setErrorKind("");
    try {
      stopStreams(camsRef.current);
      let result;
      if (dual && openMode === "1") {
        result = await openDualCameras({ ratio: r, deviceId: device });
        if (result.dualError) setInfo(result.dualError);
        else setInfo("");
      } else {
        result = { cams: await openCamera({ ratio: r, deviceId: device }) };
      }
      camsRef.current = result.cams;
      setCams(result.cams);
      setShots([]);
      setOrder([]);
      setStickers([]);
      abort.current = false;
      setStep("live");
      // hint pertama kali masuk kamera (dismissible)
      try { if (!localStorage.getItem("kentamal-tour")) setTourHint(true); } catch { /* ignore */ }
      discoverCameras().then(setDevices);
    } catch (err) {
      setError(cameraErrorMessage(err));
      setErrorKind("camera");
      stopStreams(camsRef.current);
      camsRef.current = [];
      setCams([]);
    }
  }, [camRatio, camDeviceId, dualCams, mode]);

  useEffect(() => {
    if (step === "live" && cams.length === 0) open();
  }, [step, cams.length, open]);

  useEffect(() => () => {
    stopStreams(camsRef.current);
    peer.current?.destroy();
  }, []);

  // ——— peer room ———
  function forEachConn(fn) {
    conns.current.filter((c) => c && c.open).forEach(fn);
  }

  function destroyPeer() {
    roomSeq.current++; // batalkan peer yang masih dalam proses lazy-load
    peer.current?.destroy();
    peer.current = null;
    conns.current = [];
  }

  // PeerJS di-download saat room pertama dibuka (hemat ~40% boot load di HP)
  async function loadPeer() {
    if (!peerMod.current) peerMod.current = import("peerjs").then((m) => m.default);
    return peerMod.current;
  }

  function hostRoom(code) {
    const next = (code || room || "").toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(next)) { setError("Kode room harus 4 huruf/angka."); setErrorKind(""); return; }
    destroyPeer();
    const seq = ++roomSeq.current;
    setRoom(next);
    setRoomRole("host");
    loadPeer().then((Peer) => {
      if (seq !== roomSeq.current) return;
      const p = new Peer(`kentamal-${next.toLowerCase()}`);
      peer.current = p;
      p.on("open", () => setPeerStatus(`Room ${next} aktif — tunggu teman.`));
      p.on("connection", (conn) => {
        conns.current.push(conn);
        setPeerStatus("HP teman terhubung! 📱");
        conn.on("data", (data) => {
          if (!data) return;
          if (data.type === "photo") receiveRemoteShot(data.url);
          if (data.type === "strip") setRemoteStripUrl(data.url);
        });
        conn.on("close", () => {
          conns.current = conns.current.filter((c) => c !== conn);
          setPeerStatus(conns.current.length ? "Ada teman terputus." : `Room ${next} aktif — tunggu teman.`);
        });
        conn.on("error", () => setPeerStatus("Koneksi teman error."));
        setTimeout(() => { try { conn.send({ type: "ping" }); } catch { /* ignore */ } }, 300);
      });
      p.on("error", (err) => setPeerStatus(err.type === "unavailable-id" ? `Kode ${next} sedang dipakai — ganti kode lain.` : "Room error: " + err.type));
    });
  }

  function joinRoom(code) {
    const next = (code || join || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(next)) { setError("Masukkan kode room 4 huruf/angka."); setErrorKind(""); return; }
    destroyPeer();
    const seq = ++roomSeq.current;
    setRoom(next);
    setRoomRole("guest");
    setJoin(next);
    loadPeer().then((Peer) => {
      if (seq !== roomSeq.current) return;
      const p = new Peer();
      peer.current = p;
      p.on("open", () => {
        const conn = p.connect(`kentamal-${next.toLowerCase()}`);
        conns.current = [conn];
        setPeerStatus(`Menghubungkan ke ${next}…`);
        conn.on("open", () => setPeerStatus(`Terhubung ke room ${next}! 📱`));
        conn.on("data", (d) => {
          if (!d) return;
          if (d.type === "ping") setPeerStatus(`Terhubung ke room ${next}! 📱`);
          if (d.type === "strip") setRemoteStripUrl(d.url);
        });
        conn.on("close", () => { setPeerStatus("Koneksi tertutup."); conns.current = []; });
        conn.on("error", () => setPeerStatus("Room tidak ditemukan. Cek kode."));
      });
      p.on("error", (err) => setPeerStatus("Error: " + (err.type || "jaringan") + " — coba lagi."));
    });
  }

  function receiveRemoteShot(url) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 960;
      const ctx = canvas.getContext("2d");
      const s = Math.max(canvas.width / img.width, canvas.height / img.height);
      ctx.drawImage(img, (canvas.width - img.width * s) / 2, (canvas.height - img.height * s) / 2, img.width * s, img.height * s);
      setShots((prev) => {
        const next = prev.slice();
        const snap = { images: [canvas], crops: [{ zoom: 1, panX: 0, panY: 0 }] };
        const target = next.findIndex((it) => !it || !it.images || !it.images.length);
        if (target >= 0) next[target] = snap;
        else if (next.length < frames) next.push(snap);
        else next[0] = snap;
        return next;
      });
      // index shot baru untuk guest flag
      const flags = [...guestFlags];
      flags.push(shots.filter(Boolean).length);
      setGuestFlags(flags);
      setOrder((prev) => (prev.length < frames ? [...prev, prev.length] : prev));
      setPeerStatus("📸 Foto teman masuk ke strip!");
      bumpStats();
    };
    img.src = url;
  }

  async function sendPhotoToRoom() {
    if (!conns.current.some((c) => c.open)) { setError("Belum ada teman/layar yang terhubung."); setErrorKind(""); return; }
    const video = document.querySelector("#cams video");
    if (!video || !video.videoWidth) { setError("Kamera belum siap."); setErrorKind(""); return; }
    const canvas = grab(video, filter, filterStrength, mirror);
    const url = canvas.toDataURL("image/jpeg", 0.82);
    forEachConn((c) => c.send({ type: "photo", url }));
    setPeerStatus("✅ Foto terkirim ke room!");
  }

  async function sendStripToRoom() {
    if (!conns.current.some((c) => c.open)) { setError("Belum ada yang terhubung di room."); setErrorKind(""); return; }
    const canvas = composeStrip(paintOpts());
    const url = fitRatio(canvas, ratio).toDataURL("image/jpeg", 0.85);
    forEachConn((c) => c.send({ type: "strip", url }));
    setPeerStatus("📟 Strip terkirim ke teman!");
  }

  async function copyRoomLink() {
    const link = `${location.origin}/?room=${room}`;
    try { await navigator.clipboard.writeText(link); setInfo("Tautan room disalin: " + link); }
    catch { setInfo(link); }
  }

  // ——— shoot flow ———
  async function shoot() {
    if (busy) return;
    const videos = Array.from(document.querySelectorAll("#cams video"));
    if (!videos.length || videos.some((v) => !v.videoWidth)) {
      setError("Kamera belum siap. Tunggu gambar muncul."); setErrorKind("");
      return;
    }
    setError("");
    setInfo("");
    setBusy(true);
    abort.current = false;
    const next = [];
    for (let i = 0; i < frames; i++) {
      for (let sec = timer; sec >= 1; sec--) {
        setCount(String(sec));
        setProgress(((timer - sec + 1) / timer) * 100);
        beep(sec === 1 ? 990 : 740, 0.07, soundOn);
        if (soundOn) vibrate(30);
        if (!(await sleep(1000, abort))) return endShoot(false);
      }
      setCount("");
      setProgress(0);
      next.push({
        images: videos.map((video) => grab(video, filter, filterStrength, mirror)),
        crops: videos.map(() => ({ zoom: 1, panX: 0, panY: 0 })),
      });
      setShots(next.slice());
      shutter(soundOn, shutterFx);
      if (soundOn) vibrate(80);
      setFlash(true);
      setTimeout(() => setFlash(false), 180);
      if (!(await sleep(450, abort))) return endShoot(false);
    }
    setOrder(next.map((_, i) => i));
    setPicked(-1);
    if (mode === "2" && roomRole === "guest") {
      forEachConn((c) => { try { c.send({ type: "photo", url: next[next.length - 1].images[0].toDataURL("image/jpeg", 0.82) }); } catch { /* ignore */ } });
    }
    // rect video masih valid di step live — tangkep sebelum pindah ke studio
    launchFly(videos[0], next[next.length - 1].images[0]);
    endShoot(true);
  }

  function endShoot(goEdit) {
    setBusy(false);
    setCount("");
    setProgress(0);
    
    if (goEdit && shots.length > 0) {
      // Show timeline first, then go to edit after user closes it
      if (!reduceMotion()) {
        setDeveloping(true);
        setTimeout(() => setDeveloping(false), 1000);
      }
      
      // User can close timeline to go to edit studio
      // Timeline will auto-hide when user clicks retake on any photo
      // and we stay in timeline mode until they're satisfied or close it
      
      // Set a flag that tells us to show timeline overlay
      setShowTimeline(true);
    } else if (goEdit) {
      setStep("edit");
    }
  }

  // ——— FLY-SHOT: ambil posisi video sebelum pindah ke studio ———
  function launchFly(video, imgCanvas) {
    if (reduceMotion() || !video || !imgCanvas) return;
    const rect = video.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setFly({ from: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, url: imgCanvas.toDataURL("image/jpeg", 0.85) });
  }

  // === TIMELINE HANDLERS ===
  function handleTimelineRetake(idx) {
    // Go back to live mode with retake slot set
    setShowTimeline(false);
    setRetakeSlot(idx);
    setStep("live");
  }
  
  function handleTimelineDelete(idx) {
    // Delete photo from shots array
    setShots((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.slice(0, frames);
    });
    // Also delete from order
    setOrder((prev) => {
      const filtered = prev.filter((i) => i !== idx);
      // Fill remaining slots
      while (filtered.length < frames) filtered.push(prev[prev.length - 1]);
      return filtered.slice(0, frames);
    });
    bumpStats();
  }
  
  function handleTimelineClose() {
    setShowTimeline(false);
    setTimeout(() => {
      // Allow timeline to fully hide before going to edit
      setStep("edit");
    }, 300);
  }

  async function shootSingle(index) {
    const videos = Array.from(document.querySelectorAll("#cams video"));
    if (!videos.length || videos.some((v) => !v.videoWidth)) {
      setError("Kamera belum siap."); setErrorKind("");
      return;
    }
    setError("");
    setBusy(true);
    abort.current = false;
    for (let sec = timer; sec >= 1; sec--) {
      setCount(String(sec));
      beep(sec === 1 ? 990 : 740, 0.07, soundOn);
      if (!(await sleep(1000, abort))) return endShoot(false);
    }
    setCount("");
    const snap = {
      images: videos.map((video) => grab(video, filter, filterStrength, mirror)),
      crops: videos.map(() => ({ zoom: 1, panX: 0, panY: 0 })),
    };
    setShots((prev) => {
      const next = prev.slice();
      const target = order[index] ?? index;
      if (target < next.length) next[target] = snap;
      else next.push(snap);
      return next;
    });
    shutter(soundOn, shutterFx);
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    setRetakeSlot(-1);
    endShoot(true);
  }

  // ——— edit tools ———
  function snapshot() {
    return { shots, order, stickers, texts, doodles, template, look, ratio };
  }
  function syncHist() { setHistLen([hist.current.past.length, hist.current.future.length]); }
  function commitSnapshot(s) {
    hist.current.past.push(s);
    if (hist.current.past.length > 50) hist.current.past.shift();
    hist.current.future = [];
    syncHist();
  }
  function pushHistory() {
    commitSnapshot(snapshot());
  }
  // Helper: catat dulu, baru ubah — buat semua aksi diskrit
  function withHistory(fn) { pushHistory(); fn(); }

  function restore(s) {
    setShots(s.shots); setOrder(s.order); setStickers(s.stickers); setTexts(s.texts);
    setDoodles(s.doodles); setTemplate(s.template); setLook(s.look); setRatio(s.ratio);
  }

  function undo() {
    const prev = hist.current.past.pop();
    if (!prev) return;
    hist.current.future.push(snapshot());
    syncHist();
    restore(prev);
  }

  function redo() {
    const next = hist.current.future.pop();
    if (!next) return;
    hist.current.past.push(snapshot());
    syncHist();
    restore(next);
  }

  function tweakSticker(patch) {
    if (picked < 0) return;
    setStickers((prev) => prev.map((s, i) => (i === picked ? { ...s, ...patch(s) } : s)));
  }

  function addSticker(emoji, at) {
    pushHistory();
    const geo = geometry(template, "1");
    const pos = at || { x: geo.w / 2, y: geo.h / 3 };
    setStickers((prev) => {
      setPicked(prev.length);
      return [...prev, { emoji, x: pos.x, y: pos.y, size: 88, rot: 0, flip: false }];
    });
    // Pop feedback di canvas: 1 goresan = 1 animasi, lalu kelas dibuang biar
    // #preview animasi print-out normal lagi (kalau gak, pop jadi permanen).
    const cv = preview.current;
    if (cv) {
      cv.classList.remove("pop");
      void cv.offsetWidth; // paksa reflow supaya animasi bisa dipicu ulang
      cv.classList.add("pop");
      cv.addEventListener("animationend", () => cv.classList.remove("pop"), { once: true });
    }
  }

  function dropSticker(emoji, e) {
    if (!preview.current) return;
    e.preventDefault();
    const canvas = preview.current;
    const rect = canvas.getBoundingClientRect();
    addSticker(emoji, {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
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

  function reorderShot(from, to) {
    if (from === to || from < 0 || to < 0) return;
    pushHistory();
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

  function cycle(frameIndex) {
    pushHistory();
    setOrder((prev) => {
      const next = prev.slice();
      const b = (frameIndex + 1) % next.length;
      [next[frameIndex], next[b]] = [next[b], next[frameIndex]];
      return next;
    });
  }

  // ——— preview render ———
  useEffect(() => {
    if (step !== "edit" || !preview.current) return;
    const list = displayOrder.map((i) => shots[i]).filter(Boolean);
    if (list.length !== frames) return;
    const animShots = animOn && list.length > 1 ? [...list.slice(1), list[0]] : list;
    paintStrip(preview.current, {
      template, mode: "1", shots: animShots, stickers, texts, name: stripLabel(), qrUrl, look,
      ink: doodles, retouch, pickedSticker: picked, pickedText, customFrame,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, template, displayOrder, shots, stickers, texts, name, eventName, qrUrl, frames, look, doodles, retouch, picked, pickedText, animOn, customFrame]);

  useEffect(() => {
    if (!animOn || step !== "edit") return;
    const id = setInterval(() => {
      setAnimIndex((c) => (c + 1) % Math.max(1, order.length));
    }, 900);
    return () => clearInterval(id);
  }, [animOn, step, order.length]);

  // ——— keyboard: handler terbaru lewat ref, listener dipasang sekali ———
  const keyHandler = useRef(() => {});
  keyHandler.current = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.code === "Space" && step === "live" && !busy) {
      e.preventDefault();
      if (retakeSlot >= 0) shootSingle(retakeSlot);
      else shoot();
    }
    let hintMsg = "";
    if (step === "edit" && (e.key === "u" || e.key === "U")) { undo(); hintMsg = "↩️ Undo (U)"; }
    if (step === "edit" && (e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey) { redo(); hintMsg = "↪️ Redo (R)"; }
    if (step === "edit" && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) { redo(); hintMsg = "↪️ Redo (Ctrl+Shift+Z)"; } else { undo(); hintMsg = "↩️ Undo (Ctrl+Z)"; }
    }
    if (hintMsg) {
      setKbdHint(hintMsg);
      clearTimeout(kbdHintTimer.current);
      kbdHintTimer.current = setTimeout(() => setKbdHint(""), 1600);
    }
  };
  useEffect(() => {
    const fn = (e) => keyHandler.current(e);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // ——— export & gallery ———
  async function saveToGallery() {
    try {
      const out = fitRatio(composeStrip(paintOpts()), ratio);
      const blob = await stripBlob(out, "image/jpeg");
      const item = await putShot(blob, stripLabel());
      const url = URL.createObjectURL(blob);
      setGallery((prev) => [{ id: item.id, url, name: item.name }, ...prev].slice(0, 24));
      bumpStats();
      return url;
    } catch {
      return "";
    }
  }

  async function clearGallery() {
    gallery.forEach((g) => URL.revokeObjectURL(g.url));
    setGallery([]);
    await clearShots();
  }

  async function removeFromGallery(id) {
    const g = gallery.find((x) => x.id === id);
    if (g) URL.revokeObjectURL(g.url);
    setGallery((prev) => prev.filter((x) => x.id !== id));
    await deleteShot(id);
  }

  function save() {
    downloadStrip(composeStrip(paintOpts()), ratio);
    saveToGallery();
    burstConfetti();
    runPrinter(preview.current?.toDataURL("image/jpeg", 0.7) || "");
  }

  function saveJpeg() {
    const out = fitRatio(composeStrip(paintOpts()), ratio);
    const a = document.createElement("a");
    a.href = out.toDataURL("image/jpeg", 0.92);
    a.download = `kentamal-${Date.now()}.jpg`;
    a.click();
    saveToGallery();
    runPrinter(out.toDataURL("image/jpeg", 0.7));
  }

  function printStrip() {
    const out = fitRatio(composeStrip(paintOpts()), ratio);
    runPrinter(out.toDataURL("image/jpeg", 0.7));
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) { setError("Pop-up diblokir. Izinkan pop-up lalu coba lagi."); setErrorKind(""); return; }
    win.document.write(`<html><head><title>Cetak Kentamal</title><style>body{text-align:center;font-family:sans-serif}img{max-width:100%;height:auto}button{margin:12px;padding:10px 24px;font-size:16px;border-radius:8px;border:2px solid #241d3d;background:#4f46e5;color:#fff;font-weight:bold;cursor:pointer}</style></head><body><img src="${out.toDataURL("image/png")}" /><br/><button onclick="window.print()">🖨️ Cetak</button></body></html>`);
    win.document.close();
  }

  async function copyToClipboard() {
    const out = fitRatio(composeStrip(paintOpts()), ratio);
    try {
      const blob = await stripBlob(out, "image/png");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setError("");
      alert("Fotonya sudah di-copy. Tinggal paste di chat/status.");
    } catch {
      setError("Browser tidak mengizinkan copy otomatis. Pakai tombol Unduh.");
      setErrorKind("");
    }
  }

  async function shareStrip() {
    const canvas = fitRatio(composeStrip(paintOpts()), ratio);
    const url = encodeURIComponent(location.href.split("?")[0]);
    const text = `📸 Hasil photostrip ${stripLabel()} — bikin punyamu di Kentamal Booth!`;
    if (navigator.canShare) {
      try {
        const blob = await stripBlob(canvas, "image/png");
        const file = new File([blob], "kentamal.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ text, files: [file] });
          saveToGallery();
          return;
        }
      } catch { /* fallthrough ke link share */ }
    }
    try {
      await navigator.share({ text, url });
      saveToGallery();
      return;
    } catch { /* user batal / tidak support */ }
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}%20${url}`;
    const tg = `https://t.me/share/url?url=${url}&text=${encodeURIComponent(text)}`;
    const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
    const chooser = window.open("", "_blank", "width=480,height=360");
    if (!chooser) return;
    chooser.document.write(`<html><head><title>Bagikan</title><style>body{font-family:sans-serif;text-align:center;padding:24px}a{display:block;margin:12px auto;padding:14px;width:280px;border-radius:12px;border:2px solid #241d3d;font-weight:bold;text-decoration:none;color:#241d3d;background:#fff}a:hover{background:#eeeaff}</style></head><body><h3>Bagikan hasil:</h3><a href="${wa}" target="_blank">💬 WhatsApp</a><a href="${tg}" target="_blank">✈️ Telegram</a><a href="${x}" target="_blank">🐦 X / Twitter</a></body></html>`);
    chooser.document.close();
  }

  async function exportVideo() {
    const list = orderedShots;
    if (list.length < 2) { setError("Butuh minimal 2 foto buat video animasi."); setErrorKind(""); return; }
    const canvas = document.createElement("canvas");
    composeStrip({ shots: list }, canvas);
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
    for (let loop = 0; loop < 2; loop++) {
      for (let i = 0; i < list.length; i++) {
        const rot = [...list.slice(i), ...list.slice(0, i)];
        composeStrip({ shots: rot }, canvas);
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    rec.stop();
  }

  function bumpStats() {
    const today = new Date().toDateString();
    let newlyUnlocked = []; // Track badges unlocked in this call
    
    setSessionStats((s) => {
      let currentDate = s.date;
      let currentToday = s.today || 0;
      let currentTotal = s.total || 0;
      const currentBadges = Array.isArray(s.badges) ? s.badges : [];
      
      // Reset daily counter if different day
      if (currentDate !== today) {
        currentDate = today;
        currentToday = 1;
        currentTotal += 1;
      } else {
        currentToday += 1;
        currentTotal += 1;
      }
      
      // Check for badge unlocks
      // 🎯 Badge: First Photo
      if (!currentBadges.includes("first")) {
        newlyUnlocked.push({ id: "first", name: "📸 Foto Pertama", desc: "Ambil foto pertama kamu!", unlockAt: Date.now() });
      }
      
      // 🔥 Badge: Photo Streak
      if (currentToday >= 5 && !currentBadges.includes("streak5")) {
        newlyUnlocked.push({ id: "streak5", name: "🔥 Hot Streak", desc: "5 foto hari ini!", unlockAt: Date.now() });
      }
      if (currentToday >= 10 && !currentBadges.includes("streak10")) {
        newlyUnlocked.push({ id: "streak10", name: "💪 Super Star", desc: "10 foto hari ini!", unlockAt: Date.now() });
      }
      
      // 🎉 Badge: Milestone Achievements
      if (currentTotal === 50 && !currentBadges.includes("milestone50")) {
        newlyUnlocked.push({ id: "milestone50", name: "⭐ 50 Photos", desc: "Total 50 foto!", unlockAt: Date.now() });
      }
      if (currentTotal === 100 && !currentBadges.includes("milestone100")) {
        newlyUnlocked.push({ id: "milestone100", name: "🏆 Legend", desc: "Total 100 foto!", unlockAt: Date.now() });
      }
      
      const finalBadges = [...currentBadges, ...newlyUnlocked.map(b => b.id)];
      
      const result = { 
        date: currentDate, 
        today: currentToday, 
        total: currentTotal, 
        badges: finalBadges 
      };
      
      try { localStorage.setItem("kentamal-stats", JSON.stringify(result)); } catch { /* ignore */ }
      return result;
    });
    
    // Also increment old stats for backward compatibility
    setStats(s => s + 1);
    
    // Trigger badge popup outside setState if there are new badges
    if (newlyUnlocked.length > 0) {
      const badge = newlyUnlocked[newlyUnlocked.length - 1];
      setBadgePopup(badge);
      setTimeout(() => setBadgePopup(null), 5000);
      
      // Burst confetti on badge unlock!
      if (newlyUnlocked.length > 0) {
        setTimeout(() => burstConfetti(), 300);
      }
    }
  }

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

  // ——— template creator ———
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
      const s = Math.max(geo.w / img.width, geo.h / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.drawImage(img, (geo.w - dw) / 2, (geo.h - dh) / 2, dw, dh);
      setCustomFrame(canvas);
      try { localStorage.setItem("kentamal-frame", canvas.toDataURL("image/png")); } catch { /* quota */ }
      URL.revokeObjectURL(url);
      setError("");
    };
    img.onerror = () => { setError("Gambar frame gagal dibaca."); setErrorKind(""); };
    img.src = url;
  }

  function clearFrame() {
    setCustomFrame(null);
    try { localStorage.removeItem("kentamal-frame"); } catch { /* ignore */ }
  }

  // ——— upload files ———
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
    stopStreams(camsRef.current);
    camsRef.current = [];
    setCams([]);
    setBusy(false);
    setCount("");
    setProgress(0);
    setRetakeSlot(-1);
    setStep("boot");
  }

  function retryCamera() {
    setError("");
    setErrorKind("");
    open();
  }

  // ——— ripple + reveal ———
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

  function goPage(next) {
    setMenuOpen(false);
    const apply = () => setPage(next);
    if (document.startViewTransition) document.startViewTransition(apply);
    else apply();
  }

  // ——— DARK MODE: circular reveal dari posisi tombol ———
  function toggleDark(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const apply = () => setDark((d) => !d);
    if (!document.startViewTransition || reduceMotion()) return apply();
    const x = ((r.left + r.width / 2) / window.innerWidth) * 100;
    const y = ((r.top + r.height / 2) / window.innerHeight) * 100;
    document.documentElement.style.setProperty("--mx", `${x}%`);
    document.documentElement.style.setProperty("--my", `${y}%`);
    document.documentElement.classList.add("vt-dark-active");
    const vt = document.startViewTransition(apply);
    vt.finished.finally(() => document.documentElement.classList.remove("vt-dark-active"));
  }

  // ——— MAGNETIC: tombol gede narik cursor (desktop pointer halus aja) ———
  useEffect(() => {
    if (reduceMotion()) return;
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const el = e.target.closest?.(".magnetic");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const k = Math.min(1, Math.hypot(dx, dy));
      el.style.transform = `translate(${dx * 7 * k}px, ${dy * 5 * k}px)`;
    };
    const onOut = (e) => {
      const el = e.target.closest?.(".magnetic");
      if (el) el.style.transform = "";
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
    };
  }, []);

  // ——— TILT 3D di preview studio ———
  function onPreviewMove(e) {
    if (reduceMotion() || e.pointerType === "touch") return;
    const el = tiltWrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${px * 6}deg) rotateX(${-py * 5}deg)`;
  }
  function onPreviewLeave() {
    if (tiltWrap.current) tiltWrap.current.style.transform = "";
  }

  // ——— LAYOUT PRESET: satu klik set template + rasio cetak sekaligus ———
  function switchLayout(layoutId) {
    const preset = LAYOUTS.find(([lid]) => lid === layoutId);
    if (!preset) return;
    pushHistory();
    const [, , tpl] = preset;
    const apply = () => {
      setTemplate(tpl);
      setRatio(RATIO_BY_LAYOUT[layoutId]);
    };
    if (!document.startViewTransition || reduceMotion()) return apply();
    document.documentElement.classList.add("vt-morph-active");
    const vt = document.startViewTransition(apply);
    vt.finished.finally(() => document.documentElement.classList.remove("vt-morph-active"));
  }

  // ——— TEMPLATE MORPH: cross-dissolve pas ganti layout strip ———
  function switchTemplate(id) {
    pushHistory();
    const apply = () => setTemplate(id);
    if (!document.startViewTransition || reduceMotion()) return apply();
    document.documentElement.classList.add("vt-morph-active");
    const vt = document.startViewTransition(apply);
    vt.finished.finally(() => document.documentElement.classList.remove("vt-morph-active"));
  }

  // ——— PRINTER EXIT: strip "keluar" pas unduh/cetak ———
  function runPrinter(url) {
    if (reduceMotion()) return;
    setPrinterShot(url);
    printer(soundOn);
    setTimeout(() => setPrinterShot(""), 760);
  }

  // ——— canvas pointer edit ———
  function onPointerDown(e) {
    if (ink) { pen.current = point(preview.current, e); drag.current = { kind: "ink", snap: snapshot() }; return; }
    if (e.pointerType === "touch" && pinch.current) return;
    const p = point(preview.current, e);
    const cell = hitCell(template, "1", p.x, p.y);
    const sticker = hitSticker(stickers, p.x, p.y);
    const textHit = hitText(texts, p.x, p.y);
    setPicked(sticker);
    setPickedText(textHit);
    const kind = sticker >= 0 ? "sticker" : textHit >= 0 ? "text" : cell ? "crop" : "none";
    drag.current = { kind, ...p, cell, sticker, text: textHit, dist: 0, snap: kind === "none" ? null : snapshot() };
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
    const d = drag.current;
    if (ink) {
      pen.current = null;
      if (d?.snap) commitSnapshot(d.snap); // 1 goresan = 1 undo
      drag.current = null;
      return;
    }
    if (d && d.snap && d.dist > 3) commitSnapshot(d.snap); // pushHistory kalau beneran ada gerak
    if (preview.current?.hasPointerCapture(e.pointerId)) preview.current.releasePointerCapture(e.pointerId);
    if (d?.kind === "crop" && d.dist < 6 && e.pointerType !== "touch") cycle(d.cell.shot);
    drag.current = null;
  }

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

  const connected = conns.current.some((c) => c.open);
  const filterCss = filterWithIntensity(filterById(filter).css, filterStrength / 100);
  const catalog = useMemo(() => {
    const q = searchQ.toLowerCase();
    const list = SHAPES.filter(([id, label, , desc]) => (label + " " + desc + " " + id).toLowerCase().includes(q));
    return [...list].sort((a, b) => (favTemplates.includes(b[0]) ? 1 : 0) - (favTemplates.includes(a[0]) ? 1 : 0));
  }, [searchQ, favTemplates]);

  return (
    <div className={"app " + step}>
      {confetti.length > 0 && (
        <div className="confetti" aria-hidden="true">
          {confetti.map((c) => (
            <span key={c.id} style={{ left: `${c.x}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}>{c.emoji}</span>
          ))}
        </div>
      )}
      
      {/* === BADGE POPUP === */}
      {badgePopup && (
        <div className="badge-popup" role="alert" aria-live="polite">
          <div className="badge-card">
            <span className="badge-icon">{badgePopup.name.charAt(0)}</span>
            <div className="badge-content">
              <strong className="badge-title">{badgePopup.name}</strong>
              <p className="badge-desc">{badgePopup.desc}</p>
            </div>
            <button type="button" onClick={() => setBadgePopup(null)} className="ghost small" aria-label="Close">✕</button>
          </div>
          <div className="badge-ripple" />
        </div>
      )}
      
      {fly && <FlyShot fly={fly} previewRef={preview} onDone={() => setFly(null)} />}
      
      {/* === TIMELINE PHOTO REVEAL === */}
      {showTimeline && shots.length > 0 && (
        <TimelinePhotoReveal
          shots={shots}
          onRetake={handleTimelineRetake}
          onDelete={handleTimelineDelete}
          onClose={handleTimelineClose}
        />
      )}
      
      {printerShot && (
        <div className="printer-exit-overlay" aria-hidden="true">
          <div className="printer-dock">
            <span className="printer-mouth" />
            <img className="printer-paper" src={printerShot} alt="" />
          </div>
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
            <button className="jp-btn-giant magnetic" type="button" onClick={dismissOnboard}>Mulai! 🚀</button>
          </div>
        </div>
      )}
      {error ? (
        <p className="err" role="alert">
          {error}
          {canRetryCamera && <button type="button" className="ghost" style={{ marginLeft: 8 }} onClick={retryCamera}>🔄 Coba Lagi</button>}
        </p>
      ) : null}
      {info ? <p className="info-banner">{info}</p> : null}

      {step === "boot" && (
        <div className="landing">
          <header className="jp-nav">
            <div className="jp-logo">
              <img src="/logo-komik.svg" alt="Kentamal Booth" className="jp-logo-img" style={{ cursor: "pointer" }} onClick={() => goPage("home")} />
            </div>
            <button
              className="menu-toggle"
              type="button"
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={menuOpen}
              aria-controls="jp-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
            <nav className={"jp-nav-links jp-nav-menu" + (menuOpen ? " menu-open" : "")} id="jp-mobile-menu">
              <button type="button" className={page === "home" ? "on" : ""} onClick={() => goPage("home")}>Home</button>
              <button type="button" className={page === "booth" ? "on" : ""} onClick={() => goPage("booth")}>Booth</button>
              <button type="button" className={page === "software" ? "on" : ""} onClick={() => goPage("software")}>Software</button>
              <button type="button" className={page === "pricing" ? "on" : ""} onClick={() => goPage("pricing")}>Harga</button>
            </nav>
            <div className="jp-nav-actions">
              <div className="jp-nav-primary">
                {mode === "2" && (
                  <div className="room-badge-nav">
                    <span>Room:</span> <b>{room || "----"}</b>
                  </div>
                )}
                <button className="jp-btn-primary" type="button" onClick={() => { setMenuOpen(false); setStep("mode"); }}>{T.mulaimenu}</button>
              </div>
              <div className="jp-nav-utilities">
                {user ? (
                  <button className="ghost" type="button" onClick={logout} title={user.email}>
                    Keluar ({user.email.split("@")[0]})
                  </button>
                ) : authEnabled ? (
                  <button className="ghost" type="button" onClick={() => goPage("login")}>Masuk</button>
                ) : null}
                <button className="ghost" type="button" onClick={() => setLang((l) => (l === "id" ? "en" : "id"))} aria-label="Bahasa" title="Bahasa / Language">
                  {lang === "id" ? "🇮🇩" : "🇬🇧"}
                </button>
                <button className="ghost" type="button" onClick={toggleDark} aria-label="Mode gelap">{dark ? "🌙" : "☀️"}</button>
          </div>
        </div>
      </header>
      
      {/* Scroll to top/bottom FAB */}
      <div className="jp-scroll-fab" role="group" aria-label="Tombol scroll">
        <button type="button" className={"jp-scroll-btn" + (scrollAt.up ? "" : " hide")} aria-label="Ke atas" tabIndex={scrollAt.up ? 0 : -1} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>↑</button>
        <button type="button" className={"jp-scroll-btn" + (scrollAt.down ? "" : " hide")} aria-label="Ke bawah" tabIndex={scrollAt.down ? 0 : -1} onClick={() => window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'})}>↓</button>
      </div>

          {page === "home" && (
          <main className="jp-hero-section">
            <div className="jp-hero-content">
              <div className="jp-badge-pill">✦ Photobooth Digital di Browser</div>
              <h1>Abadikan Momen <span className="highlight">Bareng Kentamal!</span></h1>
              <p className="jp-subtitle">Photobooth digital yang keren, praktis, dan modern. Tanpa install aplikasi, langsung dari browser — foto kamu tidak pernah dikirim ke server.</p>

              <div className="jp-cta-group">
                <button className="jp-btn-giant magnetic" type="button" onClick={() => setStep("mode")}>
                  ✨ {T.coba}
                </button>
                <label className="jp-btn-outline upload">
                  📁 {T.unggah}
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => { loadFiles(e.target.files); e.target.value = ""; }} />
                </label>
              </div>

              <div className="jp-stats-row">
                <div className="stat-card"><b>{FILTERS.reduce((n, g) => n + g.items.length, 0)}</b><span>{lang === "id" ? "Filter kamera" : "Camera filters"}</span></div>
                <div className="stat-card"><b>{SHAPES.length}</b><span>{lang === "id" ? "Template strip" : "Strip templates"}</span></div>
                <div className="stat-card"><b>1</b><span>{lang === "id" ? "Mode shutter" : "Shutter modes"}</span></div>
                <div className="stat-card"><b>100%</b><span>{lang === "id" ? "Jalan di browser" : "Runs in browser"}</span></div>
                
                {/* Daily & Total Stats */}
                <div className="stat-card stat-daily">
                  <b style={{ color: "#4f46e5" }}>📅 {sessionStats.today}</b>
                  <span>{lang === "id" ? `Foto hari ini (${new Date(sessionStats.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })})` : `Today (${new Date(sessionStats.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`}</span>
                </div>
                <div className="stat-card stat-total">
                  <b>📸 {sessionStats.total}</b>
                  <span>{lang === "id" ? "Total semua foto" : "All-time total photos"}</span>
                </div>
              </div>
              
              {/* Badges Display */}
              {sessionStats.badges && sessionStats.badges.length > 0 && (
                <div className="badges-section" style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>🏆 Badge ({sessionStats.badges.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries({
                      first: "📸 Foto Pertama",
                      streak5: "🔥 Hot Streak (5 foto)",
                      streak10: "💪 Super Star (10 foto)",
                      milestone50: "⭐ 50 Photos",
                      milestone100: "🏆 Legend (100 photos)"
                    }).map(([id, label]) => (
                      <div 
                        key={id} 
                        className={`badge-item ${sessionStats.badges.includes(id) ? 'unlocked' : 'locked'}`}
                        title={label}
                      >
                        <span className="badge-emoji">{label.split(' ')[0]}</span>
                        {sessionStats.badges.includes(id) && <span className="badge-check">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="jp-marquee" aria-hidden="true">
                <div className="jp-marquee-track">
                  {[0, 1].map((dup) => (
                    <span className="jp-marquee-run" key={dup}>
                      {SHAPES.map(([id, label]) => <b key={id}>{label} ✦</b>)}
                    </span>
                  ))}
                </div>
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
                {catalog.map(([id, label, count, desc, img]) => (
                  <div key={id} className={"card-wrap" + (favTemplates.includes(id) ? " fav" : "")}>
                    <button type="button" className={template === id ? "card on" : "card"} onClick={() => { switchTemplate(id); }}>
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
              <p className="fine">Klik template lalu <b>{T.mulaimenu}</b>. Foto kamu otomatis disusun sesuai bentuk template.</p>
            </div>

            <div className="jp-steps-section" data-reveal>
              <h2>Cara Kerjanya</h2>
              <div className="steps-grid">
                <div className="step-card">
                  <span className="step-num">1</span>
                  <h3>Pilih Template</h3>
                  <p>Strip, komik, polaroid, grid, atau couple — plus frame buatanmu sendiri.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">2</span>
                  <h3>Jepret Kamera</h3>
                  <p>Hitung mundur otomatis dengan filter kamera estetik (iPhone, Fuji, Sony, Canon).</p>
                </div>
                <div className="step-card">
                  <span className="step-num">3</span>
                  <h3>Edit & Stiker</h3>
                  <p>Geser crop foto, tarik stiker, tulis teks, coret-coret bebas, retouch.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">4</span>
                  <h3>Unduh & Bagikan</h3>
                  <p>PNG/JPEG HD, rasio story/feed, QR code, atau kirim ke HP teman via room.</p>
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
                  <p>Classic strip, polaroid, grid, komik, couple, party — plus frame custom PNG.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">📤</span>
                  <h3>QR & Share</h3>
                  <p>Setiap strip punya QR code yang bisa di-scan langsung menuju situs ini.</p>
                </div>
              </div>
              <div className="jp-cta-group">
                <button className="jp-btn-giant magnetic" type="button" onClick={() => setStep("mode")}>✨ {T.coba}</button>
                <button className="jp-btn-outline" type="button" onClick={() => goPage("pricing")}>💰 Lihat Harga</button>
              </div>
            </main>
          )}

          {page === "booth" && (
            <main className="jp-page">
              <h1>Booth <span className="highlight">Interaktif</span></h1>
              <p className="jp-subtitle">Fitur photobooth lengkap: filter kamera, template frame, stiker, retouch, QR share, sampai room 2 HP.</p>
              <div className="steps-grid">
                <div className="step-card">
                  <span className="step-num">📸</span>
                  <h3>Jepret</h3>
                  <p>Hitung mundur otomatis, flash, suara shutter, mirror preview.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">🎨</span>
                  <h3>Edit</h3>
                  <p>Crop, zoom, stiker kategori, coret bebas, soft glow, undo/redo.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">📤</span>
                  <h3>Unduh</h3>
                  <p>PNG/JPEG HD, rasio story/feed, copy ke clipboard, video animasi WebM.</p>
                </div>
                <div className="step-card">
                  <span className="step-num">🔗</span>
                  <h3>Room 2 HP</h3>
                  <p>Teman gabung pakai kode, fotonya langsung nyatu di strip kamu.</p>
                </div>
              </div>
              <div className="jp-cta-group">
                <button className="jp-btn-giant magnetic" type="button" onClick={() => setStep("mode")}>✨ Buka Booth</button>
              </div>
            </main>
          )}

          {page === "pricing" && (
            <main className="jp-page">
              <h1>Harga <span className="highlight">Kentamal</span></h1>
              <p className="jp-subtitle">Semua fitur inti gratis, selamanya. Paket berbayar segera hadir.</p>
              <div className="steps-grid">
                <div className="step-card">
                  <h3>🆓 Gratis</h3>
                  <p className="price">Rp 0</p>
                  <p>Kamera, semua template, filter, stiker, retouch, unduh HD. Tanpa batas.</p>
                </div>
                <div className="step-card">
                  <h3>🚀 Pro <span className="badge-soon">segera</span></h3>
                  <p className="price">—</p>
                  <p>Frame premium, hapus watermark, galeri cloud. Rencananya ±Rp 49rb/bln.</p>
                </div>
                <div className="step-card">
                  <h3>📦 Event <span className="badge-soon">segera</span></h3>
                  <p className="price">—</p>
                  <p>Printer langsung, backdrop custom, multi-kamera. Rencananya ±Rp 199rb/event.</p>
                </div>
              </div>
              <div className="jp-cta-group">
                <button className="jp-btn-giant magnetic" type="button" onClick={() => setStep("mode")}>✨ Pakai yang Gratis</button>
              </div>
            </main>
          )}

          {page === "login" && !user && (
            <main className="jp-page">
              <h1>{authMode === "login" ? "Masuk" : "Daftar"} <span className="highlight">Kentamal</span></h1>
              <p className="jp-subtitle">Akun itu opsional — semua fitur booth tetap jalan tanpa login.</p>
              {!authEnabled && <p className="info-banner">Server akun belum dikonfigurasi di perangkat ini. Setel <code>VITE_SUPABASE_URL</code> & <code>VITE_SUPABASE_ANON_KEY</code> untuk mengaktifkannya.</p>}
              <form className="login-card" onSubmit={submitAuth}>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="kamu@email.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Kata Sandi
                  <input
                    type="password"
                    name="password"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    placeholder="minimal 6 karakter"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                  />
                </label>
                {authMessage && <p className="auth-message" role="alert">{authMessage}</p>}
                <button className="jp-btn-giant magnetic" type="submit" disabled={authBusy || !authEnabled}>
                  {authBusy ? "Memproses…" : authMode === "login" ? "Masuk" : "Daftar"}
                </button>
                <button
                  className="ghost" type="button"
                  onClick={() => { setAuthMode((m) => (m === "login" ? "register" : "login")); setAuthMessage(""); }}
                >
                  {authMode === "login" ? "Belum punya akun? Daftar →" : "← Sudah punya akun, Masuk"}
                </button>
                <button className="ghost" type="button" onClick={() => goPage("home")} disabled={authBusy}>← Kembali</button>
              </form>
            </main>
          )}

          <footer className="jp-footer">
            <p>© 2026 Kentamal Booth • Foto kamu tidak pernah dikirim ke server.</p>
            <div className="jp-nav-links" style={{ justifyContent: "center" }}>
              <button type="button" onClick={() => goPage("home")}>Home</button>
              <button type="button" onClick={() => goPage("booth")}>Booth</button>
              <button type="button" onClick={() => goPage("software")}>Software</button>
              <button type="button" onClick={() => goPage("pricing")}>Harga</button>
            </div>
          </footer>
        </div>
      )}

      {step === "mode" && (
        <section className="mode-screen step-screen">
          <header className="jp-nav" style={{ width: "100%", maxWidth: 900 }}>
            <div className="jp-logo">
              <img src="/logo-komik.svg" alt="Kentamal Booth" className="jp-logo-img" style={{ cursor: "pointer" }} onClick={() => setStep("boot")} />
            </div>
            <button className="ghost" type="button" onClick={() => setStep("boot")}>← Kembali</button>
          </header>

          <main className="jp-page" style={{ maxWidth: 700 }}>
            <h1>Pilih <span className="highlight">Cara Jepret</span></h1>
            <p className="jp-subtitle">Jepret sendiri di satu perangkat, atau ajak teman gabung dari HP-nya lewat kode room.</p>

            <div className="mode-grid">
              <button type="button" className="mode-card magnetic" onClick={() => { setMode("1"); open({ openMode: "1" }); }}>
                <span className="mode-icon">📱</span>
                <b>1 Perangkat</b>
                <small>Jepret langsung di layar ini. Bisa tambah webcam kedua buat baris ganda.</small>
                <span className="mode-cta">Mulai Jepret →</span>
              </button>

              <button type="button" className="mode-card magnetic" onClick={() => { setMode("2"); setRoomRole("host"); hostRoom(); open({ openMode: "2" }); }}>
                <span className="mode-icon">🖥️📱</span>
                <b>2 Perangkat (Room)</b>
                <small>Layar ini = booth utama. HP teman gabung pakai kode, fotonya nyatu ke strip.</small>
                <span className="mode-cta">Buat Room →</span>
              </button>
            </div>

            {mode === "2" && (
              <div className="room-help">
                <h3>📲 Cara Gabung / Jadi Tamu</h3>
                <ol>
                  <li>Teman buka <b>Kentamal Booth</b> di HP-nya.</li>
                  <li>Masukkan kode room yang tampil di layar utama (atau pakai tautan di bawah).</li>
                  <li>Klik <b>Gabung Room</b> → jepret → foto otomatis masuk ke strip layar utama.</li>
                </ol>
                <p>💡 Kode room-mu: <b className="room-code-big">{room || "----"}</b></p>
                <div className="room-actions">
                  <button className="ghost" type="button" onClick={copyRoomLink}>🔗 Salin Tautan Room</button>
                  <button className="ghost" type="button" onClick={() => hostRoom()}>🌐 (Re)Aktifkan Room Ini</button>
                </div>
                <div className="room-join">
                  <label htmlFor="room-code">Atau gabung ke kode lain</label>
                  <input
                    id="room-code"
                    className="room-input"
                    aria-label="Kode room"
                    maxLength={4}
                    placeholder="ABCD"
                    value={join}
                    onChange={(e) => setJoin(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") joinRoom(join); }}
                  />
                  <button className="ghost" type="button" onClick={() => joinRoom()}>📱 Gabung Room</button>
                </div>
                {peerStatus && <p className="peer-status">🔗 {peerStatus}</p>}
              </div>
            )}

            {remoteStripUrl && (
              <div className="room-help">
                <h3>📥 Strip dari teman</h3>
                <img src={remoteStripUrl} alt="Strip dari room" style={{ maxWidth: "100%", borderRadius: 12 }} />
                <div className="room-actions">
                  <a className="ghost" href={remoteStripUrl} download="kentamal-strip.jpg">⬇️ Simpan</a>
                  <button className="ghost" type="button" onClick={() => setRemoteStripUrl("")}>Tutup</button>
                </div>
              </div>
            )}

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
        <section className="live step-screen">
          <header className="live-header">
            <strong>Kentamal Live {mode === "2" ? <span className="room-pill">Room: {room} • {roomRole === "host" ? "tuan rumah" : "tamu"}</span> : null}</strong>
            <div>
              <select
                value={camRatio}
                onChange={(e) => { const v = e.target.value; setCamRatio(v); open({ ratio: v }); }}
                aria-label="Rasio kamera"
              >
                <option value="4:3">📐 4:3</option>
                <option value="1:1">⬜ 1:1 Kotak</option>
                <option value="9:16">📱 9:16</option>
              </select>
              {devices.length > 1 && (
                <select
                  value={camDeviceId}
                  onChange={(e) => { const v = e.target.value; setCamDeviceId(v); open({ device: v }); }}
                  aria-label="Pilih kamera"
                >
                  <option value="">📷 Kamera otomatis</option>
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>📷 {d.label || `Kamera ${i + 1}`}</option>
                  ))}
                </select>
              )}
              <button
                className={dualCams ? "ghost on" : "ghost"}
                type="button"
                aria-pressed={dualCams}
                title="Dua webcam di satu laptop: tiap jepretan jadi satu baris dua foto"
                onClick={() => { const v = !dualCams; setDualCams(v); open({ dual: v, openMode: "1" }); }}
              >
                🎥 2 Webcam {dualCams ? "On" : "Off"}
              </button>
              <button className="ghost" type="button" onClick={() => setMirror((m) => !m)} aria-pressed={mirror}>
                {mirror ? "🪞 Mirror: On" : "🪞 Mirror: Off"}
              </button>
              <button className="ghost" type="button" onClick={() => setSoundOn((s) => !s)} aria-label="Suara" title="Suara">{soundOn ? "🔊" : "🔇"}</button>
              
              {/* === MOTION & SMILE DETECTION — COMPACT + AUTO-HIDE === */}
              {(motionDetect || smileDetect || faceVisible) && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {faceVisible && (
                    <>
                      <button 
                        className={motionDetect ? "on ghost small-btn" : "ghost small-btn"} 
                        type="button" 
                        onClick={() => setMotionDetect(!motionDetect)}
                        aria-pressed={motionDetect}
                        title="Auto-capture pas ada gerakan"
                        disabled={busy}
                      >
                        🎯 {motionDetect ? "" : "⏸️"}
                      </button>
                      
                      <button 
                        className={smileDetect ? "on ghost small-btn" : "ghost small-btn"} 
                        type="button" 
                        onClick={() => setSmileDetect(!smileDetect)}
                        aria-pressed={smileDetect}
                        title="Auto-capture pas senyum"
                        disabled={busy}
                      >
                        😄 {smileDetect ? "" : "⏸️"}
                      </button>
                      
                      {/* Progress ring only when active */}
                      {(motionDetect || smileDetect) && (
                        <div style={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: '50%', 
                          background: `conic-gradient(#4f46e5 ${Math.max(smileLevel, motionLevel) * 3.6}deg, #e5e7eb 0deg)`,
                          transition: 'background 0.15s',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            inset: 3,
                            background: dark ? '#1c1a22' : '#fff',
                            borderRadius: '50%',
                          }} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* AR Sticker Picker - desktop only */}
              {!/(iPhone|iPad|iPod|Android)/i.test(navigator.userAgent) && !faceVisible && arProp && (
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setArProp(null)}
                  title="Hapus AR Sticker"
                  style={{ fontSize: "13px", padding: "4px 8px" }}
                >
                  ✨ {arProp}
                </button>
              )}
              
              {/* Show sticker picker dropdown in booth edit mode or as button */}
              <button
                className={arProp ? "ghost on" : "ghost"}
                type="button"
                onClick={() => {
                  // Open AR Sticker picker modal here (will be implemented later)
                  setArProp(arProp ? null : "👑"); // Toggle for now
                }}
                title="AR Sticker Props"
                disabled={busy}
              >
                {arProp ? "✨ AR" : "✨ Add AR"}
              </button>
              
              <button className="ghost" type="button" onClick={back}>← Batal</button>
            </div>
          </header>
          
          {/* Status indicators only when face detected */}
          {step === "live" && faceVisible && !motionDetect && !smileDetect && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '6px 0',
              fontSize: 11,
              color: dark ? '#9ca3af' : '#6b7280'
            }}>
              👤 Wajah terdeteksi • Aktifkan Motion/Smile untuk auto-capture
            </div>
          )}
          {progress > 0 && (
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
          {peerStatus && mode === "2" && <p className="peer-status">🔗 {peerStatus}</p>}
          <Stage 
            cams={cams} 
            filterCss={filterCss} 
            count={count} 
            flash={flash} 
            mirror={mirror}
            arProp={arProp}
            landmarks={lastLandmarks}
          />
          <div className="dock">
            <div className="filters" role="listbox" aria-label="Filter">
              <span className="filter-label">🎞️ {filterById(filter).name}</span>
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
              
              {/* Shutter FX — compact segmented picker + test button */}
              <div className="shutter-fx" role="group" aria-label="Efek suara shutter">
                {SHUTTER_FX.map(([id, name, emoji, desc]) => (
                  <button
                    key={id}
                    type="button"
                    className={shutterFx === id ? "on" : ""}
                    aria-pressed={shutterFx === id}
                    title={`${desc} — klik buat preview`}
                    onClick={() => { setShutterFx(id); if (soundOn) shutter(true, id); }}
                  >
                    <span aria-hidden="true">{emoji}</span>
                    <em>{name}</em>
                  </button>
                ))}
              </div>
              
              <div className="shutter-wrap">
                {count && (
                  <svg className="timer-ring-svg" viewBox="0 0 64 64" aria-hidden="true">
                    <circle className="timer-ring-bg" cx="32" cy="32" r="28.8" />
                    <circle
                      className="timer-ring-fill"
                      cx="32"
                      cy="32"
                      r="28.8"
                      style={{ strokeDashoffset: 181 - (181 * (Number(count) - 1)) / timer }}
                    />
                  </svg>
                )}
                <button
                  className={"shutter" + (count === "1" ? " urgent" : "")}
                  type="button"
                  disabled={busy}
                  onClick={() => { if (retakeSlot >= 0) shootSingle(retakeSlot); else shoot(); }}
                  aria-label="Jepret"
                >
                  <b />
                </button>
                {tourHint && (
                  <span className="tour-bubble">
                    👆 Tekan tombol bulat ini buat jepret
                    <button type="button" onClick={() => { setTourHint(false); try { localStorage.setItem("kentamal-tour", "1"); } catch {} }}>Oke</button>
                  </span>
                )}
              </div>
              {mode === "2" && (
                <button className="ghost" type="button" onClick={sendPhotoToRoom} disabled={!connected || busy}>📤 Kirim 1 Foto</button>
              )}
              <button className="ghost" type="button" onClick={back}>Batal</button>
            </div>
          </div>
        </section>
      )}
      {step === "edit" && (
        <section className="edit">
          <header className="edit-header">
            <strong>Kentamal Studio</strong>
            <button className="ghost" type="button" onClick={back}>← Beranda</button>
          </header>
          <div className="preview-tilt-wrap" ref={tiltWrap}>
            <canvas
              id="preview"
              ref={preview}
              className={"preview-tilt-inner" + (developing ? " developing" : "")}
              onPointerDown={onPointerDown}
              onPointerMove={(e) => { onPointerMove(e); onPreviewMove(e); }}
              onPointerUp={onPointerUp}
              onPointerLeave={onPreviewLeave}
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
          </div>
          <p className="fine">Geser foto untuk crop • scroll/cubit zoom • klik foto = tuker urutan • stiker tarik & drop</p>
          <div className="thumbs">
            {order.map((shotIdx, i) => {
              const shot = shots[shotIdx];
              if (!shot) return null;
              const isGuest = guestFlags.includes(shotIdx);
              return (
                <div key={i} className={"thumb-wrap" + (retakeSlot === i ? " retaking" : "") + (isGuest ? " arriving" : "")}>
                  {isGuest && <span className="guest-flag" title="Foto dari HP teman">📱</span>}
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
                    📸 {T.fotoUlang}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="undo-bar">
            <button type="button" className="ghost" onClick={undo} disabled={!histLen[0]} title="Ctrl+Z">↩️ Undo</button>
            <button type="button" className="ghost" onClick={redo} disabled={!histLen[1]} title="Ctrl+Y">↪️ Redo</button>
            <button type="button" className="ghost" onClick={() => { clearSession(); back(); }}>🧹 Sesi Baru</button>
            <button type="button" className="ghost" onClick={() => setAnimOn((v) => !v)}>{animOn ? "⏸️ Animasi" : "▶️ Animasi"}</button>
            {kbdHint && <span className="kbd-hint" role="status" aria-live="polite">{kbdHint}</span>}
          </div>

          <div className="studio-tabs" role="tablist" aria-label="Panel edit">
            {[["template", T.tabTemplate], ["warna", T.tabWarna], ["stiker", T.tabStiker], ["teks", T.tabTeks], ["retouch", T.tabRetouch], ["unduh", T.tabUnduh]].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          {tab === "template" && (
            <div className="tab-panel">
              <label className="ghost" style={{ display:"inline-flex", alignItems:"center", gap:6, marginBottom:8 }}>
                🎨 Template Layout
                <select value={layout} onChange={(e) => switchLayout(e.target.value)} aria-label="Pilih layout + rasio cetak" style={{ marginLeft:8, padding:4, fontSize:13, borderRadius:4, border:"1px solid #9ca3af" }}>
                  {LAYOUTS.map(([lid, label]) => (
                    <option key={lid} value={lid}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="shapes slim" style={{ marginTop:8 }}>
                {SHAPES.map(([id, label]) => (
                  <button key={id} type="button" className={template === id ? "on" : ""} aria-pressed={template === id} onClick={() => switchLayout(LAYOUT_BY_TEMPLATE[id])}>{label}</button>
                ))}
              </div>
              <label className="ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                🖼️ Frame PNG-mu
                <input type="file" accept="image/png,image/webp" hidden onChange={(e) => { onFrameUpload(e.target.files[0]); e.target.value = ""; }} />
              </label>
              {customFrame && <button className="ghost" style={{ marginTop: 8 }} type="button" onClick={clearFrame}>🗑️ Lepas Frame</button>}
            </div>
          )}

          {tab === "warna" && (
            <div className="tab-panel">
              <div className="looks" role="group" aria-label="Warna frame">
                {LOOKS.map(([id, color]) => (
                  <button key={id} type="button" className={look === id ? "on" : ""} aria-label={id} aria-pressed={look === id} style={{ background: color }} onClick={() => withHistory(() => setLook(id))} />
                ))}
              </div>
            </div>
          )}

          {tab === "stiker" && (
            <div className="tab-panel">
              <div className="sticker-tabs" role="tablist">
                {Object.keys(STICKER_PACKS).map((pack) => (
                  <button key={pack} type="button" className={stickerPack === pack ? "on" : ""} onClick={() => setStickerPack(pack)}>{pack}</button>
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
              </div>
              <div className="sticker-tools">
                <button type="button" className="ghost" disabled={picked < 0} onClick={() => withHistory(() => tweakSticker((s) => ({ size: clamp(s.size + 14, 36, 200) })))}>➕</button>
                <button type="button" className="ghost" disabled={picked < 0} onClick={() => withHistory(() => tweakSticker((s) => ({ size: clamp(s.size - 14, 36, 200) })))}>➖</button>
                <button type="button" className="ghost" disabled={picked < 0} onClick={() => withHistory(() => tweakSticker((s) => ({ rot: (s.rot + 15) % 360 })))}>🔄</button>
                <button type="button" className="ghost" disabled={picked < 0} onClick={() => withHistory(() => tweakSticker((s) => ({ flip: !s.flip })))}>↔️</button>
                <button type="button" className="ghost" disabled={picked < 0} onClick={() => { pushHistory(); setStickers((prev) => prev.filter((_, i) => i !== picked)); setPicked(-1); }}>❌</button>
                <button type="button" className={ink ? "ghost on" : "ghost"} aria-pressed={ink} onClick={() => setInk((v) => !v)}>{ink ? "✏️ Selesai" : "✏️ Coret"}</button>
                <button type="button" className="ghost" disabled={!doodles.length} onClick={() => withHistory(() => setDoodles([]))}>🗑️ Coretan</button>
              </div>
            </div>
          )}

          {tab === "teks" && (
            <div className="tab-panel">
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
                <button type="button" className="ghost" disabled={pickedText < 0} onClick={() => tweakText((t) => ({ rot: (t.rot + 15) % 360 }))}>🔄</button>
                <button type="button" className="ghost" disabled={pickedText < 0} onClick={() => {
                  setTexts((prev) => prev.filter((_, i) => i !== pickedText));
                  setPickedText(-1);
                }}>🗑️</button>
              </div>
            </div>
          )}

          {tab === "retouch" && (
            <div className="tab-panel">
              <div className="timers" style={{ marginBottom: 8 }}>
                {Object.entries(RETOUCH_PRESETS).map(([label, preset]) => (
                  <button key={label} type="button" className="ghost" onClick={() => setRetouch(preset)}>{label}</button>
                ))}
              </div>
              <div className="retouch-panel">
                <label>Kecerahan ({retouch.brightness}%)
                  <input type="range" min={70} max={140} value={retouch.brightness} onChange={(e) => setRetouch((r) => ({ ...r, brightness: Number(e.target.value) }))} />
                </label>
                <label>Kontras ({retouch.contrast}%)
                  <input type="range" min={70} max={140} value={retouch.contrast} onChange={(e) => setRetouch((r) => ({ ...r, contrast: Number(e.target.value) }))} />
                </label>
                <label>Saturasi ({retouch.saturate}%)
                  <input type="range" min={0} max={160} value={retouch.saturate} onChange={(e) => setRetouch((r) => ({ ...r, saturate: Number(e.target.value) }))} />
                </label>
                <label>Soft Glow ({retouch.smooth})
                  <input type="range" min={0} max={5} value={retouch.smooth} onChange={(e) => setRetouch((r) => ({ ...r, smooth: Number(e.target.value) }))} />
                </label>
                <button type="button" className="ghost" onClick={() => setRetouch(emptyRetouch)}>Reset</button>
              </div>
            </div>
          )}

          {tab === "unduh" && (
            <div className="tab-panel">
              <div className="timers">
                {RATIOS.map(([id, label]) => (
                  <button key={id} type="button" className={ratio === id ? "on" : ""} aria-pressed={ratio === id} onClick={() => withHistory(() => setRatio(id))}>{label}</button>
                ))}
              </div>
              <div className="foot">
                <label>{T.namaBooth}<input maxLength={24} value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label>Nama Event (opsional)<input maxLength={24} value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Ultah Rara, Wisuda, dll" /></label>
                <label>{T.tautanQR}<input type="url" inputMode="url" placeholder={location.origin} value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} /></label>
              </div>
              <p className="fine">QR kosong = otomatis mengarah ke <b>{location.href.split("?")[0]}</b>, bisa di-scan langsung dari strip.</p>
            </div>
          )}

          <div className="bar edit-actions">
            <button className="shutter big" type="button" onClick={save}>{T.simpan}</button>
            <button className="ghost" type="button" onClick={saveJpeg}>🗜️ JPEG</button>
            <button className="ghost" type="button" onClick={copyToClipboard}>📋 {T.salin}</button>
            <button className="ghost" type="button" onClick={shareStrip}>📤 {T.bagikan}</button>
            <button className="ghost" type="button" onClick={printStrip}>🖨️ {T.cetak}</button>
            <button className="ghost" type="button" onClick={exportVideo}>🎬 {T.video}</button>
            {mode === "2" && <button className="ghost" type="button" onClick={sendStripToRoom} disabled={!connected}>📟 Kirim ke Room</button>}
            <button className="ghost" type="button" onClick={() => open()}>🔁 Foto Ulang</button>
          </div>

          {gallery.length > 0 && (
            <div className="gallery">
              <div className="gallery-head">
                <h3>🖼️ {T.galeri} ({gallery.length})</h3>
                <button type="button" className="ghost" onClick={clearGallery}>🗑️ Hapus Semua</button>
              </div>
              <div className="gallery-row">
                {gallery.map((g) => (
                  <div key={g.id} className="gallery-item">
                    <img src={g.url} alt={g.name} loading="lazy" />
                    <div className="gallery-actions">
                      <a href={g.url} download={`kentamal-${g.id}.jpg`}>⬇️</a>
                      <button type="button" onClick={() => removeFromGallery(g.id)} title="Hapus">🗑️</button>
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

// Foto "terbang" dari posisi kamera ke kanvas studio (FLIP sederhana, tanpa lib).
function FlyShot({ fly, previewRef, onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const target = previewRef.current;
    if (!el) return;
    el.style.left = `${fly.from.left}px`;
    el.style.top = `${fly.from.top}px`;
    el.style.width = `${fly.from.width}px`;
    el.style.height = `${fly.from.height}px`;
    // target cuma ada setelah step="edit" ter-render → tunggu 2 frame
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const r = target?.getBoundingClientRect();
        if (r) {
          el.style.left = `${r.left}px`;
          el.style.top = `${r.top}px`;
          el.style.width = `${r.width}px`;
          el.style.height = `${r.height}px`;
        }
      });
    });
    const t = setTimeout(onDone, 620);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); clearTimeout(t); };
  }, [fly, previewRef, onDone]);
  return <img ref={ref} className="fly-shot" src={fly.url} alt="" aria-hidden="true" />;
}

function Stage({ cams, filterCss, count, flash, mirror }) {
  function toggleFs(e) {
    const scope = e.currentTarget.closest("section") || document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else scope.requestFullscreen?.().catch(() => {});
  }

  // Simple AR prop lookup
  function getArPropEmoji(id) {
    if (id === "crown" || id === "👑") return "👑";
    if (id === "cap" || id === "🧢") return "🧢";
    if (id === "party-hat" || id === "🎉") return "🎉";
    if (id === "sunglasses" || id === "🕶️") return "🕶️";
    if (id === "glasses" || id === "👓") return "👓";
    if (id === "hearts-eyes" || id === "💖") return "💖";
    if (id === "bunny" || id === "🐰") return "🐰";
    if (id === "cat" || id === "🐱") return "🐱";
    return id;
  }

  function getTypeForProp(id) {
    if (["crown", "cap", "party-hat"].includes(id)) return "hat";
    if (["sunglasses", "glasses", "hearts-eyes"].includes(id)) return "eyes";
    if (["bunny", "cat"].includes(id)) return "top";
    return "mouth";
  }

  return (
    <div className="stage">
      {cams.length === 0 && <div className="cam-skeleton" aria-hidden="true"><span>Memuat kamera…</span></div>}
      <div className={"cams" + (cams.length > 1 ? " dual" : "")} id="cams">
        {cams.map((stream, i) => <Cam key={stream.id || i} stream={stream} filterCss={filterCss} mirror={mirror} />)}
        {landmarks && arProp && (
          <AROverlay 
            landmarks={landmarks}
            arProps={[{ id: arProp, emoji: getArPropEmoji(arProp), type: getTypeForProp(arProp) }]}
            active={true}
            width={640}
            height={480}
          />
        )}
      </div>
      <div className="count" key={count} aria-live="assertive">{count}</div>
      <div className={flash ? "flash on" : "flash"} />
      <button type="button" className="fs-btn" onClick={toggleFs} title="Layar penuh" aria-label="Layar penuh">⛶</button>
    </div>
  );
}

function Cam({ stream, filterCss, mirror }) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
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
