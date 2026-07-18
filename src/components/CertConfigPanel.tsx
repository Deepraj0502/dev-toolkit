import { useState, useRef, type ChangeEvent } from "react";
import { 
  ShieldCheck, FileText, Key, Server, Upload, AlertTriangle, 
  CheckCircle2, Loader2, Eye, FileSearch, X, Terminal 
} from "lucide-react";

const BACKEND_URL = "http://10.177.44.29:4417";

const ALLOWED_SERVERS = [
  "10.177.44.21",
  "10.177.44.22",
  "10.177.44.23",
  "10.177.44.25",
  "10.177.44.26",
  "10.177.44.27",
];

type FileTypeKey = "cert" | "prop" | "jks";

const FILE_TYPES: Record<FileTypeKey, {
  label: string;
  dir: string;
  exts: string[];
  accept: string;
  icon: any;
}> = {
  cert: {
    label: "Public Certificate (.cer, .pem)",
    dir: "/opt/IBM/EndPoint_Public",
    exts: [".cer", ".pem"],
    accept: ".cer,.pem",
    icon: ShieldCheck,
  },
  prop: {
    label: "Properties File (.properties)",
    dir: "/opt/IBM/PropertyFile",
    exts: [".properties"],
    accept: ".properties",
    icon: FileText,
  },
  jks: {
    label: "JKS Keystore (.jks)",
    dir: "/opt/IBM/RSAKeystore",
    exts: [".jks"],
    accept: ".jks",
    icon: Key,
  },
};

