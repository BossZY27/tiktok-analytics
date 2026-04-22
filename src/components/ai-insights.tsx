// ============================================
// AI Insights Component
// แสดงปุ่มวิเคราะห์ AI และผลลัพธ์
// ============================================

"use client";

import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";

interface AiInsightsProps {
  accountHandle: string;
  summary: {
    totalRevenue: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
  } | null;
  metrics: Array<{
    date: string;
    revenue: number;
    views: number;
    likes: number;
  }>;
}

export function AiInsights({
  accountHandle,
  summary,
  metrics,
}: AiInsightsProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === เรียก AI วิเคราะห์ ===
  const handleAnalyze = async () => {
    if (!summary || metrics.length === 0) {
      setError("ไม่มีข้อมูลสำหรับวิเคราะห์");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountHandle, summary, metrics }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      setAnalysis(data.analysis);
      setIsDemo(data.isDemo || false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ไม่สามารถวิเคราะห์ได้"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-insights-container">
      {/* === Header + Button === */}
      <div className="ai-insights-header">
        <div className="ai-insights-title-row">
          <Sparkles className="ai-insights-icon" size={22} />
          <h3 className="ai-insights-title">AI Analysis</h3>
          {isDemo && <span className="ai-badge-demo">Demo</span>}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !summary}
          className="ai-analyze-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              กำลังวิเคราะห์...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              วิเคราะห์ด้วย AI
            </>
          )}
        </button>
      </div>

      {/* === Error === */}
      {error && (
        <div className="ai-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* === Analysis Result === */}
      {analysis && (
        <div className="ai-result">
          <div className="ai-result-content">
            {analysis.split("\n").map((line, i) => {
              if (line.startsWith("# ")) {
                return (
                  <h2 key={i} className="ai-result-h2">
                    {line.replace("# ", "")}
                  </h2>
                );
              }
              if (line.startsWith("## ")) {
                return (
                  <h3 key={i} className="ai-result-h3">
                    {line.replace("## ", "")}
                  </h3>
                );
              }
              if (line.startsWith("- ") || line.startsWith("* ")) {
                return (
                  <li key={i} className="ai-result-li">
                    {line.replace(/^[-*] /, "")}
                  </li>
                );
              }
              if (line.match(/^\d+\./)) {
                return (
                  <li key={i} className="ai-result-li ai-result-li-numbered">
                    {line}
                  </li>
                );
              }
              if (line.startsWith("> ")) {
                return (
                  <blockquote key={i} className="ai-result-blockquote">
                    {line.replace("> ", "")}
                  </blockquote>
                );
              }
              if (line.trim() === "") return <br key={i} />;
              // Bold text
              const boldLine = line.replace(
                /\*\*(.*?)\*\*/g,
                '<strong>$1</strong>'
              );
              return (
                <p
                  key={i}
                  className="ai-result-p"
                  dangerouslySetInnerHTML={{ __html: boldLine }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* === Placeholder เมื่อยังไม่ได้วิเคราะห์ === */}
      {!analysis && !isLoading && !error && (
        <div className="ai-placeholder">
          <Sparkles className="ai-placeholder-icon" size={40} />
          <p>กดปุ่ม &quot;วิเคราะห์ด้วย AI&quot; เพื่อรับคำแนะนำ</p>
          <p className="ai-placeholder-sub">
            AI จะวิเคราะห์ข้อมูล metrics ของบัญชีที่เลือก
            และให้คำแนะนำเชิงกลยุทธ์
          </p>
        </div>
      )}
    </div>
  );
}
