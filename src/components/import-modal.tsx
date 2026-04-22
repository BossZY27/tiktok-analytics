// ============================================
// Component: ImportModal
// หน้าต่างสำหรับเลือกไฟล์ CSV/XLSX และนำเข้าสู่บัญชีที่เลือก
// ============================================

"use client";

import { useState } from "react";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountHandle: string;
  onSuccess: () => void;
}

export function ImportModal({ isOpen, onClose, accountId, accountHandle, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<string>("2026");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !accountId) return;

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("accountId", accountId);
      formData.append("year", year);

      const res = await fetch("/api/tiktok/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: data.message });
        setTimeout(() => {
          onSuccess();
          onClose();
          setFile(null);
          setResult(null);
        }, 2000);
      } else {
        setResult({ success: false, message: data.error || "เกิดข้อผิดพลาดในการนำเข้า" });
      }
    } catch (error) {
      setResult({ success: false, message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">นำเข้าข้อมูล</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">สำหรับบัญชี {accountHandle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Year Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">ระบุปีที่ต้องการนำเข้า</label>
            <select 
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          {/* File Upload Area */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">เลือกไฟล์ CSV หรือ XLSX</label>
            <div 
              className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center space-y-3 transition-all ${
                file ? "border-emerald-500 bg-emerald-50/10" : "border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 hover:bg-indigo-50/5"
              }`}
            >
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <>
                  <div className="p-3 bg-emerald-500/20 rounded-full">
                    <FileText className="text-emerald-500" size={28} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-[250px]">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-500">
                    <Upload size={28} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">คลิกเพื่อเลือกไฟล์</p>
                    <p className="text-xs text-zinc-500">รองรับไฟล์ CSV, XLSX เท่านั้น</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Message */}
          {result && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 ${
              result.success ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
            }`}>
              {result.success ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
              <p className="text-sm font-medium">{result.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                !file || isUploading 
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  ยืนยันนำเข้า
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
