/**
 * AR Sticker Props - Virtual accessories that follow head movement
 * Uses MediaPipe face landmarks to position props on face
 * 
 * Available props:
 * - Hats: 🎩 Crown 👑 Cap 🧢
 * - Glasses: 🕶️ Sunglasses 👓 Cool
 * - Ears: 🐰 Bunny 🐱 Cat
 * - Other: 🎸 Guitar 🌸 Flower
 */

import { useState, useRef, useEffect } from 'react';

const AR_PROPS = [
  // Hats
  { id: "crown", emoji: "👑", name: "Crown", type: "hat", offsetY: -0.25, scale: 1.2 },
  { id: "cap", emoji: "🧢", name: "Cap", type: "hat", offsetY: -0.18, scale: 1.0 },
  { id: "party-hat", emoji: "🎉", name: "Party Hat", type: "hat", offsetY: -0.30, scale: 1.1 },
  { id: "bow", emoji: "🎀", name: "Bow", type: "hat", offsetY: -0.22, scale: 0.8 },
  
  // Glasses
  { id: "sunglasses", emoji: "🕶️", name: "Cool Shades", type: "eyes", offsetY: -0.05, scale: 1.0 },
  { id: "glasses", emoji: "👓", name: "Smart Glasses", type: "eyes", offsetY: -0.05, scale: 0.9 },
  { id: "hearts-eyes", emoji: "💖", name: "Heart Eyes", type: "eyes", offsetY: -0.08, scale: 0.7 },
  
  // Ears/Head accessories
  { id: "bunny", emoji: "🐰", name: "Bunny Ears", type: "top", offsetY: -0.35, scale: 1.0 },
  { id: "cat", emoji: "🐱", name: "Cat Ears", type: "top", offsetY: -0.28, scale: 0.8 },
  { id: "devil", emoji: "😈", name: "Devil Horns", type: "top", offsetY: -0.32, scale: 0.7 },
  { id: "flower-crown", emoji: "🌸", name: "Flower Crown", type: "top", offsetY: -0.24, scale: 0.9 },
  
  // Face marks
  { id: "mustache", emoji: "👨", name: "Mustache", type: "mouth", offsetY: 0.18, scale: 0.6 },
  { id: "tears", emoji: "😢", name: "Happy Tears", type: "mouth", offsetY: 0.15, scale: 0.7 },
  { id: "blush", emoji: "😊", name: "Blush", type: "mouth", offsetY: 0.10, scale: 0.8 },
];

export default function ARStickerPicker({ onSelect, selectedId, disabled }) {
  const [showPicker, setShowPicker] = useState(false);
  
  // Group props by type
  const grouped = {
    hat: AR_PROPS.filter(p => p.type === "hat"),
    eyes: AR_PROPS.filter(p => p.type === "eyes"),
    top: AR_PROPS.filter(p => p.type === "top"),
    mouth: AR_PROPS.filter(p => p.type === "mouth"),
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="ghost"
        onClick={() => setShowPicker(!showPicker)}
        disabled={disabled}
        aria-label="Pilih AR Sticker"
        style={{ fontSize: "12px" }}
      >
        {selectedId ? (
          <>{AR_PROPS.find(p => p.id === selectedId)?.emoji} AR</>
        ) : (
          <>✨ AR Sticker</>
        )}
      </button>
      
      {showPicker && (
        <div
          className="ar-picker-popup"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--card, #fff)",
            border: "2px solid var(--line, #241d3d)",
            borderRadius: "12px",
            padding: "12px",
            zIndex: 1000,
            minWidth: "280px",
            boxShadow: "0 8px 24px rgba(36, 29, 61, 0.25)",
            maxHeight: "60vh",
            overflowY: "auto"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <strong style={{ fontSize: "13px" }}>Pilih AR Prop</strong>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              style={{ fontSize: "16px", padding: "2px 6px", border: "none", background: "transparent", cursor: "pointer" }}
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
          
          {Object.entries(grouped).map(([type, props]) => (
            <div key={type} style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", opacity: 0.6, marginBottom: "4px", textTransform: "uppercase", fontWeight: 700 }}>
                {type === "hat" && "🎩 Headwear"}
                {type === "eyes" && "👓 Eyewear"}
                {type === "top" && "✨ Top"}
                {type === "mouth" && "😄 Face"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
                {props.map((prop) => (
                  <button
                    key={prop.id}
                    type="button"
                    className={selectedId === prop.id ? "on ghost" : "ghost"}
                    onClick={() => {
                      onSelect(prop.id === selectedId ? null : prop.id);
                      setShowPicker(false);
                    }}
                    style={{
                      fontSize: "22px",
                      padding: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: selectedId === prop.id ? "var(--accent, #4f46e5)" : "transparent",
                      color: selectedId === prop.id ? "white" : "inherit",
                      border: `1px solid ${selectedId === prop.id ? "var(--accent, #4f46e5)" : "var(--line, #241d3d)"}`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    title={prop.name}
                    aria-label={prop.name}
                  >
                    {prop.emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setShowPicker(false);
            }}
            style={{
              width: "100%",
              marginTop: "6px",
              padding: "6px",
              fontSize: "11px",
              background: "rgba(0,0,0,0.05)",
              border: "1px solid var(--line, #241d3d)",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            🗑️ Hapus AR Prop
          </button>
        </div>
      )}
    </div>
  );
}

// Export the prop data so main component can use it
export { AR_PROPS };
