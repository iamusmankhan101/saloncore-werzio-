"use client";

import type { SeoAnalysis, SeoCheck } from "@/lib/seo-analyzer";
import { CheckCircle2, AlertTriangle, XCircle, Target, FileText, Search } from "lucide-react";

const GRADE_META: Record<SeoAnalysis["grade"], { label: string; color: string; bg: string }> = {
  good: { label: "Good SEO", color: "#059669", bg: "#ecfdf5" },
  ok:   { label: "Needs improvement", color: "#d97706", bg: "#fffbeb" },
  bad:  { label: "Poor", color: "#dc2626", bg: "#fef2f2" },
};

const GROUP_LABEL: Record<SeoCheck["group"], { label: string; icon: React.ReactNode }> = {
  keyphrase: { label: "Keyphrase", icon: <Target size={13} /> },
  content:   { label: "Content & readability", icon: <FileText size={13} /> },
  meta:      { label: "Meta data", icon: <Search size={13} /> },
};

function ScoreRing({ analysis }: { analysis: SeoAnalysis }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = analysis.score;
  const color = analysis.grade === "good" ? "#059669" : analysis.grade === "ok" ? "#d97706" : "#dc2626";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="108" height="108" viewBox="0 0 108 108" style={{ flexShrink: 0 }}>
        <circle cx="54" cy="54" r={r} fill="none" stroke="#f0f0f8" strokeWidth="10" />
        <circle
          cx="54" cy="54" r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          transform="rotate(-90 54 54)"
          style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.3s ease" }}
        />
        <text x="54" y="52" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 26, fontWeight: 800, fill: "#1a1a2e" }}>
          {pct}
        </text>
        <text x="54" y="72" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 700, fill: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          score
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          SEO Analysis
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>
          {GRADE_META[analysis.grade].label}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#6b6b8a" }}>
          {analysis.wordCount.toLocaleString()} words
        </div>
        {analysis.focusKeyword ? (
          <div style={{ marginTop: 6, fontSize: 12, color: "#6b6b8a" }}>
            Focus keyphrase:{" "}
            <strong style={{ color: "#6b46c1" }}>{analysis.focusKeyword}</strong>
          </div>
        ) : (
          <div style={{ marginTop: 6, fontSize: 12, color: "#b45309", fontWeight: 700 }}>
            Set a focus keyphrase in Keywords
          </div>
        )}
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: SeoCheck }) {
  const icon =
    check.status === "pass" ? (
      <CheckCircle2 size={15} color="#059669" />
    ) : check.status === "warn" ? (
      <AlertTriangle size={15} color="#d97706" />
    ) : (
      <XCircle size={15} color="#dc2626" />
    );

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 0", borderBottom: "1px solid #f7f7fc" }}>
      <div style={{ marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a2e" }}>{check.label}</div>
        <div style={{ fontSize: 11.5, color: "#9898b0", marginTop: 1, lineHeight: 1.5 }}>{check.hint}</div>
      </div>
    </div>
  );
}

export default function SeoAnalyzer({ analysis }: { analysis: SeoAnalysis }) {
  const groups: SeoCheck["group"][] = ["keyphrase", "content", "meta"];

  return (
    <div style={{ border: "1px solid #e3e0eb", borderRadius: 12, padding: 18, background: "#fff" }}>
      <ScoreRing analysis={analysis} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {groups.map((g) => (
          <div key={g}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#6b46c1", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              {GROUP_LABEL[g].icon}
              {GROUP_LABEL[g].label}
            </div>
            {analysis.checks
              .filter((c) => c.group === g)
              .map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
