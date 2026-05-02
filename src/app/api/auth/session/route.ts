import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sendNewDeviceLoginEmail } from "@/lib/sessionSecurityEmail";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MAX_ACTIVE_DEVICES = 2;

const MAX_DEVICE_MSG =
  "Maximum devices reached. Please log out from another device first.";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.slice(0, 128);
  return "";
}

function normalizeFingerprint(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!/^v1_[a-f0-9]{64}$/.test(s)) return null;
  return s;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { deviceFingerprint?: unknown } | null;
    const deviceFingerprint = normalizeFingerprint(body?.deviceFingerprint);
    if (!deviceFingerprint) {
      return NextResponse.json({ error: "Invalid device fingerprint." }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              /* Server Component / read-only cookie store */
            }
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const ip = clientIp(request);
    const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 512);

    const svc = getSupabaseServiceClient();

    const { data: existing, error: findError } = await svc
      .from("user_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("device_fingerprint", deviceFingerprint)
      .maybeSingle();

    if (findError) {
      console.error("[auth/session] lookup failed", findError.message);
      return NextResponse.json({ error: "Session service unavailable." }, { status: 503 });
    }

    if (existing?.id) {
      const { error: upErr } = await svc
        .from("user_sessions")
        .update({
          last_active: new Date().toISOString(),
          ip_address: ip || null,
          user_agent: userAgent || null,
        })
        .eq("id", existing.id);

      if (upErr) {
        console.error("[auth/session] update last_active failed", upErr.message);
      }
      return NextResponse.json({ ok: true, deviceKnown: true });
    }

    const { data: fpRows, error: listError } = await svc
      .from("user_sessions")
      .select("device_fingerprint")
      .eq("user_id", user.id);

    if (listError) {
      console.error("[auth/session] list fingerprints failed", listError.message);
      return NextResponse.json({ error: "Session service unavailable." }, { status: 503 });
    }

    const distinct = new Set(
      (fpRows ?? []).map((r: { device_fingerprint: string }) => r.device_fingerprint).filter(Boolean),
    );

    if (distinct.size >= MAX_ACTIVE_DEVICES) {
      return NextResponse.json({ error: MAX_DEVICE_MSG, code: "MAX_DEVICES" }, { status: 403 });
    }

    const { error: insError } = await svc.from("user_sessions").insert({
      user_id: user.id,
      device_fingerprint: deviceFingerprint,
      ip_address: ip || null,
      user_agent: userAgent || null,
    });

    if (insError) {
      if (insError.code === "23505" || insError.message.includes("duplicate")) {
        return NextResponse.json({ ok: true, deviceKnown: true });
      }
      console.error("[auth/session] insert failed", insError.message);
      return NextResponse.json({ error: "Could not register device." }, { status: 500 });
    }

    const shouldNotifyNewDevice = distinct.size >= 1;
    const email = user.email?.trim();
    if (shouldNotifyNewDevice && email) {
      void sendNewDeviceLoginEmail({ to: email, ip, userAgent }).catch((e) =>
        console.error("[auth/session] new device email failed", e),
      );
    }

    return NextResponse.json({ ok: true, deviceKnown: false });
  } catch (e) {
    console.error("[auth/session] unexpected", e);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
