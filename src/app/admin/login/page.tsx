"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TEAL = "#189080";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json() as { success?: boolean; error?: string };
    if (data.success) {
      router.push("/admin");
    } else {
      setError("Incorrect password");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "white", borderRadius: 20, padding: "40px 32px", width: "100%", maxWidth: 400, border: "1px solid #e5e7eb", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 700, color: "#0f172a", margin: "0 0 4px", textAlign: "center" }}>
          MyGradePal
        </p>
        <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", margin: "0 0 28px" }}>
          Admin Panel — Authorised Access Only
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
            Admin Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
            placeholder="Enter admin password"
            style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${error ? "#fecaca" : "#e5e7eb"}`, fontSize: 14, boxSizing: "border-box", outline: "none" }}
          />
          {error && <p style={{ fontSize: 12, color: "#dc2626", margin: "6px 0 0" }}>{error}</p>}
        </div>

        <button
          onClick={() => void handleLogin()}
          disabled={!password || loading}
          style={{ width: "100%", padding: "13px", borderRadius: 12, background: password && !loading ? TEAL : "#e5e7eb", color: password && !loading ? "white" : "#9ca3af", fontSize: 14, fontWeight: 700, border: "none", cursor: password && !loading ? "pointer" : "default", fontFamily: "'Sora', sans-serif" }}
        >
          {loading ? "Verifying..." : "Login →"}
        </button>
      </div>
    </div>
  );
}
