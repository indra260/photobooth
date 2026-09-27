# Kentamal Booth — Photobooth Digital di Browser

> Jepret, edit, unduh → tanpa install aplikasi. Semua proses di browser; foto tidak dikirim ke server.

## Fitur Utama

- **1 perangkat / 2 perangkat (room)**
  - Satu webcam: jepret langsung
  - Dua webcam: tiap jepretan jadi satu baris dua foto
  - **Room mode**: HP teman gabung pakai kode room (`?room=ABCD`), fotonya nyatu di strip laptop utama
- **36+ filter kamera** — iPhone, Fujifilm, Sony, Canon (CSS)
- **10+ template** — Classic Strip, Polaroid, Grid, Couple, Party, Komik, Fruit, Rainbow Leopard, Minimal + custom frame PNG
- **Edit lengkap**: crop/zoom/pan, stiker kategori, teks, coret-coret, soft glow (smooth), undo/redo, animasi preview
- **Unduh & Share**: PNG/JPEG HD, rasio Story (9:16)/Feed (4:5)/Kotak (1:1), copy ke clipboard, print, WebM video animasi
- **Galeri IndexedDB** — simpan hasil (Blobs) lokal, aman dari quota localStorage
- **Session restore** — sesi edit tersimpan, tidak nyuntik data rusak saat load ulang
- **PWA** — ikon 192/512/maskable, cache versi 2, bisa tambahkan ke homescreen
- **I18n ID/EN** (switch tombol bahasa)
- **Login/Register akun opsional** — jika Supabase dikonfigurasi, semua fitur tetap jalan tanpa login (auth graceful)

## Quick Start

```bash
cd photobooth-web
npm ci
npm run dev
```
Buka `http://localhost:5173` di browser, izinkan kamera.

Untuk build production:
```bash
npm run build
npm run preview   # atau deploy dist/ ke hosting statis
```

## Setup Akun (opsional)

1. Buat project di [Supabase](https://supabase.com)
2. Setel `.env.local`:
   ```env
   VITE_SUPABASE_URL=your-url
   VITE_SUPABASE_ANON_KEY=your-key
   ```
3. Nyalakan auth dengan Email password

Aplikasi tetap bisa dipakai tanpa konfigurasi ini.

## Struktur

- `src/App.jsx` — komponen utama (page, booth, studio UI)
- `src/booth.js` — TEMPLATES, FILTERS, geometry, cropRect
- `src/draw.js` — rendering strip final (QR, nama, stiker, teks, custom frame)
- `src/supabase.js` — client + graceful fallback (disabled jika env kosong)
- `lib/*` — helper modular: camera, sound, strip, gallery, session
- `public/*` — manifest, sw (cache v2), qrcode.min.js, templates, icon

## Catatan Teknis

- Tanpa backend, tanpa request foto ke luar. QR code mengarah ke URL halaman (bisa diubah di footer).
- Session disimpan via dataURL kecil JPEG (bukan objek canvas yang rusak).
- PeerJS untuk room mode, host/guest terpisah; link share `/?room=CODE` auto-gabung.
- Mirror toggle benar-benar diterapkan saat jepret.
- Smooth/Retouch sekarang "Soft Glow" halus (pinkish), bukan skin smoothing beneran.

## License

Folkware — bebas dipakai untuk event kampus, pesta, pernikahan, stand pameran, dll.
