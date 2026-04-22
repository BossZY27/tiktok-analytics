// ============================================
// Metrics Chart Component
// แสดง Bar Chart ของ metrics รายวัน ด้วย Recharts
// ============================================

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ประเภทข้อมูล metric แต่ละวัน
interface MetricData {
  date: string;
  revenue: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  profileViews: number;
  followers: number;
}

interface MetricsChartProps {
  data: MetricData[];
  isLoading?: boolean;
}

// === Custom Tooltip สำหรับ hover ดูข้อมูล ===
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }} className="chart-tooltip-item">
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function MetricsChart({ data, isLoading = false }: MetricsChartProps) {
  if (isLoading) {
    return (
      <div className="chart-skeleton">
        <div className="chart-skeleton-bars">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="chart-skeleton-bar"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <p>📊 ยังไม่มีข้อมูลสำหรับบัญชีนี้</p>
      </div>
    );
  }

  // จัดรูปแบบวันที่ให้สั้นลง (เช่น 04/15)
  const formattedData = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("th-TH", {
      month: "2-digit",
      day: "2-digit",
    }),
  }));

  return (
    <div className="chart-container">
      {/* === Bar Chart: Views & Profile Views === */}
      <div className="chart-section">
        <h3 className="chart-title">📈 Views & Profile Views รายวัน</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={formattedData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
              }
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: "rgba(255, 255, 255, 0.08)" }} 
            />
            <Legend
              wrapperStyle={{ paddingTop: "12px" }}
              formatter={(value) => (
                <span style={{ color: "#e2e8f0", fontSize: "13px" }}>{value}</span>
              )}
            />
            <Bar
              dataKey="views"
              name="Views"
              fill="url(#viewsGradient)"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="profileViews"
              name="Profile Views"
              fill="url(#profileGradient)"
              radius={[6, 6, 0, 0]}
            />
            <defs>
              <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
              <linearGradient id="profileGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* === Bar Chart: Revenue === */}
      <div className="chart-section">
        <h3 className="chart-title">💰 Revenue รายวัน (บาท)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={formattedData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickFormatter={(v) => `฿${v.toLocaleString()}`}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: "rgba(255, 255, 255, 0.08)" }} 
            />
            <Bar
              dataKey="revenue"
              name="Revenue (฿)"
              fill="url(#revenueGradient)"
              radius={[6, 6, 0, 0]}
            />
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
