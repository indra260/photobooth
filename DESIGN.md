# Booth visual

Alat, bukan halaman iklan. Gaya "komik": garis tebal, shadow keras, aksen satu warna.

## Palet

Mode terang (default):
- Latar: `#f4f2fb` (faint lavender) + grid halus
- Permukaan: `#ffffff`
- Tinta/garis: `#241d3d`
- Teks redup: `#6f6690`
- Aksen: `#4f46e5` (indigo — digeser dari ungu #8e36ff biar nggak kembar Jepreto, masih satu keluarga)
- Sekunder: kuning `#ffcf3f` (pill, starburst logo, hard-shadow highlight), soft `#eeeaff`
- Tersier: pink `#f0518f`, cyan `#2fbcd6`

Mode gelap (toggle 🌙, disimpan di localStorage):
- Latar `#131022`, permukaan `#1c1830`, garis `#38304f`, teks `#efeaf9`, aksen terang `#7c6ef0`

Kertas strip cetak terpisah dari UI: krem `#f4f1ea`, tinta `#1a1814` (lihat LOOKS/TEMPLATE_COLORS di draw.js).

## Bentuk

- Sudut 12–24px, tombol pill
- Border 2–3px `--line` + hard shadow 2–7px (translate hover mengangkat)
- Satu aksen ungu; kuning cuma untuk highlight kecil
- Font: Chillax (fontshare, fallback Segoe UI/system)

## Gerak & interaksi

- Flash putih singkat saat jepret; tombol mengecil saat ditekan
- Ripple ungu di semua tombol, confetti saat unduh, View Transitions antar halaman
- `prefers-reduced-motion` mematikan transisi & confetti; hitung mundur tetap (informasi)
- Scroll reveal IntersectionObserver (konten tetap terlihat tanpa JS)
- Motion layer (`src/motion.css`): entrance hero stagger, kartu mode sweep + wiggle ikon, burst angka hitung mundur, ring shutter, slide-up panel studio per-tab, pop thumbnail/pastikan, marquee nama template di landing (pause saat hover)
- Tombol ⛶ fullscreen di stage kamera (ala SnapHeaven)

## Tata letak

- Landing: nav sticky → hero + CTA → katalog template (cari + ⭐fav, favorit di depan) → cara kerja → testimoni
- Booth live: stage video 4:3 dengan count besar di tengah; dock filter/timer/shutter di bawah; tombol jepret tidak menutupi muka
- Studio edit: canvas di atas, deret thumbnail + undo-bar, panel pakai TAB (Template/Warna/Stiker/Teks/Retouch/Unduh) supaya tidak jadi dinding tombol; aksi ekspor grid 3 kolom
- Mobile-first: breakpoint 1199/767/380px, target sentuh min 44px

## Logo

Wordmark SVG komik (starburst kuning + badge kamera ungu + KENTAMAL/BOOTH).
Ikon app PNG 192/512 + maskable (generated, lihat scripts/generate-icons.js).
