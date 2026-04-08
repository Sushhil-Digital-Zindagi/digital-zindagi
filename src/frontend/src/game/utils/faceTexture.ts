import * as THREE from "three";

/**
 * Draws the "Admin Default Face" — a professional-looking avatar.
 * Used when no photo is uploaded. Warm brown skin tone, dark hair, natural features.
 */
function drawAdminFace(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  // Clip to circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // ── Background gradient (warm dark)
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  bgGrad.addColorStop(0, "#1a0e05");
  bgGrad.addColorStop(1, "#0a0804");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // ── Hair (dark, slightly rounded top)
  ctx.beginPath();
  ctx.ellipse(cx, cy * 0.55, r * 0.54, r * 0.48, 0, Math.PI, 0);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  // Hair sides
  ctx.beginPath();
  ctx.ellipse(
    cx - r * 0.38,
    cy * 0.82,
    r * 0.18,
    r * 0.35,
    -0.2,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    cx + r * 0.38,
    cy * 0.82,
    r * 0.18,
    r * 0.35,
    0.2,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  // ── Face / skin
  const skinGrad = ctx.createRadialGradient(cx, cy * 0.95, 0, cx, cy, r * 0.55);
  skinGrad.addColorStop(0, "#c8904a");
  skinGrad.addColorStop(0.6, "#a8722e");
  skinGrad.addColorStop(1, "#8b5e1f");
  ctx.beginPath();
  ctx.ellipse(cx, cy * 0.98, r * 0.43, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = skinGrad;
  ctx.fill();

  // ── Eyebrows
  ctx.strokeStyle = "#2a1a08";
  ctx.lineWidth = size * 0.025;
  ctx.lineCap = "round";
  // Left brow
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.32, cy * 0.74);
  ctx.quadraticCurveTo(cx - r * 0.16, cy * 0.68, cx - r * 0.02, cy * 0.72);
  ctx.stroke();
  // Right brow
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.02, cy * 0.72);
  ctx.quadraticCurveTo(cx + r * 0.16, cy * 0.68, cx + r * 0.32, cy * 0.74);
  ctx.stroke();

  // ── Eyes (white + iris + pupil)
  function drawEye(ex: number, ey: number) {
    // White
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.1, r * 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f0ece4";
    ctx.fill();
    // Iris — dark brown
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = "#3a2010";
    ctx.fill();
    // Pupil
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.03, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0604";
    ctx.fill();
    // Eye shine
    ctx.beginPath();
    ctx.arc(ex + r * 0.02, ey - r * 0.02, r * 0.013, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();
  }
  drawEye(cx - r * 0.18, cy * 0.84);
  drawEye(cx + r * 0.18, cy * 0.84);

  // ── Nose
  ctx.strokeStyle = "#7a4e20";
  ctx.lineWidth = size * 0.018;
  ctx.beginPath();
  ctx.moveTo(cx, cy * 0.88);
  ctx.lineTo(cx - r * 0.06, cy * 1.0);
  ctx.lineTo(cx - r * 0.01, cy * 1.01);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy * 0.88);
  ctx.lineTo(cx + r * 0.06, cy * 1.0);
  ctx.lineTo(cx + r * 0.01, cy * 1.01);
  ctx.stroke();

  // ── Mouth (slight confident smile)
  ctx.strokeStyle = "#5a2d0c";
  ctx.lineWidth = size * 0.022;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.16, cy * 1.07);
  ctx.quadraticCurveTo(cx, cy * 1.13, cx + r * 0.16, cy * 1.07);
  ctx.stroke();

  // ── Neck
  const neckGrad = ctx.createLinearGradient(
    cx - r * 0.12,
    cy * 1.15,
    cx + r * 0.12,
    cy * 1.35,
  );
  neckGrad.addColorStop(0, "#a8722e");
  neckGrad.addColorStop(1, "#8b5e1f");
  ctx.beginPath();
  ctx.rect(cx - r * 0.12, cy * 1.14, r * 0.24, r * 0.2);
  ctx.fillStyle = neckGrad;
  ctx.fill();

  // ── Shirt collar (emerald green, professional)
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, r * 2);
  ctx.lineTo(cx - r * 0.3, cy * 1.25);
  ctx.lineTo(cx - r * 0.1, cy * 1.32);
  ctx.lineTo(cx, cy * 1.22);
  ctx.lineTo(cx + r * 0.1, cy * 1.32);
  ctx.lineTo(cx + r * 0.3, cy * 1.25);
  ctx.lineTo(cx + r * 0.5, r * 2);
  ctx.closePath();
  ctx.fillStyle = "#064420";
  ctx.fill();

  // ── Gold "DZ" badge on collar
  ctx.fillStyle = "#f0c040";
  ctx.font = `bold ${size * 0.1}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DZ", cx, cy * 1.42);
}

/**
 * Crops an image (data URL or URL) to a circular face region → Three.js CanvasTexture.
 * Falls back to the professional Admin Default Face if image src is empty/null/'default'.
 */
export function createFaceTexture(
  imageSrc: string | null | undefined,
  onReady: (texture: THREE.CanvasTexture) => void,
): void {
  // Admin default face — rendered when no photo provided
  function renderAdminFace() {
    const canvas = document.createElement("canvas");
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onReady(new THREE.CanvasTexture(canvas));
      return;
    }
    drawAdminFace(ctx, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    onReady(texture);
  }

  // Use admin face when no src, 'default', or empty string
  if (!imageSrc || imageSrc === "default") {
    renderAdminFace();
    return;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        renderAdminFace();
        return;
      }

      // Clip to circle
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw image centered — crop to square, slight top offset for face focus
      const aspect = img.width / img.height;
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;
      if (aspect > 1) {
        sw = img.height;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width;
        sy = Math.min(img.height * 0.05, img.height - sh);
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      onReady(texture);
    } catch {
      renderAdminFace();
    }
  };

  img.onerror = renderAdminFace;
  img.src = imageSrc;
}

/**
 * Creates a canvas texture for text (e.g. Hindi signboards).
 */
export function createTextTexture(
  text: string,
  opts: {
    width?: number;
    height?: number;
    bgColor?: string;
    textColor?: string;
    fontSize?: number;
    font?: string;
  } = {},
): THREE.CanvasTexture {
  const {
    width = 512,
    height = 128,
    bgColor = "rgba(10,40,20,0.95)",
    textColor = "#f0c040",
    fontSize = 48,
    font = "bold sans-serif",
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#f0c040";
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  ctx.fillStyle = textColor;
  ctx.font = `${fontSize}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#f0c040";
  ctx.shadowBlur = 12;
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a glowing "Digital Zindagi" logo texture for the building wall.
 */
export function createDZLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#050a08";
  ctx.fillRect(0, 0, 1024, 512);

  const text = "Digital Zindagi";
  ctx.font = "bold 120px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 4; i > 0; i--) {
    ctx.shadowColor = i % 2 === 0 ? "#ff6600" : "#00ff88";
    ctx.shadowBlur = i * 20;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,100,0,0.3)" : "rgba(0,200,100,0.3)";
    ctx.fillText(text, 512, 220);
  }

  ctx.shadowColor = "#00ff88";
  ctx.shadowBlur = 30;
  ctx.fillStyle = "#80ffcc";
  ctx.fillText(text, 512, 220);

  ctx.font = "80px sans-serif";
  ctx.shadowColor = "#ff6600";
  ctx.shadowBlur = 40;
  ctx.fillText("🔥", 180, 200);
  ctx.fillText("🔥", 844, 200);

  ctx.font = "bold 56px sans-serif";
  ctx.fillStyle = "#f0c040";
  ctx.shadowColor = "#f0c040";
  ctx.shadowBlur = 20;
  ctx.fillText("डिजिटल ज़िंदगी", 512, 380);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
