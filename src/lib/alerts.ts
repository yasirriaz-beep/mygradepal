import { getSupabaseServiceClient } from "@/lib/supabase";
import { buildWeeklyReport } from "@/lib/weeklyReport";
import { Resend } from "resend";

type AlertType = "absence" | "streak_broken" | "weekly_report";
type DeliveryMethod = "email" | "whatsapp";
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "MyGradePal Alerts <alerts@mygradepal.com>";

function buildBaseEmailTemplate(title: string, intro: string, detailsHtml: string, primaryButtonText: string, primaryButtonLink: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
      <div style="margin-bottom:20px;">
        <h1 style="margin:0;font-size:22px;line-height:1.2;">
          <span style="color:#0f766e;">My</span><span style="color:#111827;">Grade</span><span style="color:#f97316;">Pal</span>
        </h1>
      </div>
      <h2 style="font-size:20px;margin:0 0 12px;">${title}</h2>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${intro}</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:18px;">
        ${detailsHtml}
      </div>
      <a href="${primaryButtonLink}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;margin-right:8px;">
        ${primaryButtonText}
      </a>
      <p style="margin-top:22px;font-size:12px;color:#64748b;">
        You're receiving this because you're listed as a parent on MyGradePal.
      </p>
    </div>
  `;
}

export async function sendAbsenceAlert(userId: string, missedDate: string, sessionType: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("parent_email, student_name")
    .eq("user_id", userId)
    .maybeSingle();

  const parentEmail = String((profile as { parent_email?: string } | null)?.parent_email ?? "").trim();
  const studentName = String((profile as { student_name?: string } | null)?.student_name ?? "Student").trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mygradepal.com";
  const dashboardLink = `${appUrl}/dashboard`;
  const reportLink = `${appUrl}/report/${userId}/this-week`;
  const message = `Your child ${studentName} did not log in to MyGradePal today. Their scheduled ${sessionType} session was missed. Login to view their progress: ${dashboardLink}`;

  const { data: alertRow, error: insertError } = await supabase
    .from("user_alerts")
    .insert({
    user_id: userId,
    alert_type: "absence" as AlertType,
    message,
    sent_at: new Date().toISOString(),
    delivery_method: "email" as DeliveryMethod,
    delivered: false,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    throw new Error(`Failed to log absence alert: ${insertError.message}`);
  }

  if (!parentEmail) {
    return;
  }

  const html = buildBaseEmailTemplate(
    `${studentName} missed their study session today`,
    `Hi, this is a reminder that ${studentName} did not complete their scheduled Chemistry session today.`,
    `
      <p style="margin:0 0 6px;font-size:14px;"><strong>Date:</strong> ${missedDate}</p>
      <p style="margin:0;font-size:14px;"><strong>Session:</strong> ${sessionType}</p>
      <a href="${reportLink}" style="display:inline-block;margin-top:12px;color:#0f766e;font-size:14px;font-weight:600;text-decoration:none;">
        View full progress report
      </a>
    `,
    "View progress",
    dashboardLink,
  );

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: parentEmail,
      subject: `${studentName} missed their study session today`,
      html,
    });

    if (alertRow?.id) {
      await supabase.from("user_alerts").update({ delivered: true }).eq("id", alertRow.id);
    }
  } catch (error) {
    console.error("[alerts] absence email send failed", error);
    if (alertRow?.id) {
      await supabase.from("user_alerts").update({ delivered: false }).eq("id", alertRow.id);
    }
  }
}

export async function sendWeeklyReport(userId: string): Promise<void> {
  const now = new Date();
  if (now.getDay() !== 0) {
    return;
  }

  const supabase = getSupabaseServiceClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("parent_email, student_name")
    .eq("user_id", userId)
    .maybeSingle();

  const parentEmail = String((profile as { parent_email?: string } | null)?.parent_email ?? "").trim();
  const studentName = String((profile as { student_name?: string } | null)?.student_name ?? "Student").trim();
  const report = await buildWeeklyReport(userId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mygradepal.com";
  const reportLink = `${appUrl}/report/${userId}/${report.week}`;
  const dashboardLink = `${appUrl}/dashboard`;
  const message = `${studentName}'s weekly MyGradePal report is ready. Sessions completed: ${report.sessions_completed}, questions attempted: ${report.questions_attempted}, streak: ${report.current_streak}.`;

  const { data: alertRow } = await supabase
    .from("user_alerts")
    .insert({
      user_id: userId,
      alert_type: "weekly_report" as AlertType,
      message,
      sent_at: new Date().toISOString(),
      delivery_method: "email" as DeliveryMethod,
      delivered: false,
    })
    .select("id")
    .maybeSingle();

  if (!parentEmail) {
    return;
  }

  const html = buildBaseEmailTemplate(
    `${studentName}'s weekly MyGradePal report`,
    `Here is your weekly summary for ${studentName}.`,
    `
      <p style="margin:0 0 6px;font-size:14px;"><strong>Sessions completed:</strong> ${report.sessions_completed}</p>
      <p style="margin:0 0 6px;font-size:14px;"><strong>Questions attempted:</strong> ${report.questions_attempted}</p>
      <p style="margin:0;font-size:14px;"><strong>Current streak:</strong> ${report.current_streak} days</p>
      <a href="${reportLink}" style="display:inline-block;margin-top:12px;color:#0f766e;font-size:14px;font-weight:600;text-decoration:none;">
        View full progress report
      </a>
    `,
    "Open dashboard",
    dashboardLink,
  );

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: parentEmail,
      subject: `${studentName}'s weekly MyGradePal report`,
      html,
    });

    if (alertRow?.id) {
      await supabase.from("user_alerts").update({ delivered: true }).eq("id", alertRow.id);
    }
  } catch (error) {
    console.error("[alerts] weekly report send failed", error);
    if (alertRow?.id) {
      await supabase.from("user_alerts").update({ delivered: false }).eq("id", alertRow.id);
    }
  }
}
