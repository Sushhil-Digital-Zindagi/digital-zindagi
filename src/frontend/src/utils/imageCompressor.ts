/**
 * Image Compressor Utility
 * Compresses any uploaded image to 50KB-70KB using canvas resizing
 * High quality, maintains aspect ratio
 */

export interface CompressOptions {
  targetKB?: number; // Target size in KB (default: 60)
  maxWidth?: number; // Max width in pixels (default: 800)
  maxHeight?: number; // Max height in pixels (default: 800)
  quality?: number; // Initial JPEG quality 0-1 (default: 0.85)
}

export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {},
): Promise<string> {
  const {
    targetKB = 60,
    maxWidth = 800,
    maxHeight = 800,
    quality: initialQuality = 0.85,
  } = options;

  const targetBytes = targetKB * 1024;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down to fit within maxWidth/maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        // Try to compress to target size
        let quality = initialQuality;
        let result = canvas.toDataURL("image/jpeg", quality);

        // If still too large, reduce quality iteratively
        let iterations = 0;
        while (
          result.length * 0.75 > targetBytes &&
          quality > 0.1 &&
          iterations < 15
        ) {
          quality -= 0.07;
          result = canvas.toDataURL("image/jpeg", Math.max(quality, 0.1));
          iterations++;
        }

        // If still too large, scale down canvas further
        if (result.length * 0.75 > targetBytes * 1.5) {
          let scaleFactor = 0.8;
          while (result.length * 0.75 > targetBytes && scaleFactor > 0.2) {
            const sw = Math.round(width * scaleFactor);
            const sh = Math.round(height * scaleFactor);
            canvas.width = sw;
            canvas.height = sh;
            ctx.drawImage(img, 0, 0, sw, sh);
            result = canvas.toDataURL("image/jpeg", 0.7);
            scaleFactor -= 0.1;
          }
        }

        resolve(result);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image from file input and return base64 string
 * Use this in profile photo upload handlers
 */
export async function compressProfilePhoto(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Sirf image files allowed hain (JPG, PNG, WebP)");
  }

  // Validate file exists
  if (file.size === 0) {
    throw new Error("File empty hai");
  }

  return compressImage(file, {
    targetKB: 65,
    maxWidth: 600,
    maxHeight: 600,
    quality: 0.82,
  });
}

/**
 * Get approximate size of a base64 string in KB
 */
export function getBase64SizeKB(base64: string): number {
  const base64Data = base64.split(",")[1] || base64;
  return Math.round((base64Data.length * 0.75) / 1024);
}
