
/**
 * Processes the white ink mask to create Metalness and Roughness Maps.
 * Optionally processes a Spot Varnish mask to modify Roughness and create a Clearcoat Map.
 */
export const processTextureMaps = (
    imgSrc: string | null, // White Ink Mask (Now Optional)
    varnishSrc: string | null, // Spot Varnish Mask (Optional)
    metalRoughness: number,
    paperRoughness: number,
    targetWidth: number = 1024,
    targetHeight: number = 1024
  ): Promise<{ metalnessMap: string; roughnessMap: string; clearcoatMap: string | null }> => {
    return new Promise((resolve, reject) => {
        // Helper to run the processing once we have dimensions and images
        const runProcessing = (whiteImg: HTMLImageElement | null, varnishImg: HTMLImageElement | null) => {
            const width = whiteImg ? whiteImg.width : (varnishImg ? varnishImg.width : targetWidth);
            const height = whiteImg ? whiteImg.height : (varnishImg ? varnishImg.height : targetHeight);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error("Could not get canvas context"));
              return;
            }

            // 1. Get White Ink Data
            let whiteInkData: Uint8ClampedArray;
            
            if (whiteImg) {
                ctx.drawImage(whiteImg, 0, 0, width, height);
                const rawData = ctx.getImageData(0, 0, width, height).data;
                whiteInkData = rawData;
                
                // INVERT WHITE INK DATA (Black Input -> White Logic)
                // Black (0) in file = Ink. White (255) in file = Metal.
                // We want Internal Logic: 255 = Ink, 0 = Metal.
                for (let i = 0; i < whiteInkData.length; i += 4) {
                    whiteInkData[i] = 255 - whiteInkData[i];     // R
                    whiteInkData[i + 1] = 255 - whiteInkData[i + 1]; // G
                    whiteInkData[i + 2] = 255 - whiteInkData[i + 2]; // B
                }
            } else {
                // If no white ink mask, assume FULL PAPER (All Ink).
                // Create array filled with 255.
                whiteInkData = new Uint8ClampedArray(width * height * 4);
                whiteInkData.fill(255); 
            }

            // 2. Get Varnish Data
            let varnishData: Uint8ClampedArray | null = null;
            if (varnishImg) {
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(varnishImg, 0, 0, width, height);
                const varnishRaw = ctx.getImageData(0, 0, width, height);
                varnishData = varnishRaw.data;

                // INVERT VARNISH DATA (Black Input -> White Logic)
                for (let i = 0; i < varnishData.length; i += 4) {
                    varnishData[i] = 255 - varnishData[i];
                    varnishData[i + 1] = 255 - varnishData[i + 1];
                    varnishData[i + 2] = 255 - varnishData[i + 2];
                }
            }

            // Prepare Output Maps
            const metalnessData = new Uint8ClampedArray(whiteInkData.length);
            const roughnessData = new Uint8ClampedArray(whiteInkData.length);
            const clearcoatData = varnishImg ? new Uint8ClampedArray(whiteInkData.length) : null;
      
            // Calculate scale factors (0-255)
            const metalRoughVal = Math.floor(Math.min(1, Math.max(0, metalRoughness)) * 255);
            const paperRoughVal = Math.floor(Math.min(255, paperRoughness * 255));
            const varnishRoughVal = 5; // Very low roughness for varnish (Glossy)
            
            for (let i = 0; i < whiteInkData.length; i += 4) {
              const r = whiteInkData[i]; // Mask Intensity: 0 = Metal, 255 = Ink/Paper
              
              // REMOVED THRESHOLDING: Allow gradients for smooth transitions
              const normalizedMask = r / 255;
    
              // --- Metalness ---
              // If r=255 (Ink), Metal=0. If r=0 (Metal), Metal=255.
              // Intermediate values create a blend.
              const metalVal = 255 - r; 
              metalnessData[i] = metalVal;
              metalnessData[i+1] = metalVal;
              metalnessData[i+2] = metalVal;
              metalnessData[i+3] = 255;
      
              // --- Roughness & Clearcoat ---
              let isVarnished = false;
              if (varnishData && clearcoatData) {
                  if (varnishData[i] > 100) {
                      isVarnished = true;
                      clearcoatData[i] = 255;
                      clearcoatData[i+1] = 255;
                      clearcoatData[i+2] = 255;
                      clearcoatData[i+3] = 255;
                  } else {
                      clearcoatData[i] = 0;
                      clearcoatData[i+1] = 0;
                      clearcoatData[i+2] = 0;
                      clearcoatData[i+3] = 255;
                  }
              }

              if (isVarnished) {
                  roughnessData[i] = varnishRoughVal;
                  roughnessData[i+1] = varnishRoughVal;
                  roughnessData[i+2] = varnishRoughVal;
                  roughnessData[i+3] = 255;
              } else {
                  // Standard logic: Metal vs Paper
                  // Smooth interpolation based on mask intensity
                  const roughVal = metalRoughVal + normalizedMask * (paperRoughVal - metalRoughVal);
                  roughnessData[i] = roughVal;
                  roughnessData[i+1] = roughVal;
                  roughnessData[i+2] = roughVal;
                  roughnessData[i+3] = 255;
              }
            }
      
            const createMapUrl = (pixelData: Uint8ClampedArray) => {
                const mapCanvas = document.createElement('canvas');
                mapCanvas.width = width;
                mapCanvas.height = height;
                const mapCtx = mapCanvas.getContext('2d');
                mapCtx?.putImageData(new ImageData(pixelData, width, height), 0, 0);
                return mapCanvas.toDataURL();
            };
    
            resolve({ 
                metalnessMap: createMapUrl(metalnessData), 
                roughnessMap: createMapUrl(roughnessData),
                clearcoatMap: clearcoatData ? createMapUrl(clearcoatData) : null
            });
        };

        // Loading Logic
        if (imgSrc) {
            // Case 1: White Ink Exists
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imgSrc;
            img.onload = () => {
                if (varnishSrc) {
                    const vImg = new Image();
                    vImg.crossOrigin = "Anonymous";
                    vImg.src = varnishSrc;
                    vImg.onload = () => runProcessing(img, vImg);
                    vImg.onerror = () => runProcessing(img, null);
                } else {
                    runProcessing(img, null);
                }
            };
            img.onerror = (err) => reject(err);
        } else if (varnishSrc) {
            // Case 2: No White Ink, but Varnish Exists
            const vImg = new Image();
            vImg.crossOrigin = "Anonymous";
            vImg.src = varnishSrc;
            vImg.onload = () => runProcessing(null, vImg);
            vImg.onerror = () => reject(new Error("Failed to load varnish"));
        } else {
            // Case 3: Nothing
            reject(new Error("No textures to process"));
        }
    });
  };
