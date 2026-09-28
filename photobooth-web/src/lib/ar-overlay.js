/**
 * AR Sticker Overlay - render head-following props onto video frame
 * Uses MediaPipe face landmarks for positioning
 */
export function drawAROverlay(ctx, landmarks, arProps) {
  if (!landmarks || !Array.isArray(landmarks)) return;
  
  // Calculate face bounding box from landmarks
  const noseTip = landmarks[1]; // 0-based index: [1] is nose tip
  const leftEyeInner = landmarks[468]; // Left eye inner corner
  const rightEyeInner = landmarks[473]; // Right eye inner corner
  const mouthCenter = landmarks[13]; // Mouth center upper lip
  
  const faceWidth = Math.abs(rightEyeInner.x - leftEyeInner.x) * 1000;
  const faceHeight = (mouthCenter.y - noseTip.y) * 1000;
  
  const faceCenterX = (leftEyeInner.x + rightEyeInner.x) / 2 * 1000;
  const faceCenterY = (noseTip.y + mouthCenter.y) / 2 * 1000;
  
  // Scale factors based on typical head size
  const scale = Math.max(faceWidth, faceHeight) / 300;
  
  // Render each prop
  arProps.forEach(prop => {
    ctx.save();
    
    // Position calculation based on prop type
    let posX, posY, propScale;
    
    switch (prop.type) {
      case "hat": // Top of head
        posX = faceCenterX;
        posY = faceCenterY - (faceHeight * 0.6);
        propScale = scale * prop.scale * 2.5;
        break;
      
      case "eyes": // Eyewear
        posX = faceCenterX;
        posY = faceCenterY - (faceHeight * 0.15);
        propScale = scale * prop.scale * 1.8;
        break;
      
      case "top": // Ears/horns
        posX = faceCenterX;
        posY = faceCenterY - (faceHeight * 0.8);
        propScale = scale * prop.scale * 2.0;
        break;
      
      case "mouth": // Face marks
        posX = faceCenterX;
        posY = faceCenterY + (faceHeight * 0.1);
        propScale = scale * prop.scale * 1.5;
        break;
      
      default:
        posX = faceCenterX;
        posY = faceCenterY;
        propScale = scale;
    }
    
    // Apply transformations
    ctx.translate(posX, posY);
    ctx.scale(propScale, propScale);
    
    // Draw emoji prop
    ctx.font = `${60}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(prop.emoji, 0, 5);
    
    ctx.restore();
  });
}
