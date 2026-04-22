"use client";

import React, { useState, useEffect } from "react";
import { X, RotateCcw, Trash2, Calendar, AlertCircle } from "lucide-react";

interface TrashAccount {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  deletedAt: string;
}

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export function TrashModal({ isOpen, onClose, onRestoreSuccess }: TrashModalProps) {
  const [deletedAccounts, setDeletedAccounts] = useState<TrashAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDeletedAccounts();
    }
  }, [isOpen]);

  const fetchDeletedAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/accounts/deleted");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDeletedAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching trash:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const [confirmingRestoreId, setConfirmingRestoreId] = useState<string | null>(null);

  const handleRestore = async (id: string, handle: string) => {
    setIsRestoring(id);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || "กู้คืนไม่สำเร็จ");
      }

      alert(`กู้คืนบัญชี ${handle} เรียบร้อยแล้วครับ! ✨`);
      setConfirmingRestoreId(null);
      fetchDeletedAccounts(); // อัปเดตรายการในถังขยะ
      onRestoreSuccess();   // แจ้งให้ Dashboard โหลดข้อมูลใหม่
    } catch (error: any) {
      console.error("Restore failed:", error);
      alert(`เกิดข้อผิดพลาดในการกู้คืน: ${error.message}`);
    } finally {
      setIsRestoring(null);
    }
  };

  // ฟังก์ชันคำนวณวันคงเหลือ (7 วัน)
  const getRemainingDays = (deletedAt: string) => {
    const delDate = new Date(deletedAt);
    const expiryDate = new Date(delDate);
    expiryDate.setDate(delDate.getDate() + 7);
    
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content trash-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <Trash2 size={20} className="text-red-400" />
            <h3 className="modal-title">ถังขยะกู้คืนข้อมูล (7 วัน)</h3>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="loading-state">กำลังค้นหาในถังขยะ...</div>
          ) : deletedAccounts.length === 0 ? (
              <p>ถังขยะว่างเปล่าครับ</p>
          ) : (
            <div className="trash-list">
              <div className="trash-warning">
                <AlertCircle size={14} />
                <span>บัญชีที่ถูกลบเกิน 7 วันจะถูกลบทิ้งถาวรโดยอัตโนมัติ</span>
              </div>
              
              {deletedAccounts.map((account) => {
                const daysLeft = getRemainingDays(account.deletedAt);
                return (
                  <div key={account.id} className="trash-item">
                    <div className="trash-item-info">
                      <div className="trash-item-name">
                        <strong>{account.displayName || account.handle}</strong>
                        <span className="trash-item-handle">{account.handle}</span>
                      </div>
                      <div className="trash-item-meta">
                        <Calendar size={12} />
                        <span>เหลือเวลาอีก {daysLeft} วัน</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {confirmingRestoreId !== account.id ? (
                        <button
                          onClick={() => setConfirmingRestoreId(account.id)}
                          disabled={isRestoring !== null}
                          className="restore-btn"
                          title="กู้คืนบัญชีนี้คัล"
                        >
                          <RotateCcw size={14} />
                          กู้คืน
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleRestore(account.id, account.handle)}
                            disabled={isRestoring !== null}
                            style={{
                              background: '#22c55e',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              opacity: isRestoring !== null ? 0.5 : 1
                            }}
                          >
                            <RotateCcw size={14} />
                            {isRestoring === account.id ? 'ยืนยัน...' : 'ยืนยันจะกู้?'}
                          </button>
                          <button
                            onClick={() => setConfirmingRestoreId(null)}
                            disabled={isRestoring !== null}
                            style={{
                              background: '#3f3f46',
                              color: 'white',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                            }}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .trash-modal {
          width: 100%;
          max-width: 450px;
          background: #1e1e2d;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .modal-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-title {
          font-weight: 600;
          color: #f8fafc;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.2s;
        }

        .modal-body {
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }

        .trash-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(234, 179, 8, 0.1);
          color: #eab308;
          padding: 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          margin-bottom: 16px;
          border: 1px solid rgba(234, 179, 8, 0.2);
        }

        .trash-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trash-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .trash-item-name {
          display: flex;
          flex-direction: column;
        }

        .trash-item-handle {
          font-size: 0.75rem;
          color: #64748b;
        }

        .trash-item-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          color: #94a3b8;
          margin-top: 4px;
        }

        .restore-btn {
          background: #312e81;
          color: #a5b4fc;
          border: 1px solid #4338ca;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .restore-btn:hover:not(:disabled) {
          background: #3730a3;
          transform: translateY(-1px);
        }

        .empty-state, .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
          color: #64748b;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
