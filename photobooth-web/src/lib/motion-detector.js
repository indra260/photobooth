/**
 * Motion & Face Detection using MediaPipe
 * - Real-time face tracking
 * - Motion detection (frame-by-frame comparison)
 * - Smile detection (landmark ratio analysis)
 */

import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

class MotionDetector {
  constructor(videoElement, callback = null) {
    this.video = videoElement;
    this.callback = callback; // { onFaceDetected, onMotionDetected, onSmileDetected }
    this.faceMesh = null;
    this.camera = null;
    this.isRunning = false;
    this.lastFrameData = null;
    this.motionThreshold = 5.0; // pixel movement threshold
    this.smileThreshold = 0.35; // mouth openness ratio
    
    // Smile landmarks: upper lip (13,14,15,16) and lower lip (17,18,19,20)
    this.initialLipHeight = null;
    
    this.init();
  }

  async init() {
    // Setup MediaPipe FaceMesh
    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1666490514/${file}`;
      }
    });

    this.faceMesh.onResults(this.onResults.bind(this));

    // Setup MediaPipe Camera
    this.camera = new Camera(this.video, {
      onFrame: async () => {
        if (!this.isRunning) return;
        await this.faceMesh.send({ image: this.video });
      },
      width: 640,
      height: 480
    });

    console.log('[MotionDetector] Initialized');
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.initialLipHeight = null;
    
    try {
      this.camera.start();
      console.log('[MotionDetector] Camera started');
    } catch (err) {
      console.error('[MotionDetector] Failed to start camera:', err);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
      console.log('[MotionDetector] Camera stopped');
    }
  }

  isDetecting() {
    return this.isRunning;
  }

  getFaceLandmarks() {
    if (!this.lastResult) return null;
    return this.lastResult.multiFaceLandmarks;
  }

  calculateMouthOpenness(landmarks) {
    const UPPER_LIP_TOP = 13;
    const LOWER_LIP_BOTTOM = 17;
    
    const upperLipY = landmarks[UPPER_LIP_TOP].y * 1000;
    const lowerLipY = landmarks[LOWER_LIP_BOTTOM].y * 1000;
    
    // Calculate vertical distance
    const mouthHeight = Math.abs(lowerLipY - upperLipY);
    
    // Normalize based on typical face size (~300-400 pixels in Y at distance)
    return mouthHeight / 400;
  }

  detectSmile(landmarks) {
    const mouthOpenness = this.calculateMouthOpenness(landmarks);
    const isSmiling = mouthOpenness > this.smileThreshold;
    
    if (isSmiling && !this.wasSmiling) {
      this.wasSmiling = true;
      if (this.callback?.onSmileDetected) {
        this.callback.onSmileDetected({ mouthOpenness });
      }
    } else if (!isSmiling) {
      this.wasSmiling = false;
    }
    
    return { mouthOpenness, isSmiling };
  }

  detectMotion(landmarks) {
    if (!this.lastFrameData) {
      this.lastFrameData = { landmarks, timestamp: Date.now() };
      return false;
    }

    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastFrameData.timestamp;
    
    // Only check motion every 200ms
    if (timeDiff < 200) {
      return false;
    }

    // Compare face center position
    const currentCenterX = landmarks[10].x * 1000; // nose tip
    const lastCenterX = this.lastFrameData.landmarks[10].x * 1000;
    
    const motionDistance = Math.abs(currentCenterX - lastCenterX);
    const hasMotion = motionDistance > this.motionThreshold;

    this.lastFrameData = { landmarks, timestamp: currentTime };

    if (hasMotion && this.callback?.onMotionDetected) {
      this.callback.onMotionDetected({ 
        distance: motionDistance, 
        direction: currentCenterX > lastCenterX ? 'right' : 'left'
      });
    }

    return hasMotion;
  }

  onResults(results) {
    this.lastResult = results;
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Detect smile
      const smileData = this.detectSmile(landmarks);
      
      // Detect motion
      const hasMotion = this.detectMotion(landmarks);
      
      if (this.callback?.onFaceDetected) {
        this.callback.onFaceDetected({ 
          landmarks,
          smile: smileData,
          motion: hasMotion 
        });
      }
    }
  }

  dispose() {
    this.stop();
    this.faceMesh = null;
    this.camera = null;
    console.log('[MotionDetector] Disposed');
  }
}

export default MotionDetector;
