export const EVIDENCE_BUCKET = "offer-verification-evidence";
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;

export type AllowedEvidenceMime = keyof typeof MIME_EXTENSIONS;

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

export async function validateEvidenceFile(file: File) {
  if (file.size === 0) return { error: "Choose a non-empty evidence file." } as const;
  if (file.size > MAX_EVIDENCE_BYTES) {
    return { error: "Evidence must be 5 MB or smaller." } as const;
  }

  if (!(file.type in MIME_EXTENSIONS)) {
    return { error: "Use a PNG, JPEG, WebP, or PDF file." } as const;
  }

  const mime = file.type as AllowedEvidenceMime;
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signatureMatches =
    (mime === "image/png" && hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47])) ||
    (mime === "image/jpeg" && hasPrefix(bytes, [0xff, 0xd8, 0xff])) ||
    (mime === "image/webp" &&
      hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") ||
    (mime === "application/pdf" && hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46]));

  if (!signatureMatches) {
    return { error: "The file contents do not match the selected file type." } as const;
  }

  return { mime, extension: MIME_EXTENSIONS[mime] } as const;
}
