import { getResendClient } from "@/lib/alerts";

const FROM = "MyGradePal Security <alerts@mygradepal.com>";

export async function sendNewDeviceLoginEmail(params: {
  to: string;
  ip: string;
  userAgent: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[sessionSecurityEmail] Resend not configured; skipping new-device email");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mygradepal.com";
  const safeIp = params.ip || "Unknown";
  const safeUa = params.userAgent || "Unknown";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
      <h1 style="font-size:20px;margin:0 0 12px;"><span style="color:#0f766e;">MyGradePal</span> security</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        New login detected on your MyGradePal account.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:18px;font-size:14px;">
        <p style="margin:0 0 8px;"><strong>Approximate IP:</strong> ${escapeHtml(safeIp)}</p>
        <p style="margin:0;"><strong>Browser / device hint:</strong> ${escapeHtml(safeUa.slice(0, 200))}</p>
      </div>
      <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 16px;">
        If this was you, you can ignore this message. If you don&apos;t recognise this activity, change your password and contact support.
      </p>
      <a href="${appUrl}/account" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
        Open MyGradePal
      </a>
    </div>
  `;

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: "New login detected on your MyGradePal account",
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
