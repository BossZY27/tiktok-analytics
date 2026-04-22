// ============================================
// Account Selector Component
// Dropdown สำหรับเลือกบัญชี TikTok + ปุ่มนำเข้าข้อมูล และเพิ่มบัญชี (Manual)
// ============================================

"use client";

import { useState } from "react";
import { ChevronDown, User, Plus, FileUp, UserPlus, Trash2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ImportModal } from "./import-modal";
import { AddAccountModal } from "./add-account-modal";
import { TrashModal } from "./trash-modal";

interface TikTokAccount {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  lastSyncAt: string | Date | null;
  syncStatus: string | null;
  lastSyncRows: number | null;
}

interface AccountSelectorProps {
  accounts: TikTokAccount[];
  selectedAccountId: string | null;
  onSelect: (accountId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function AccountSelector({
  accounts,
  selectedAccountId,
  onSelect,
  onRefresh,
  isLoading = false,
}: AccountSelectorProps) {
  const { data: session } = useSession();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // เช็คสิทธิ์
  const userRole = (session?.user as any)?.role || "VIEWER";
  const canModify = userRole === "ADMIN" || userRole === "EDITOR";

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // ฟังก์ชันลบบัญชี (Soft Delete)
  const handleDelete = async () => {
    try {
      if (!selectedAccount) return;
      
      setIsDeleting(true);
      const res = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ลบบัญชีไม่สำเร็จ");
      }

      alert("ย้ายบัญชีไปที่ถังขยะเรียบร้อยแล้วครับ 🗑️");
      
      setIsConfirmingDelete(false);
      onSelect("all");
      onRefresh();
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(`ไม่สามารถลบบัญชีได้: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };
  if (isLoading) {
    return (
      <div className="account-selector-skeleton">
        <div className="skeleton-circle" />
        <div className="skeleton-text" />
      </div>
    );
  }

  return (
    <div className="account-selector-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label className="account-selector-label">บัญชี TikTok</label>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* ปุ่มดูถังขยะ (กู้คืน) */}
          <button 
            onClick={() => setIsTrashModalOpen(true)}
            className="connect-tiktok-link" 
            title="ถังขยะกู้คืนข้อมูล (7 วัน)"
            style={{ color: '#94a3b8' }}
          >
            <RotateCcw size={14} /> ถังขยะ
          </button>

          {canModify && (
            <>
               <button 
                onClick={() => setIsAddAccountModalOpen(true)}
                className="connect-tiktok-link" 
                title="เพิ่มบัญชีเอง (Manual)"
              >
                <UserPlus size={14} /> เพิ่มไอดี
              </button>
            </>
          )}
        </div>
      </div>

      <div className="account-selector-container">
        <select
          value={selectedAccountId || ""}
          onChange={(e) => onSelect(e.target.value)}
          className="account-selector-select"
        >
          <option value="all" style={{ background: "#1e1e2d", color: "#f1f5f9" }}>
            ⭐ ภาพรวม (ทุกบัญชี)
          </option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id} style={{ background: "#1e1e2d", color: "#f1f5f9" }}>
              {account.displayName || account.handle} ({account.handle})
            </option>
          ))}
        </select>
        <ChevronDown className="account-selector-icon" size={18} />
      </div>

      {selectedAccount && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p className="account-selector-info">
              กำลังดู <strong>{selectedAccount.handle}</strong>
            </p>
            
            {canModify && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!isConfirmingDelete ? (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="ย้ายบัญชีนี้ไปที่ถังขยะ"
                  >
                    <Trash2 size={12} /> ลบบัญชี
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      style={{
                        background: '#ef4444',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        opacity: isDeleting ? 0.5 : 1
                      }}
                    >
                      {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ?'}
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isDeleting}
                      style={{
                        background: '#3f3f46',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {canModify && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="import-data-btn"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px dashed rgba(99, 102, 241, 0.4)',
                borderRadius: '8px',
                color: '#818cf8',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <FileUp size={16} />
              นำเข้าไฟล์ข้อมูล
            </button>
          )}
        </div>
      )}

      {selectedAccountId === "all" && accounts.length > 0 && (
        <p className="account-selector-info" style={{ marginTop: '12px' }}>
          กำลังดูข้อมูล <strong>รวมทุกบัญชี</strong>
        </p>
      )}

      {accounts.length === 0 && canModify && (
        <p className="account-selector-info" style={{ marginTop: '12px', color: '#94a3b8' }}>
          ยังไม่มีบัญชีในระบบ เริ่มต้นโดยการเพิ่มไอดี หรือต่อ API ครับ
        </p>
      )}

      {/* Modals */}
      {selectedAccount && (
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          accountId={selectedAccount.id}
          accountHandle={selectedAccount.handle}
          onSuccess={onRefresh}
        />
      )}
      
      <AddAccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onSuccess={(newAccount) => {
          onRefresh();
          if (newAccount?.id) {
            onSelect(newAccount.id);
          }
        }}
      />

      <TrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        onRestoreSuccess={onRefresh}
      />
    </div>
  );
}
