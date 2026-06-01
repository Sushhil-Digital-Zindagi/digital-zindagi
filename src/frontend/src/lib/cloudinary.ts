/**
 * Cloudinary upload utility for Digital Zindagi.
 * API Secret is NEVER used here — it lives only in the canister backend.
 * All uploads use unsigned upload with the "digital_zindagi" preset.
 */

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
}

/**
 * Upload a File or Blob to Cloudinary using an unsigned upload preset.
 * Returns the secure_url of the uploaded asset.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  config: CloudinaryConfig,
  options?: { folder?: string },
): Promise<string> {
  const { cloudName } = config;
  const folder = options?.folder ?? "digital-zindagi";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "digital_zindagi");
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Cloudinary upload failed: ${errText}`);
  }

  const result = (await response.json()) as {
    secure_url?: string;
    error?: { message: string };
  };

  if (result.error?.message) {
    throw new Error(`Cloudinary error: ${result.error.message}`);
  }

  if (!result.secure_url) {
    throw new Error("Image upload failed. Please try again.");
  }

  return result.secure_url;
}

/**
 * Build a Cloudinary delivery URL with optional transformations.
 * Default: q_auto,f_auto,c_fill,w_400,h_400
 */
export function getCloudinaryUrl(
  publicId: string,
  cloudName: string,
  transforms = "q_auto,f_auto,c_fill,w_400,h_400",
): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;
}
