"use client";

interface Section {
  definition?: string;
  keyPoints?: string[];
  formulas?: { formula: string; variables?: string }[];
  example?: { question: string; steps: string[]; answer: string; takeaway?: string };
  examTip?: string;
  quickCheck?: string;
}

interface LearnContentProps {
  text: string;
  topic: string;
}

export default function LearnContent({ text, topic }: LearnContentProps) {
  const s = parse(text);

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.7, color: "#1a1a1a" }}
      className="mx-auto max-w-2xl space-y-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          style={{
            background: "#189080",
            color: "white",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 20,
            fontFamily: "'Sora', sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          📚 {topic}
        </span>
      </div>

      {s.definition && (
        <div
          style={{
            background: "#E8F8F4",
            borderLeft: "4px solid #189080",
            borderRadius: "0 12px 12px 0",
            padding: "14px 18px",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#0a5c4a",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 6,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            🧩 What is it?
          </p>
          <p style={{ color: "#0F5C45", margin: 0 }}>{s.definition}</p>
        </div>
      )}

      {s.keyPoints && s.keyPoints.length > 0 && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#189080",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            ✅ Key Points
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {s.keyPoints.map((pt, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    background: "#E8F8F4",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#189080",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.formulas && s.formulas.length > 0 && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#189080",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            🔢 Formula
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {s.formulas.map((f, i) => (
              <div key={i}>
                <div
                  style={{
                    background: "#F0FBF8",
                    border: "1px solid #b2dfdb",
                    borderRadius: 8,
                    padding: "12px 16px",
                    fontFamily: "monospace",
                    fontSize: 15,
                    textAlign: "center",
                    color: "#0a5c4a",
                    fontWeight: 600,
                  }}
                >
                  {f.formula}
                </div>
                {f.variables && <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6, paddingLeft: 4 }}>{f.variables}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {s.example && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#189080",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            ✏️ Worked Example
          </p>
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 14px", marginBottom: 14, fontSize: 14, color: "#374151" }}>
            <span style={{ fontWeight: 600, color: "#189080" }}>Q: </span>
            {s.example.question}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {s.example.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span
                  style={{
                    background: "#189080",
                    color: "white",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 14, color: "#374151" }}>{step}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              background: "#E8F8F4",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 600,
              color: "#0a5c4a",
            }}
          >
            ✓ Answer: {s.example.answer}
          </div>
          {s.example.takeaway && (
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 10, fontStyle: "italic" }}>💡 {s.example.takeaway}</p>
          )}
        </div>
      )}

      {s.examTip && (
        <div
          style={{
            background: "#FFF8F0",
            border: "1px solid rgba(245,115,30,0.25)",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>★</span>
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#c45a0a",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Exam Tip
            </p>
            <p style={{ color: "#7c3a0a", margin: 0, fontSize: 14 }}>{s.examTip}</p>
          </div>
        </div>
      )}

      {s.quickCheck && (
        <div style={{ background: "#F5F3FF", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: "14px 18px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#7c3aed",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 6,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            ? Quick Check
          </p>
          <p style={{ color: "#4c1d95", margin: 0, fontSize: 14 }}>{s.quickCheck}</p>
        </div>
      )}

      {!s.definition && !s.keyPoints?.length && <p style={{ lineHeight: 1.8, color: "#374151" }}>{text}</p>}
    </div>
  );
}

function parse(raw: string): Section {
  const text = raw.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`{1,3}/g, "").trim();
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  const result: {
    definition?: string;
    keyPoints: string[];
    formulas: { formula: string; variables?: string }[];
    example?: { question: string; steps: string[]; answer: string; takeaway?: string };
    examTip?: string;
    quickCheck?: string;
  } = { keyPoints: [], formulas: [] };

  let section = "";
  let currentFormula = "";
  const exampleSteps: string[] = [];
  let exampleQuestion = "";
  let exampleAnswer = "";
  let exampleTakeaway = "";

  for (const line of lines) {
    const up = line.toUpperCase();

    if (up.startsWith("DEFINITION:")) {
      section = "definition";
      const val = line.slice(line.indexOf(":") + 1).trim();
      if (val) result.definition = val;
    } else if (up.startsWith("KEY POINTS:") || up.startsWith("KEY POINT:")) {
      section = "keyPoints";
    } else if (up.startsWith("FORMULA:") || up.startsWith("FORMULAS:")) {
      section = "formula";
      const val = line.slice(line.indexOf(":") + 1).trim();
      if (val) currentFormula = val;
    } else if (up.startsWith("VARIABLES:")) {
      const val = line.slice(line.indexOf(":") + 1).trim();
      if (currentFormula) {
        result.formulas.push({ formula: currentFormula, variables: val });
        currentFormula = "";
      }
    } else if (up.startsWith("WORKED EXAMPLE:") || up.startsWith("EXAMPLE:")) {
      section = "example";
    } else if (up.startsWith("QUESTION:")) {
      exampleQuestion = line.slice(line.indexOf(":") + 1).trim();
    } else if (up.startsWith("STEP ")) {
      exampleSteps.push(line.slice(line.indexOf(":") + 1).trim());
    } else if (up.startsWith("ANSWER:")) {
      exampleAnswer = line.slice(line.indexOf(":") + 1).trim();
    } else if (up.startsWith("TAKEAWAY:")) {
      exampleTakeaway = line.slice(line.indexOf(":") + 1).trim();
    } else if (up.startsWith("EXAM TIP:") || up.startsWith("REMEMBER:")) {
      section = "examTip";
      const val = line.slice(line.indexOf(":") + 1).trim();
      if (val) result.examTip = val;
    } else if (up.startsWith("QUICK CHECK:")) {
      section = "quickCheck";
      const val = line.slice(line.indexOf(":") + 1).trim();
      if (val) result.quickCheck = val;
    } else {
      if (section === "definition" && !result.definition) result.definition = line;
      else if (section === "keyPoints") {
        const pt = line.replace(/^[-•]\s*/, "").trim();
        if (pt) result.keyPoints.push(pt);
      } else if (section === "formula" && !currentFormula) {
        currentFormula = line;
        result.formulas.push({ formula: currentFormula });
        currentFormula = "";
      } else if (section === "examTip" && !result.examTip) result.examTip = line;
      else if (section === "quickCheck" && !result.quickCheck) result.quickCheck = line;
    }
  }

  if (exampleQuestion || exampleSteps.length > 0) {
    result.example = {
      question: exampleQuestion,
      steps: exampleSteps,
      answer: exampleAnswer,
      takeaway: exampleTakeaway || undefined,
    };
  }

  return result;
}
