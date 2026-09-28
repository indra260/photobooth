import { useRef, useEffect, useState } from "react";

/**
 * TimelinePhotoReveal — horizontal swipe gallery setelah shoot
 * - Swipe left/right untuk lihat semua foto
 * - Tap foto untuk retake
 * - Long-press untuk hapus
 * - Auto-scroll ke foto terakhir
 */
export default function TimelinePhotoReveal({ shots, onRetake, onDelete, onClose }) {
  const trackRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [activeIdx, setActiveIdx] = useState(shots.length - 1);
  const [pressing, setPressing] = useState(false);
  const longPressTimer = useRef(null);

  // Auto-scroll ke foto terakhir saat mount
  useEffect(() => {
    if (trackRef.current && shots.length > 0) {
      requestAnimationFrame(() => {
        if (trackRef.current) {
          trackRef.current.scrollTo({
            left: trackRef.current.scrollWidth,
            behavior: "smooth"
          });
        }
      });
    }
  }, [shots.length]);

  function scrollToIdx(idx) {
    if (idx < 0 || idx >= shots.length) return;
    setActiveIdx(idx);
    const card = trackRef.current?.querySelector(`[data-idx="${idx}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setPressing(true);
    // Long press = delete (500ms)
    longPressTimer.current = setTimeout(() => {
      if (Math.abs(touchStartX.current - e.touches[0].clientX) < 10) {
        setPressing(false);
        onDelete?.(activeIdx);
        // Reset timer
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }
    }, 500);
  }

  function handleTouchMove(e) {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    // Cancel long press if movement detected
    if (dx > 10 || dy > 10) {
      setPressing(false);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  }

  function handleTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setPressing(false);
  }

  return (
    <div className="timeline-reveal" role="dialog" aria-label="Foto-foto sesi">
      <div className="timeline-header">
        <strong>📸 {shots.length} Foto Sesi</strong>
        <button className="ghost" onClick={onClose} aria-label="Tutup timeline">✕</button>
      </div>
      
      <div
        ref={trackRef}
        className="timeline-track"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {shots.map((shot, idx) => (
          <button
            key={idx}
            data-idx={idx}
            className={`timeline-card ${idx === activeIdx ? "active" : ""} ${pressing && idx === activeIdx ? "pressing" : ""}`}
            onClick={() => {
              setActiveIdx(idx);
              onRetake?.(idx);
            }}
            aria-label={`Foto ${idx + 1}, tap untuk retake`}
          >
            <canvas
              ref={(el) => {
                if (!el || !shot.images[0]) return;
                el.width = 180;
                el.height = 240;
                const ctx = el.getContext("2d");
                const img = shot.images[0];
                const s = Math.max(el.width / img.width, el.height / img.height);
                const dw = img.width * s;
                const dh = img.height * s;
                ctx.drawImage(img, (el.width - dw) / 2, (el.height - dh) / 2, dw, dh);
              }}
            />
            <span className="timeline-num">{idx + 1}</span>
            {idx === activeIdx && (
              <span className="timeline-actions">
                <span
                  className="timeline-action-btn retake"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetake?.(idx);
                  }}
                  title="Foto ulang"
                >
                  📸 Ulangi
                </span>
                <span
                  className="timeline-action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(idx);
                  }}
                  title="Hapus foto"
                >
                  🗑️ Hapus
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Nav arrows (desktop) */}
      {shots.length > 1 && (
        <>
          <button
            className="timeline-nav prev"
            onClick={() => scrollToIdx(Math.max(0, activeIdx - 1))}
            disabled={activeIdx === 0}
            aria-label="Foto sebelumnya"
          >
            ‹
          </button>
          <button
            className="timeline-nav next"
            onClick={() => scrollToIdx(Math.min(shots.length - 1, activeIdx + 1))}
            disabled={activeIdx === shots.length - 1}
            aria-label="Foto berikutnya"
          >
            ›
          </button>
        </>
      )}

      <div className="timeline-hint">
        💡 Swipe kiri/kanan untuk navigasi • Tap foto untuk retake • Long-press untuk hapus
      </div>
    </div>
  );
}
