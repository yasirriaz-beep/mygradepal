/**
 * Stable-ish client fingerprint (not cryptographically strong; deters casual sharing).
 * Used with server-side IP + user-agent for session binding.
 */
export async function computeDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";

  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(new Date().getTimezoneOffset()),
    "hwc:" + (navigator.hardwareConcurrency ?? ""),
  ];

  const raw = parts.join("|");
  const enc = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `v1_${hex}`;
}
