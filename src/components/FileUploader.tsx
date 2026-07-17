import React, { useState, useRef } from "react";
import { Upload, Link as LinkIcon, FileText, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { FileState } from "../types";
import { parseLocalFile } from "../utils/dataEngine";
import { motion, AnimatePresence } from "motion/react";

interface FileUploaderProps {
  fileA: FileState | null;
  fileB: FileState | null;
  onFileALoaded: (fileState: FileState) => void;
  onFileBLoaded: (fileState: FileState) => void;
  onResetFile: (target: "A" | "B") => void;
}

export default function FileUploader({
  fileA,
  fileB,
  onFileALoaded,
  onFileBLoaded,
  onResetFile,
}: FileUploaderProps) {
  const [bImportMethod, setBImportMethod] = useState<"upload" | "link">("upload");
  const [linkUrl, setLinkUrl] = useState("");
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  const [dragActiveA, setDragActiveA] = useState(false);
  const [dragActiveB, setDragActiveB] = useState(false);

  // Parse and process file
  const handleFileProcess = async (file: File, target: "A" | "B") => {
    const updateFn = target === "A" ? onFileALoaded : onFileBLoaded;
    
    updateFn({
      name: file.name,
      headers: [],
      data: [],
      rowCount: 0,
      isLoading: true,
      error: null,
    });

    try {
      const parsed = await parseLocalFile(file);
      updateFn({
        name: file.name,
        headers: parsed.headers,
        data: parsed.data,
        rowCount: parsed.data.length,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error(err);
      updateFn({
        name: file.name,
        headers: [],
        data: [],
        rowCount: 0,
        isLoading: false,
        error: err.message || "Failed to parse file. Ensure it is a valid Excel or CSV file.",
      });
    }
  };

  // HTML Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "A" | "B") => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0], target);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent, target: "A" | "B", active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (target === "A") setDragActiveA(active);
    else setDragActiveB(active);
  };

  const handleDrop = (e: React.DragEvent, target: "A" | "B") => {
    e.preventDefault();
    e.stopPropagation();
    if (target === "A") setDragActiveA(false);
    else setDragActiveB(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0], target);
    }
  };

  // Fetch URL file proxy
  const handleFetchLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    setIsLinkLoading(true);
    setLinkError(null);

    onFileBLoaded({
      name: "Remote Dataset",
      headers: [],
      data: [],
      rowCount: 0,
      isLoading: true,
      error: null,
    });

    try {
      const response = await fetch(`/api/fetch-link?url=${encodeURIComponent(linkUrl.trim())}`);
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.details || `Fetch failed with status ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const isExcel = contentType.includes("excel") || contentType.includes("spreadsheet") || contentType.includes("officedocument") || linkUrl.includes(".xlsx") || linkUrl.includes(".xls");
      
      const blob = await response.blob();
      const filename = isExcel ? "remote_sheet.xlsx" : "remote_sheet.csv";
      const file = new File([blob], filename, { type: blob.type });

      const parsed = await parseLocalFile(file);
      onFileBLoaded({
        name: `Remote Sheet: ${linkUrl.substring(0, 30)}...`,
        headers: parsed.headers,
        data: parsed.data,
        rowCount: parsed.data.length,
        isLoading: false,
        error: null,
      });
      setLinkUrl("");
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Failed to fetch spreadsheet from the URL. Ensure the link is public and accessible.";
      setLinkError(errMsg);
      onFileBLoaded({
        name: "Remote Dataset",
        headers: [],
        data: [],
        rowCount: 0,
        isLoading: false,
        error: errMsg,
      });
    } finally {
      setIsLinkLoading(false);
    }
  };

  return (
    <div className="space-y-4" id="file-uploader-section">
      {/* SHEET A UPLOADER */}
      <div 
        className="bg-white rounded-lg border border-slate-200 p-3.5 relative overflow-hidden transition-all hover:border-slate-300"
        id="uploader-sheet-a"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              A
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-xs">Primary Dataset (Sheet A)</h3>
              <p className="text-[10px] text-slate-400">The base reference sheet.</p>
            </div>
          </div>
          {fileA && !fileA.isLoading && (
            <button
              onClick={() => onResetFile("A")}
              className="text-[10px] text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {fileA?.isLoading ? (
            <motion.div 
              key="loading-a"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-24 border border-dashed border-emerald-200 rounded-md bg-emerald-50/10 flex flex-col items-center justify-center space-y-1.5"
            >
              <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
              <p className="text-xs font-medium text-emerald-700">Reading Primary Sheet...</p>
            </motion.div>
          ) : fileA && !fileA.error ? (
            <motion.div 
              key="loaded-a"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-24 border border-emerald-100 rounded-md bg-emerald-50/10 p-2.5 flex flex-col justify-between"
            >
              <div className="flex items-start space-x-2">
                <div className="p-1.5 bg-emerald-500 text-white rounded-md shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 text-xs truncate" title={fileA.name}>{fileA.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {fileA.rowCount.toLocaleString()} rows • {fileA.headers.length} cols
                  </p>
                </div>
              </div>

              <div className="bg-white border border-emerald-100 rounded-md py-1 px-1.5 flex items-center space-x-1.5 text-emerald-700 text-[10px] mt-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate font-medium">Ready for key mapping.</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty-a"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragOver={(e) => handleDrag(e, "A", true)}
              onDragLeave={(e) => handleDrag(e, "A", false)}
              onDrop={(e) => handleDrop(e, "A")}
              onClick={() => fileInputRefA.current?.click()}
              className={`h-24 border border-dashed rounded-md flex flex-col items-center justify-center space-y-1 cursor-pointer transition-all relative ${
                dragActiveA 
                  ? "border-emerald-500 bg-emerald-50/20 scale-[1.01]" 
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRefA}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFileChange(e, "A")}
              />
              <Upload className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-medium text-slate-700">Upload or drag A</p>
              <p className="text-[9px] text-slate-400">Excel or CSV formats</p>
              
              {fileA?.error && (
                <div className="absolute bottom-1 left-1 right-1 px-1.5 py-1 bg-rose-50 border border-rose-100 rounded text-rose-600 text-[9px] flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span className="truncate">{fileA.error}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SHEET B UPLOADER */}
      <div 
        className="bg-white rounded-lg border border-slate-200 p-3.5 relative overflow-hidden transition-all hover:border-slate-300"
        id="uploader-sheet-b"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              B
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-xs">Target Dataset (Sheet B)</h3>
              <p className="text-[10px] text-slate-400">The secondary lookup sheet.</p>
            </div>
          </div>
          {fileB && !fileB.isLoading && (
            <button
              onClick={() => {
                onResetFile("B");
                setLinkError(null);
              }}
              className="text-[10px] text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Tab selector for upload vs link (only when file B is not loaded) */}
        {!fileB && (
          <div className="flex space-x-1 bg-slate-100 p-0.5 rounded-md mb-2 text-[10px] w-fit">
            <button
              onClick={() => setBImportMethod("upload")}
              className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                bImportMethod === "upload" 
                  ? "bg-white text-slate-800 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Local Upload
            </button>
            <button
              onClick={() => setBImportMethod("link")}
              className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                bImportMethod === "link" 
                  ? "bg-white text-slate-800 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Import URL
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {fileB?.isLoading ? (
            <motion.div 
              key="loading-b"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-24 border border-dashed border-indigo-200 rounded-md bg-indigo-50/10 flex flex-col items-center justify-center space-y-1.5"
            >
              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
              <p className="text-xs font-medium text-indigo-700">Reading Target Sheet...</p>
            </motion.div>
          ) : fileB && !fileB.error ? (
            <motion.div 
              key="loaded-b"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-24 border border-indigo-100 rounded-md bg-indigo-50/10 p-2.5 flex flex-col justify-between"
            >
              <div className="flex items-start space-x-2">
                <div className="p-1.5 bg-indigo-500 text-white rounded-md shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 text-xs truncate" title={fileB.name}>{fileB.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {fileB.rowCount.toLocaleString()} rows • {fileB.headers.length} cols
                  </p>
                </div>
              </div>

              <div className="bg-white border border-indigo-100 rounded-md py-1 px-1.5 flex items-center space-x-1.5 text-indigo-700 text-[10px] mt-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="truncate font-medium">Ready for key mapping.</span>
              </div>
            </motion.div>
          ) : bImportMethod === "upload" || fileB?.error ? (
            <motion.div
              key="empty-b-upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragOver={(e) => handleDrag(e, "B", true)}
              onDragLeave={(e) => handleDrag(e, "B", false)}
              onDrop={(e) => handleDrop(e, "B")}
              onClick={() => fileInputRefB.current?.click()}
              className={`h-24 border border-dashed rounded-md flex flex-col items-center justify-center space-y-1 cursor-pointer transition-all relative ${
                dragActiveB 
                  ? "border-indigo-500 bg-indigo-50/20 scale-[1.01]" 
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRefB}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFileChange(e, "B")}
              />
              <Upload className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-medium text-slate-700">Upload or drag B</p>
              <p className="text-[9px] text-slate-400">Excel or CSV formats</p>
              
              {(fileB?.error || linkError) && (
                <div className="absolute bottom-1 left-1 right-1 px-1.5 py-1 bg-rose-50 border border-rose-100 rounded text-rose-600 text-[9px] flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span className="truncate">{fileB?.error || linkError}</span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty-b-link"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-24 border border-slate-200 rounded-md bg-slate-50/50 p-2 flex flex-col justify-center"
            >
              <form onSubmit={handleFetchLink} className="space-y-1.5">
                <div className="relative">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Paste spreadsheet URL..."
                    className="w-full text-[10px] px-2 py-1.5 border border-slate-200 rounded-md pr-7 focus:outline-hidden focus:border-indigo-500 bg-white"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLinkLoading || !linkUrl.trim()}
                    className="absolute right-1 top-1 p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:bg-slate-200 disabled:text-slate-400 transition-all cursor-pointer"
                  >
                    {isLinkLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <p className="text-[8px] text-slate-400 leading-tight">
                  Supports public Google Sheet URLs or raw web files.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
