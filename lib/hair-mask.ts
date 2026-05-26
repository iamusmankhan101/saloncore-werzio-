/**
 * Composites the AI-generated result with the original image using the hair mask.
 * Hair region (white in mask) → take from aiResult (new color).
 * Face/body region (black in mask) → take from original (unchanged).
 * This guarantees zero face drift regardless of what the AI generated.
 */
export function compositeWithMask(
  original: string,
  aiResult: string,
  mask: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const origImg = new Image();
    const aiImg = new Image();
    const maskImg = new Image();
    let loaded = 0;

    function onLoad() {
      if (++loaded < 3) return;
      const { width, height } = origImg;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      // Draw original as base
      ctx.drawImage(origImg, 0, 0, width, height);
      const origData = ctx.getImageData(0, 0, width, height);

      // Draw AI result
      ctx.drawImage(aiImg, 0, 0, width, height);
      const aiData = ctx.getImageData(0, 0, width, height);

      // Draw mask
      ctx.drawImage(maskImg, 0, 0, width, height);
      const maskData = ctx.getImageData(0, 0, width, height);

      // Composite: for each pixel, lerp between original and AI using mask brightness
      const out = ctx.createImageData(width, height);
      for (let i = 0; i < out.data.length; i += 4) {
        const alpha = maskData.data[i] / 255; // 0 = keep original, 1 = use AI
        out.data[i]     = origData.data[i]     * (1 - alpha) + aiData.data[i]     * alpha;
        out.data[i + 1] = origData.data[i + 1] * (1 - alpha) + aiData.data[i + 1] * alpha;
        out.data[i + 2] = origData.data[i + 2] * (1 - alpha) + aiData.data[i + 2] * alpha;
        out.data[i + 3] = 255;
      }
      ctx.putImageData(out, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    }

    origImg.onload = onLoad;
    aiImg.onload = onLoad;
    maskImg.onload = onLoad;
    origImg.onerror = aiImg.onerror = maskImg.onerror = reject;
    origImg.src = original;
    aiImg.src = aiResult;
    maskImg.src = mask;
  });
}

/**
 * Generates a hair mask for portrait photos.
 * WHITE = hair region, BLACK = face/body/background to preserve.
 *
 * Strategy: cover top of head + both side strips, then cut out the face center.
 */
export function generateHairMask(imageBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      // 1. TOP OF HEAD — radial gradient from crown downward
      const topGrad = ctx.createRadialGradient(
        width * 0.5, 0, 0,
        width * 0.5, height * 0.05, width * 0.65,
      );
      topGrad.addColorStop(0,    "rgba(255,255,255,1)");
      topGrad.addColorStop(0.55, "rgba(255,255,255,0.9)");
      topGrad.addColorStop(0.85, "rgba(255,255,255,0.4)");
      topGrad.addColorStop(1,    "rgba(255,255,255,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, height * 0.5);

      // 2. LEFT SIDE HAIR — linear gradient from left edge inward
      const leftGrad = ctx.createLinearGradient(0, 0, width * 0.45, 0);
      leftGrad.addColorStop(0,    "rgba(255,255,255,0.95)");
      leftGrad.addColorStop(0.4,  "rgba(255,255,255,0.7)");
      leftGrad.addColorStop(0.75, "rgba(255,255,255,0.2)");
      leftGrad.addColorStop(1,    "rgba(255,255,255,0)");
      ctx.fillStyle = leftGrad;
      ctx.fillRect(0, height * 0.05, width * 0.45, height * 0.85);

      // 3. RIGHT SIDE HAIR — linear gradient from right edge inward
      const rightGrad = ctx.createLinearGradient(width, 0, width * 0.55, 0);
      rightGrad.addColorStop(0,    "rgba(255,255,255,0.95)");
      rightGrad.addColorStop(0.4,  "rgba(255,255,255,0.7)");
      rightGrad.addColorStop(0.75, "rgba(255,255,255,0.2)");
      rightGrad.addColorStop(1,    "rgba(255,255,255,0)");
      ctx.fillStyle = rightGrad;
      ctx.fillRect(width * 0.55, height * 0.05, width * 0.45, height * 0.85);

      // 4. ERASE FACE CENTER — radial cutout so face stays unchanged
      //    Face center ≈ 50% width, 38% from top for a standard portrait
      ctx.globalCompositeOperation = "destination-out";
      const faceGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.37, width * 0.06,   // hard inner ring (nose area)
        width * 0.5, height * 0.37, width * 0.3,    // soft outer fade
      );
      faceGrad.addColorStop(0,   "rgba(0,0,0,1)");
      faceGrad.addColorStop(0.6, "rgba(0,0,0,0.95)");
      faceGrad.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = faceGrad;
      ctx.fillRect(0, 0, width, height);

      // Fill transparent (erased face/edge) pixels with black so the mask is fully opaque.
      // destination-over draws under existing content — only transparent pixels get the fill.
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "source-over";
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = imageBase64;
  });
}
