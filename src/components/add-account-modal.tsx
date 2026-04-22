// ============================================
// Component: AddAccountModal (Final Clean Version)
// หน้าต่างสำหรับเพิ่มบัญชี TikTok แบบ Manual - แก้ไขบัคตัวหนังสือซ้อนกัน
// ============================================

"use client";

import { useState } from "react";
import { Plus, X, UserPlus, Loader2, AtSign, Info } from "lucide-react";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAccount: any) => void;
}

export function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [browserProfile, setBrowserProfile] = useState("Default");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, displayName, browserProfile }),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess(data);
        onClose();
        setHandle("");
        setDisplayName("");
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        setError(errorMsg);
      }
    } catch (err) {
      setError("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#09090b]/90 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-[#111114] w-full max-w-[480px] rounded-[28px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden border border-white/[0.06] animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="relative p-10 pb-6 text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
            <UserPlus size={28} className="text-indigo-400" />
          </div>
          <h3 className="text-3xl font-bold text-white tracking-tight">เพิ่มบัญชี TikTok</h3>
          <p className="text-zinc-500 text-base mt-3 max-w-[280px] mx-auto leading-relaxed">กรอกข้อมูลบัญชีเพื่อเริ่มการวิเคราะห์สถิติข้อมูล</p>
          
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 pt-6 space-y-9">
          {/* Handle Input Group */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">
                TIKTOK USERNAME
              </label>
              <Info size={12} className="text-zinc-600" />
            </div>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors duration-300">
                <AtSign size={18} />
              </span>
              <input
                type="text"
                placeholder="เช่น username"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace("@", "").trim())}
                required
                className="w-full pl-12 pr-5 py-4.5 bg-white/[0.02] border border-white/10 focus:border-indigo-500/40 focus:bg-white/[0.05] rounded-2xl outline-none transition-all duration-300 text-white text-lg font-medium placeholder:text-zinc-700 shadow-inner"
              />
            </div>
          </div>

          {/* Browser Profile Input Group */}
          <div className="space-y-3.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">
              EDGE BROWSER PROFILE
            </label>
            <input
              type="text"
              placeholder="เช่น Default, Profile 1"
              value={browserProfile}
              onChange={(e) => setBrowserProfile(e.target.value)}
              className="w-full px-5 py-4.5 bg-white/[0.02] border border-white/10 focus:border-indigo-500/40 focus:bg-white/[0.05] rounded-2xl outline-none transition-all duration-300 text-white text-lg font-medium placeholder:text-zinc-700 shadow-inner"
            />
            <p className="text-[10px] text-zinc-600 ml-1">สำคัญ: ชื่อโปรไฟล์ที่ใช้ Login TikTok นี้ใน Microsoft Edge</p>
          </div>

          {/* Display Name Input Group */}
          <div className="space-y-3.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">
              ชื่อที่ต้องการแสดง (OPTION)
            </label>
            <input
              type="text"
              placeholder="เช่น บัญชีหลัก, ช่องสำรอง"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-5 py-4.5 bg-white/[0.02] border border-white/10 focus:border-indigo-500/40 focus:bg-white/[0.05] rounded-2xl outline-none transition-all duration-300 text-white text-lg font-medium placeholder:text-zinc-700 shadow-inner"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="shrink-0 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {error}
            </div>
          )}

          {/* Action Buttons Section */}
          <div className="flex flex-col gap-4 pt-4">
            <button
              type="submit"
              disabled={!handle || isSubmitting}
              className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-500 ${
                !handle || isSubmitting 
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50" 
                  : "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white hover:from-indigo-500 hover:to-indigo-600 shadow-[0_20px_40px_-12px_rgba(79,70,229,0.5)] active:scale-[0.97]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  กำลังจัดเตรียมข้อมูล...
                </>
              ) : (
                <>
                  <Plus size={22} />
                  ยืนยันการเพิ่มบัญชี
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-4 text-zinc-500 hover:text-zinc-300 text-base font-semibold transition-all duration-300 hover:tracking-widest"
            >
              ยกเลิกการเพิ่ม
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
