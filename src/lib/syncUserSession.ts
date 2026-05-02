import { computeDeviceFingerprint } from "@/lib/deviceFingerprint";
import { supabase } from "@/lib/supabase";

export type SyncSessionResult =
  | { ok: true }
  | { ok: false; maxDevices: true; error: string };

const MAX_DEVICE_MSG =
  "Maximum devices reached. Please log out from another device first.";

/**
 * Registers or refreshes this browser as an allowed device (max 2 per account).
 * Call after login and on app load when a session exists.
 */
export async function syncUserSessionDevice(): Promise<SyncSessionResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: true };

  const deviceFingerprint = await computeDeviceFingerprint();
  if (!deviceFingerprint || !/^v1_[a-f0-9]{64}$/.test(deviceFingerprint)) {
    return { ok: true };
  }

  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceFingerprint }),
    });

    if (res.status === 403) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return {
        ok: false,
        maxDevices: true,
        error: typeof body?.error === "string" ? body.error : MAX_DEVICE_MSG,
      };
    }

    if (!res.ok) {
      console.warn("[syncUserSession] session API returned", res.status);
    }
  } catch (e) {
    console.warn("[syncUserSession] request failed", e);
  }

  return { ok: true };
}

export { MAX_DEVICE_MSG };
