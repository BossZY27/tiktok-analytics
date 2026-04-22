// ============================================
// Main Dashboard Page
// หน้าหลักแสดง: Account Selector + Summary Cards + Bar Charts + AI
// ============================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AccountSelector } from "@/components/account-selector";
import { MetricsChart } from "@/components/metrics-chart";
import { AiInsights } from "@/components/ai-insights";
import { SyncCenter } from "@/components/sync-center";
import {
  TrendingUp,
  Eye,
  Heart,
  DollarSign,
  MessageCircle,
  Share2,
  LogOut,
  LayoutDashboard,
  User,
} from "lucide-react";

// === Types ===
interface TikTokAccount {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  lastSyncAt: string | Date | null;
  syncStatus: string | null;
  lastSyncRows: number | null;
}

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

interface MetricsSummary {
  totalRevenue: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalProfileViews: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // === State ===
  const [accounts, setAccounts] = useState<TikTokAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [accountHandle, setAccountHandle] = useState<string>("");
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // === Date Range State ===
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // === Redirect ถ้ายังไม่ login ===
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // === ดึงรายชื่อบัญชี TikTok ===
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAccounts(data);
        // เลือกบัญชีแรกเป็น default หากยังไม่มีการเลือก
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id);
        }
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAccounts();
    }
  }, [status, fetchAccounts]);

  // === ดึง Metrics เมื่อเปลี่ยนบัญชี หรือ เปลี่ยนวันที่ ===
  const fetchMetrics = useCallback(async (accountId: string, start: string, end: string) => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetch(`/api/metrics/${accountId}?startDate=${start}&endDate=${end}`);
      const data = await res.json();

      setMetrics(data.metrics || []);
      setSummary(data.summary || null);
      setAccountHandle(data.account?.handle || "");
    } catch (error) {
      console.error("Error fetching metrics:", error);
      setMetrics([]);
      setSummary(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAccountId && startDate && endDate) {
      fetchMetrics(selectedAccountId, startDate, endDate);
    }
  }, [selectedAccountId, startDate, endDate, fetchMetrics]);

  // ฟังก์ชันรีเฟรชข้อมูลทั้งหมด (เรียกใช้หลังนำเข้าไฟล์)
  const refreshAll = useCallback(() => {
    fetchAccounts();
    if (selectedAccountId) {
      fetchMetrics(selectedAccountId, startDate, endDate);
    }
  }, [fetchAccounts, fetchMetrics, selectedAccountId, startDate, endDate]);

  // === Loading State ===
  if (status === "loading") {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  // === Summary Cards Data ===
  const summaryCards = [
    {
      label: "รายได้รวม",
      value: summary ? `฿${summary.totalRevenue.toLocaleString()}` : "—",
      icon: DollarSign,
      color: "emerald",
    },
    {
      label: "ยอดวิวรวม",
      value: summary ? summary.totalViews.toLocaleString() : "—",
      icon: Eye,
      color: "indigo",
    },
    {
      label: "ยอดไลค์รวม",
      value: summary ? summary.totalLikes.toLocaleString() : "—",
      icon: Heart,
      color: "pink",
    },
    {
      label: "คอมเมนต์รวม",
      value: summary ? summary.totalComments.toLocaleString() : "—",
      icon: MessageCircle,
      color: "amber",
    },
    {
      label: "ยอดแชร์รวม",
      value: summary ? summary.totalShares.toLocaleString() : "—",
      icon: Share2,
      color: "cyan",
    },
  ];

  return (
    <div className="dashboard-layout">
      {/* === Sidebar === */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <TrendingUp size={28} />
          <span>TikTok Analytics</span>
        </div>

        {/* Account Selector */}
        <div className="sidebar-section">
          {Array.isArray(accounts) && (
            <AccountSelector
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelect={setSelectedAccountId}
              onRefresh={refreshAll}
              isLoading={isLoadingAccounts}
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <a href="/dashboard" className="sidebar-nav-item active">
            <LayoutDashboard size={18} />
            Dashboard
          </a>
        </nav>

        {/* User Info + Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{session?.user?.name || "User"}</p>
              <p className="sidebar-user-email">{session?.user?.email}</p>
              <span className="sidebar-user-role">
                {(session?.user as { role?: string })?.role || "VIEWER"}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sidebar-logout"
          >
            <LogOut size={18} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* === Main Content === */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 className="dashboard-title">
              📊 ระบบวิเคราะห์ข้อมูล TikTok
              {accountHandle && (
                <span className="dashboard-account-badge">{accountHandle}</span>
              )}
            </h1>
            <p className="dashboard-subtitle">
              ข้อมูลระหว่าง {new Date(startDate).toLocaleDateString("th-TH")} ถึง{" "}
              {new Date(endDate).toLocaleDateString("th-TH")}
            </p>
          </div>
          
          <div className="date-picker-group">
            <div className="date-picker-item">
              <label>เริ่มต้น</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="date-input"
              />
            </div>
            <div className="date-picker-item">
              <label>ถึง</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="date-input"
              />
            </div>
          </div>
        </header>

        {/* Sync Center Area */}
        <section className="dashboard-sync-center">
          {(() => {
            const selectedAccount = Array.isArray(accounts) ? accounts.find(a => a.id === selectedAccountId) : null;
            return (
              <SyncCenter 
                accountId={selectedAccountId}
                accountHandle={selectedAccount?.handle || null}
                lastSyncAt={selectedAccount?.lastSyncAt || null}
                syncStatus={selectedAccount?.syncStatus || null}
                lastSyncRows={selectedAccount?.lastSyncRows || null}
                isLoading={isLoadingMetrics}
              />
            );
          })()}
        </section>

        {/* Summary Cards */}
        <section className="summary-cards">
          {summaryCards.map((card) => (
            <div key={card.label} className={`summary-card summary-card-${card.color}`}>
              <div className="summary-card-icon-wrapper">
                <card.icon size={22} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-label">{card.label}</p>
                <p className="summary-card-value">
                  {isLoadingMetrics ? (
                    <span className="summary-card-skeleton" />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
            </div>
          ))}
          {/* ข้อมูล Profile Views ใหม่ */}
          <div className="summary-card summary-card-slate">
            <div className="summary-card-icon-wrapper">
              <User size={22} />
            </div>
            <div className="summary-card-content">
              <p className="summary-card-label">การเข้าชมโปรไฟล์</p>
              <p className="summary-card-value">
                {isLoadingMetrics ? (
                  <span className="summary-card-skeleton" />
                ) : summary ? summary.totalProfileViews.toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="dashboard-charts">
          <MetricsChart data={metrics} isLoading={isLoadingMetrics} />
        </section>

        {/* AI Analysis */}
        <section className="dashboard-ai">
          <AiInsights
            accountHandle={accountHandle}
            summary={summary}
            metrics={metrics}
          />
        </section>
      </main>
    </div>
  );
}
