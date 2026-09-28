import { useEffect, useRef } from "react";

/**
 * AR Overlay Canvas - draws face landmarks and props over video
 * Handles mirror transform so props appear correctly aligned even when video is flipped
 */
export default function AROverlay({ 
  landmarks = null, 
  arProps = [], 
  active = false,
  width = 640,
  height = 480,
  mirror = true
}) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (landmarks && landmarks.length > 0) {
      const faceLandmarks = landmarks[0];
      
      // Draw landmarks as dots
      ctx.fillStyle = "#4f46e5";
      for (let i = 0; i < Math.min(faceLandmarks.length, 478); i++) {
        const landmark = faceLandmarks[i];
        ctx.beginPath();
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.arc(x, y, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Calculate face bounding box
      const noseTip = faceLandmarks[1];
      const leftEyeInner = faceLandmarks[468];
      const rightEyeInner = faceLandmarks[473];
      const mouthCenter = faceLandmarks[13];
      
      let lx = leftEyeInner.x * canvas.width;
      let rx = rightEyeInner.x * canvas.width;
      let my = mouthCenter.y * canvas.height;
      let ny = noseTip.y * canvas.height;
      
      // Mirror transform on coords
      if (mirror) {
        lx = canvas.width - lx;
        rx = canvas.width - rx;
        lx = canvas.width - (leftEyeInner.x * canvas.width);
        rx = canvas.width - (rightEyeInner.x * canvas.width);
      }
      
      const faceWidth = Math.abs(rx - lx);
      const faceHeight = Math.abs(my - ny);
      const faceCenterX = (lx + rx) / 2;
      const faceCenterY = (ny + my) / 2;
      
      const baseScale = Math.max(faceWidth, faceHeight) / 300;
      
      // Draw each prop
      arProps.forEach(prop => {
        ctx.save();
        
        // Position based on type
        let posX = faceCenterX;
        let posY = faceCenterY;
        
        switch (prop.type) {
          case "hat": posY -= faceHeight * 0.6; break;
          case "eyes": posY -= faceHeight * 0.15; break;
          case "top": posY -= faceHeight * 0.8; break;
          case "mouth": posY += faceHeight * 0.1; break;
          default: break;
        }
        
        // Scale & draw
        const scale = baseScale * prop.scale * 2.0;
        ctx.translate(posX, posY);
        ctx.scale(scale, scale);
        ctx.font = `${60}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(prop.emoji, 0, 5);
        
        ctx.restore();
      });
    }
  }, [landmarks, arProps, active, width, height, mirror]);
  
  if (!active) return null;
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10
      }}
      aria-hidden="true"
    />
  );
}