export default function CertConfigPanel() {
  const [activeTab, setActiveTab] = useState<"configure" | "view">("configure");

  // ── Configure State ──────────────────────────────────────────
  const [selectedHost, setSelectedHost] = useState(ALLOWED_SERVERS[3]); // default .25
  const [fileType, setFileType] = useState<FileTypeKey>("cert");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    exists: boolean;
    content: string | null;
    path: string;
  } | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── View State ───────────────────────────────────────────────
  const [viewHost, setViewHost] = useState(ALLOWED_SERVERS[3]);
  const [viewFileName, setViewFileName] = useState("");
  const [isViewing, setIsViewing] = useState(false);
  const [viewContent, setViewContent] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  // ── Handlers: File Selection & Verification ──────────────────
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setCheckResult(null);
    setUploadStatus(null);
    
    const file = e.target.files?.[0];
    if (!file) return;

    const currentConfig = FILE_TYPES[fileType];
    const hasValidExt = currentConfig.exts.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setFileError(`Invalid file extension. Expected strictly: ${currentConfig.exts.join(" or ")}`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleCheckFile = async () => {
    if (!selectedFile) return;
    setIsChecking(true);
    setCheckResult(null);
    setUploadStatus(null);

    try {
      const res = await fetch(`${BACKEND_URL}/check-remote-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetHost: selectedHost,
          targetDir: FILE_TYPES[fileType].dir,
          fileName: selectedFile.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check remote file");

      setCheckResult(data);
      setShowConfirmModal(true);
    } catch (err) {
      setUploadStatus({
        type: "error",
        msg: err instanceof Error ? err.message : "Error verifying file on server",
      });
    } finally {
      setIsChecking(false);
    }
  };

  // ── Handlers: SFTP Upload ────────────────────────────────────
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("targetDir", FILE_TYPES[fileType].dir);
    formData.append("targetHost", selectedHost);

    try {
      const res = await fetch(`${BACKEND_URL}/sftp-upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      setUploadStatus({ type: "success", msg: data.message });
      setShowConfirmModal(false);
      setSelectedFile(null);
      setCheckResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadStatus({
        type: "error",
        msg: err instanceof Error ? err.message : "SFTP upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ── Handlers: View Endpoint Public Certs ─────────────────────
  const handleViewCert = async () => {
    if (!viewFileName.trim()) return;
    setIsViewing(true);
    setViewContent(null);
    setViewError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/view-cert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetHost: viewHost, fileName: viewFileName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch file");
      setViewContent(data.content);
    } catch (err) {
      setViewError(err instanceof Error ? err.message : "Failed to retrieve certificate");
    } finally {
      setIsViewing(false);
    }
  };

  const ActiveIcon = FILE_TYPES[fileType].icon;

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-2xl text-slate-100 space-y-6">
      
      {/* ── Header & Tabs ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-indigo-400" />
          <h2 className="text-lg font-bold tracking-wide uppercase font-mono">Certificate & Key Configuration</h2>
        </div>
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("configure")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === "configure" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Upload className="h-3.5 w-3.5" /> Configure / Upload
          </button>
          <button
            onClick={() => setActiveTab("view")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === "view" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> View Public Certs
          </button>
        </div>
      </div>

      {/* ── TAB 1: CONFIGURE & UPLOAD ──────────────────────────── */}
      {activeTab === "configure" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Target Server Selector */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-indigo-400" /> Target Server IP
              </label>
              <select
                value={selectedHost}
                onChange={(e) => setSelectedHost(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              >
                {ALLOWED_SERVERS.map((ip) => (
                  <option key={ip} value={ip}>{ip}</option>
                ))}
              </select>
            </div>

            {/* File Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                <FileSearch className="h-3.5 w-3.5 text-indigo-400" /> Target File Type
              </label>
              <select
                value={fileType}
                onChange={(e) => {
                  setFileType(e.target.value as FileTypeKey);
                  setSelectedFile(null);
                  setFileError(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {Object.entries(FILE_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Destination Path Display */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Target Path on <strong className="text-indigo-400">{selectedHost}</strong>:</span>
            <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-md">
              {FILE_TYPES[fileType].dir}/
            </span>
          </div>

          {/* File Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 p-8 text-center cursor-pointer transition-all group"
          >
            <div className="rounded-full bg-slate-900 p-3 border border-slate-800 group-hover:scale-110 transition-transform">
              <ActiveIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-200 font-medium">
                Click to select your <span className="text-indigo-400 underline">{FILE_TYPES[fileType].label}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Only {FILE_TYPES[fileType].exts.join(", ")} extensions allowed</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_TYPES[fileType].accept}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Error Message */}
          {fileError && (
            <div className="rounded-xl border border-red-800/80 bg-red-950/50 p-3.5 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Selected File Card */}
          {selectedFile && !fileError && (
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <ActiveIcon className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-mono truncate font-semibold text-slate-200">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button
                onClick={handleCheckFile}
                disabled={isChecking}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 transition-all shrink-0"
              >
                {isChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
                {isChecking ? "Checking Server..." : "Check & Configure"}
              </button>
            </div>
          )}

          {/* Upload Status Feedback */}
          {uploadStatus && (
            <div className={`rounded-xl border p-4 text-xs flex items-center gap-3 ${
              uploadStatus.type === "success" 
                ? "border-emerald-800 bg-emerald-950/60 text-emerald-300" 
                : "border-red-800 bg-red-950/60 text-red-300"
            }`}>
              {uploadStatus.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />}
              <span className="font-mono leading-relaxed">{uploadStatus.msg}</span>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: VIEW ENDPOINT CERTIFICATES ──────────────────── */}
      {activeTab === "view" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-48 shrink-0 space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Server IP</label>
                <select
                  value={viewHost}
                  onChange={(e) => setViewHost(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
                >
                  {ALLOWED_SERVERS.map((ip) => (
                    <option key={ip} value={ip}>{ip}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  File Name in /opt/IBM/EndPoint_Public/
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={viewFileName}
                    onChange={(e) => setViewFileName(e.target.value)}
                    placeholder="e.g. endpoint.cer or server.pem"
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleViewCert}
                    disabled={isViewing || !viewFileName.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isViewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>

          {viewError && (
            <div className="rounded-xl border border-red-800 bg-red-950/60 p-4 text-xs font-mono text-red-300">
              {viewError}
            </div>
          )}

          {viewContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span>Displaying: <strong className="text-indigo-400">/opt/IBM/EndPoint_Public/{viewFileName}</strong></span>
                <span className="text-emerald-400">Connected to {viewHost}</span>
              </div>
              <pre className="whitespace-pre-wrap break-all rounded-2xl border border-slate-800 bg-black/50 p-4 text-xs font-mono text-emerald-400 max-h-[380px] overflow-y-auto leading-relaxed">
                {viewContent}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: PRE-UPLOAD COLLISION & CONFIRMATION ─────────── */}
      {showConfirmModal && checkResult && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Server className="h-4 w-4 text-indigo-400" />
                SFTP Upload Confirmation
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Collision Warning Banner */}
            {checkResult.exists ? (
              <div className="rounded-2xl border border-amber-700/60 bg-amber-950/40 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Warning: File Already Exists on Server!
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed font-mono">
                  A file named <strong className="text-white">{selectedFile.name}</strong> is already present in{" "}
                  <span className="underline">{checkResult.path}</span> on {selectedHost}.
                </p>
                {checkResult.content && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] uppercase text-amber-400/80 font-bold">Existing Remote Content Snapshot:</span>
                    <pre className="max-h-40 overflow-y-auto rounded-xl bg-black/60 p-2.5 text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all border border-amber-900/40">
                      {checkResult.content}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3.5 flex items-center gap-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Directory verified. No existing file collision detected at destination path.</span>
              </div>
            )}

            {/* Upload Summary Table */}
            <div className="rounded-xl bg-slate-900 p-3.5 space-y-2 text-xs font-mono border border-slate-800/80">
              <div className="flex justify-between"><span className="text-slate-500">Target Server:</span> <span className="text-indigo-400 font-bold">{selectedHost}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Destination Directory:</span> <span className="text-slate-200">{FILE_TYPES[fileType].dir}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">File Name:</span> <span className="text-slate-200 font-bold">{selectedFile.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Action:</span> <span className={checkResult.exists ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>{checkResult.exists ? "OVERWRITE EXISTING" : "NEW UPLOAD"}</span></div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isUploading}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={isUploading}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-lg transition-all ${
                  checkResult.exists ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                }`}
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {isUploading ? "Transferring..." : checkResult.exists ? "Confirm Overwrite via SFTP" : "Confirm SFTP Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}