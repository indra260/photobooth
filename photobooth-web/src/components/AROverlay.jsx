import { useEffect, useRef } from "react";

/**
 * AR Overlay Canvas - draws face landmarks and props over video
 */
export default function AROverlay({ 
  landmarks = null, 
  arProps = [], 
  active = false,
  width = 640,
  height = 480
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
    
    // Draw face mesh (optional debugging outline)
    if (landmarks && landmarks.length > 0) {
      const faceLandmarks = landmarks[0]; // First face detected
      
      // Draw landmarks as dots (using canvas width for scaling)
      ctx.fillStyle = "#4f46e5";
      for (let i = 0; i < Math.min(faceLandmarks.length, 478); i++) {
        const landmark = faceLandmarks[i];
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw AR props
      arProps.forEach(prop => {
        ctx.save();
        
        // Calculate position based on type
        const noseTip = faceLandmarks[1];
        const leftEyeInner = faceLandmarks[468];
        const rightEyeInner = faceLandmarks[473];
        const mouthCenter = faceLandmarks[13];
        
        const faceWidth = Math.abs(rightEyeInner.x - leftEyeInner.x) * canvas.width;
        const faceHeight = (mouthCenter.y - noseTip.y) * canvas.height;
        
        const faceCenterX = (leftEyeInner.x + rightEyeInner.x) / 2 * canvas.width;
        const faceCenterY = (noseTip.y + mouthCenter.y) / 2 * canvas.height;
        
        const scale = Math.max(faceWidth, faceHeight) / 300;
        
        let posX, posY, propScale;
        
        switch (prop.type) {
          case "hat":
            posX = faceCenterX;
            posY = faceCenterY - (faceHeight * 0.6);
            propScale = scale * prop.scale * 2.5;
            break;
          case "eyes":
            posX = faceCenterX;
            posY = faceCenterY - (faceHeight * 0.15);
            propScale = scale * prop.scale * 1.8;
            break;
          case "top":
            posX = faceCenterX;
            posY = faceCenterY - (faceHeight * 0.8);
            propScale = scale * prop.scale * 2.0;
            break;
          case "mouth":
            posX = faceCenterX;
            posY = faceCenterY + (faceHeight * 0.1);
            propScale = scale * prop.scale * 1.5;
            break;
          default:
            posX = faceCenterX;
            posY = faceCenterY;
            propScale = scale;
        }
        
        ctx.translate(posX, posY);
        ctx.scale(propScale, propScale);
        ctx.font = `${60}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(prop.emoji, 0, 5);
        ctx.restore();
      });
    }
  }, [landmarks, arProps, active, width, height]);
  
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
