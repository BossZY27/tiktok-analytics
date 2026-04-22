"use client";

import React from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Database } from "lucide-react";

interface SyncCenterProps {
  accountId: string | null;
  accountHandle: string | null;
  lastSyncAt: string | Date | null;
  syncStatus: string | null;
  lastSyncRows: number | null;
  isLoading?: boolean;
}

export const SyncCenter: React.FC<SyncCenterProps> = ({
  accountId,
  accountHandle,
  lastSyncAt,
  syncStatus,
  lastSyncRows,
  isLoading = false,
}) => {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [showDecision, setShowDecision] = React.useState(false);

  // ฟังก์ชันช่วยจัดรูปแบบวันที่
  const formatDate = (date: string | Date | null) => {
    if (!date) return "ยังไม่มีข้อมูล";
    const d = new Date(date);
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const handleSyncRequest = () => {
    if (!accountId) {
      alert("กรุณาเลือกบัญชีที่ต้องการ Sync ก่อนครับ");
      return;
    }
    setShowDecision(true);
  };

  const executeSync = async (mode: 'EXISTING' | 'NEW') => {
    setShowDecision(false);
    setIsSyncing(true);
    
    try {
      const res = await fetch("/api/accounts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          accountId: mode === 'EXISTING' ? accountId : 'NEW',
          mode 
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
      } else {
        // โชว์ Error ให้ละเอียดขึ้นเพื่อให้บอสและผมช่วยกันดูได้ครับ
        alert(`❌ เกิดข้อผิดพลาด:\n${data.error}\n\nรายละเอียด: ${data.details || 'ไม่มีข้อมูลเพิ่มเติม'}`);
      }
    } catch (err) {
      alert("ไม่สามารถติดต่อระบบ Sync ได้");
    } finally {
      setIsSyncing(false);
    }
  };

  const isSuccess = syncStatus === "SUCCESS";
  const isFailed = syncStatus === "FAILED";

  return (
    <div className="sync-center-card">
      <div className="sync-center-header">
        <div className="sync-center-info">
          <div className="sync-center-title">
            <RefreshCw className={isLoading || isSyncing ? "animate-spin" : ""} size={18} />
            <span>ศูนย์ควบคุม Sync อัตโนมัติ</span>
          </div>
          <p className="sync-center-desc">สถานะบอทและการอัปเดตสถิติล่าสุด</p>
        </div>
        
        {/* สถานะหลัก (Badge) */}
        <div className={`sync-status-badge ${syncStatus?.toLowerCase() || "idle"}`}>
          {isSuccess && <CheckCircle2 size={14} />}
          {isFailed && <AlertCircle size={14} />}
          <span>{isSyncing ? "RUNNING..." : (syncStatus || "WAITING")}</span>
        </div>
      </div>

      <div className="sync-center-grid">
        {/* รายการสถานะย่อย */}
        <div className="sync-stat-item">
          <Clock size={16} className="text-slate-400" />
          <div className="sync-stat-content">
            <span className="sync-stat-label">อัปเดตล่าสุด:</span>
            <span className="sync-stat-value">{formatDate(lastSyncAt)}</span>
          </div>
        </div>

        <div className="sync-stat-item">
          <Database size={16} className="text-slate-400" />
          <div className="sync-stat-content">
            <span className="sync-stat-label">ข้อมูลล่าสุด:</span>
            <span className="sync-stat-value">
              {lastSyncRows ? `${lastSyncRows} แถว` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ปุ่มสั่งการอัจฉริยะ */}
      <div className="sync-action-area" style={{ marginTop: "20px" }}>
        {!showDecision ? (
          <button
            onClick={handleSyncRequest}
            disabled={isSyncing}
            style={{
              width: "100%",
              padding: "14px",
              background: isSyncing ? "#334155" : "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
              color: "white",
              border: "none",
              borderRadius: "16px",
              fontWeight: "700",
              cursor: isSyncing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: "0 10px 20px -5px rgba(37, 99, 235, 0.4)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                กำลังรันบอทในเครื่องบอส...
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                🚀 เริ่ม Sync ข้อมูลทันที
              </>
            )}
          </button>
        ) : (
          <div className="decision-ui animate-in slide-in-from-bottom-2 duration-300" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", textAlign: "center", marginBottom: "4px" }}>
              พบบัญชี <span style={{ color: "#38bdf8", fontWeight: "bold" }}>{accountHandle}</span> เลือกวิธีการบันทึกข้อมูล:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                onClick={() => executeSync("EXISTING")}
                style={{
                  padding: "12px",
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                📥 อัปเดตบัญชีเดิม
              </button>
              <button
                onClick={() => executeSync("NEW")}
                style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#f8fafc",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                ✨ สร้างบัญชีใหม่
              </button>
            </div>
            <button 
              onClick={() => setShowDecision(false)}
              style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.8rem", cursor: "pointer", marginTop: "4px" }}
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .sync-center-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }

        .sync-center-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .sync-center-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .sync-center-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #f8fafc;
          font-size: 1.1rem;
        }

        .sync-center-desc {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        .sync-status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .sync-status-badge.success {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .sync-status-badge.failed {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .sync-status-badge.idle {
          background: rgba(148, 163, 184, 0.1);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .sync-center-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .sync-stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sync-stat-content {
          display: flex;
          flex-direction: column;
        }

        .sync-stat-label {
          font-size: 0.75rem;
          color: #64748b;
        }

        .sync-stat-value {
          font-size: 0.9rem;
          color: #f1f5f9;
          font-weight: 500;
        }

        .sync-action-tip {
          margin-top: 16px;
          display: flex;
          gap: 10px;
          background: rgba(14, 165, 233, 0.05);
          padding: 12px;
          border-radius: 8px;
          border-left: 3px solid #0ea5e9;
        }

        .tip-text {
          font-size: 0.85rem;
          color: #38bdf8;
          line-height: 1.4;
        }

        code {
          background: rgba(0, 0, 0, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #bae6fd;
        }
      `}</style>
    </div>
  );
};
