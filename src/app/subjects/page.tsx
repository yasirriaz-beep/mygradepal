"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const IGCSE_SUBJECTS = [
  { name: "Chemistry", code: "0620", emoji: "⚗️", questions: 60, hot: true },
  { name: "Physics", code: "0625", emoji: "⚡", questions: 18, hot: true },
  { name: "Mathematics", code: "0580", emoji: "📐", questions: 16, hot: true },
  { name: "Biology", code: "0610", emoji: "🧬", questions: 15, hot: false },
  { name: "English", code: "0510", emoji: "📝", questions: 6, hot: false },
  { name: "Pakistan Studies", code: "0448", emoji: "🗺️", questions: 6, hot: false },
  { name: "Islamiyat", code: "0493", emoji: "📖", questions: 5, hot: false },
  { name: "History", code: "0470", emoji: "🏛️", questions: 0, hot: false },
  { name: "Geography", code: "0460", emoji: "🌍", questions: 0, hot: false },
];

const teal = "#189080";
const orange = "#f5731e";

export default function SubjectSelectionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState("there");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: student } = await supabase
        .from("students")
        .select("onboarding_complete, name")
        .eq("id", user.id)
        .maybeSingle();

      if (student?.onboarding_complete) {
        router.push("/dashboard");
        return;
      }

      const name =
        user.user_metadata?.child_name ??
        user.user_metadata?.name ??
        student?.name ??
        "there";
      setStudentName(String(name));
      setChecking(false);
    };
    void init();
  }, [router]);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user) {
      await supabase.from("students").upsert(
        { id: user.id, email: user.email ?? "", onboarding_subject: selected },
        { onConflict: "id" },
      );
    }
    router.push("/onboarding");
  };

  if (checking)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid #e5e7eb",
            borderTop: `3px solid ${teal}`,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: teal, padding: "24px 20px 28px" }}>
        <p
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: "rgba(255,255,255,0.8)",
            margin: "0 0 6px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Step 1 of 4
        </p>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 700, color: "white", margin: "0 0 6px" }}>
          Hi {studentName}! 👋
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", margin: 0 }}>
          Which O Level / IGCSE subject do you want to start with?
        </p>
      </div>

      <div style={{ padding: "20px 16px 120px" }}>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          You can add more subjects later. Pick your most important one first.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {IGCSE_SUBJECTS.map((sub) => {
            const isSelected = selected === sub.name;
            const noContent = sub.questions === 0;
            return (
              <button
                key={sub.code}
                type="button"
                onClick={() => !noContent && setSelected(sub.name)}
                style={{
                  background: isSelected ? "#e8f8f4" : "white",
                  border: `2px solid ${isSelected ? teal : "#e5e7eb"}`,
                  borderRadius: 14,
                  padding: "14px 8px",
                  cursor: noContent ? "not-allowed" : "pointer",
                  opacity: noContent ? 0.45 : 1,
                  textAlign: "center",
                  position: "relative",
                  transition: "all 0.2s",
                }}
              >
                {sub.hot && (
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      background: orange,
                      color: "white",
                      fontSize: 9,
                      fontWeight: 700,
                      borderRadius: 20,
                      padding: "2px 6px",
                    }}
                  >
                    HOT
                  </div>
                )}
                {isSelected && <div style={{ position: "absolute", top: 6, left: 8, fontSize: 14 }}>✓</div>}
                <div style={{ fontSize: 28, marginBottom: 6 }}>{sub.emoji}</div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isSelected ? teal : "#0f172a",
                    margin: "0 0 2px",
                    lineHeight: 1.3,
                  }}
                >
                  {sub.name}
                </p>
                <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 4px" }}>{sub.code}</p>
                {noContent ? (
                  <p style={{ fontSize: 9, color: "#d1d5db", margin: 0 }}>Coming soon</p>
                ) : (
                  <p style={{ fontSize: 9, color: isSelected ? teal : "#9ca3af", fontWeight: 600, margin: 0 }}>
                    {sub.questions}+ questions
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: "12px 14px",
            marginTop: 20,
            border: "1px solid #e5e7eb",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>🎓</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 2px" }}>
              Built on Cambridge International Syllabus
            </p>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
              Every topic, question and study plan follows the official Cambridge O Level / IGCSE curriculum. SmartPredict
              is based on 15 years of past paper frequency analysis.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "white",
          borderTop: "1px solid #e5e7eb",
          padding: "14px 20px",
          display: "flex",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            router.push("/onboarding?skip=true");
          }}
          style={{
            flex: 1,
            padding: "13px",
            borderRadius: 12,
            background: "white",
            border: "1.5px solid #e5e7eb",
            color: "#6b7280",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Explore freely
        </button>
        <button
          type="button"
          onClick={() => void handleContinue()}
          disabled={!selected || loading}
          style={{
            flex: 2,
            padding: "13px",
            borderRadius: 12,
            background: selected ? teal : "#e5e7eb",
            color: selected ? "white" : "#9ca3af",
            fontSize: 14,
            fontWeight: 700,
            border: "none",
            cursor: selected ? "pointer" : "default",
            fontFamily: "'Sora', sans-serif",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Saving..." : selected ? `Start with ${selected} →` : "Choose a subject"}
        </button>
      </div>
    </div>
  );
}
