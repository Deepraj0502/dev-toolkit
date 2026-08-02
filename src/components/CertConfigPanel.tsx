import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { 
  ShieldCheck, FileText, Key, Server, Upload, AlertTriangle, 
  CheckCircle2, Loader2, Eye, FileSearch, X, Terminal, Tag, Search, Clock 
} from "lucide-react";
import { CopyButton } from "./CopyButton";

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

type ViewResult = {
  host: string;
  status: "FOUND" | "NOT_FOUND" | "ERROR";
  expiry?: string;
  fingerprint?: string;
  content?: string;
  error?: string;
};

export default function CertConfigPanel() {
  const [activeTab, setActiveTab] = useState<"configure" | "view" | "inventory">("configure");

  // ── Configure State ──────────────────────────────────────────
  const [selectedHost, setSelectedHost] = useState(ALLOWED_SERVERS[3]); // default .25
  const [fileType, setFileType] = useState<FileTypeKey>("cert");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aliasName, setAliasName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
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
  const [viewHost, setViewHost] = useState("ALL");
  const [viewFileName, setViewFileName] = useState("");
  const [isViewing, setIsViewing] = useState(false);
  const [viewResults, setViewResults] = useState<ViewResult[]>([]);
  const [viewPath, setViewPath] = useState<string>("");
  const [viewError, setViewError] = useState<string | null>(null);

  // ── Inventory State ──────────────────────────────────────────
  const [scanHost, setScanHost] = useState("ALL");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  // ── Helper: File Validation (Shared by Input & Drop) ─────────
  const processFile = (file: File) => {
    setFileError(null);
    setCheckResult(null);
    setUploadStatus(null);

    const currentConfig = FILE_TYPES[fileType];
    const hasValidExt = currentConfig.exts.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setFileError(`Invalid file extension. Expected strictly: ${currentConfig.exts.join(" or ")}`);
      setSelectedFile(null);
      setAliasName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    const cleanAlias = file.name.replace(/\.[^/.]+$/, "");
    setAliasName(cleanAlias);
  };

  // ── Handlers: Drag and Drop ──────────────────────────────────
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Handlers: Verification & SFTP Upload ─────────────────────
  const handleCheckFile = async () => {
    if (!selectedFile) return;
    if (!aliasName.trim()) {
      setFileError("Please provide an alias name for this configuration.");
      return;
    }

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
          alias: aliasName.trim(),
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

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("targetDir", FILE_TYPES[fileType].dir);
    formData.append("targetHost", selectedHost);
    formData.append("alias", aliasName.trim());

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
      setAliasName("");
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
    setViewResults([]);
    setViewPath("");
    setViewError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/view-cert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetHosts: viewHost, fileName: viewFileName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch file");
      setViewResults(data.results);
      setViewPath(data.path);
    } catch (err) {
      setViewError(err instanceof Error ? err.message : "Failed to retrieve certificate");
    } finally {
      setIsViewing(false);
    }
  };

  // ── Handlers: Global Inventory Scan ──────────────────────────
  const handleScanServers = async () => {
    setIsScanning(true);
    setScanResults([]);
    setScanError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/list-certs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetHosts: scanHost }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to scan servers");
      setScanResults(data.results || []);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Inventory scan failed.");
    } finally {
      setIsScanning(false);
    }
  };

  const getCertStatus = (expiryString: string) => {
    if (expiryString.includes("Unknown")) return { label: "Invalid", color: "text-slate-400 bg-slate-800" };
    
    const expiryDate = new Date(expiryString);
    const now = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) return { label: "Expired", color: "text-red-300 bg-red-950 border-red-800" };
    if (diffDays <= 30) return { label: `Expiring (${diffDays}d)`, color: "text-amber-300 bg-amber-950 border-amber-800" };
    return { label: "Valid", color: "text-emerald-300 bg-emerald-950 border-emerald-800" };
  };

  const ActiveIcon = FILE_TYPES[fileType].icon;

  const flatCerts = scanResults.flatMap(r => (r.certs || []).map((c: any) => ({ host: r.host, ...c })));
  const failedHosts = scanResults.filter(r => r.error);

  // Deriving comparison info for the View Specific tab
  const foundCerts = viewResults.filter(r => r.status === "FOUND");
  const uniqueFingerprints = new Set(foundCerts.map(r => r.fingerprint));
  const hasMismatch = uniqueFingerprints.size > 1;

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-2xl text-slate-100 space-y-6">
      
      {/* ── Header & Tabs ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-indigo-400" />
          <h2 className="text-lg font-bold tracking-wide uppercase font-mono">Certificate & Key Configuration</h2>
        </div>
        <div className="flex flex-wrap rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("configure")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              activeTab === "configure" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Upload className="h-3.5 w-3.5" /> Configure
          </button>
          <button
            onClick={() => setActiveTab("view")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              activeTab === "view" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> View Specific
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              activeTab === "inventory" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="h-3.5 w-3.5" /> Global Inventory
          </button>
        </div>
      </div>

      {/* ── TAB 1: CONFIGURE & UPLOAD ──────────────────────────── */}
      {activeTab === "configure" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
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

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                <FileSearch className="h-3.5 w-3.5 text-indigo-400" /> Target File Type
              </label>
              <select
                value={fileType}
                onChange={(e) => {
                  setFileType(e.target.value as FileTypeKey);
                  setSelectedFile(null);
                  setAliasName("");
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

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Target Path on <strong className="text-indigo-400">{selectedHost}</strong>:</span>
            <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-md">
              {FILE_TYPES[fileType].dir}/
            </span>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all group ${
              isDragging 
                ? "border-indigo-500 bg-indigo-950/20 scale-[1.01]" 
                : "border-slate-800 hover:border-indigo-500/50 bg-slate-950/40"
            }`}
          >
            <div className={`rounded-full p-3 border transition-transform ${
              isDragging 
                ? "bg-indigo-600/20 border-indigo-500 scale-110 animate-bounce" 
                : "bg-slate-900 border-slate-800 group-hover:scale-110"
            }`}>
              <ActiveIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-200 font-medium">
                {isDragging ? (
                  <span className="text-indigo-400 font-bold">Drop file here to attach...</span>
                ) : (
                  <>Drag & drop or <span className="text-indigo-400 underline">click to select</span> your {FILE_TYPES[fileType].label}</>
                )}
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

          {fileError && (
            <div className="rounded-xl border border-red-800/80 bg-red-950/50 p-3.5 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{fileError}</span>
            </div>
          )}

          {selectedFile && !fileError && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-slate-800 p-2.5 border border-slate-700 shrink-0">
                    <ActiveIcon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-mono truncate font-semibold text-slate-200">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB • Ready for config</p>
                  </div>
                </div>

                <div className="flex-1 max-w-md space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-indigo-400" /> Certificate / Key Alias Name
                  </label>
                  <input
                    type="text"
                    value={aliasName}
                    onChange={(e) => setAliasName(e.target.value)}
                    placeholder="e.g. prod-gateway-cert"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <button
                  onClick={handleCheckFile}
                  disabled={isChecking || !aliasName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 transition-all shrink-0 h-10 self-end md:self-auto"
                >
                  {isChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
                  {isChecking ? "Checking Server..." : "Check & Configure"}
                </button>
              </div>
            </div>
          )}

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

                <div className="rounded-xl bg-slate-900 p-3.5 space-y-2 text-xs font-mono border border-slate-800/80">
                  <div className="flex justify-between"><span className="text-slate-500">Target Server:</span> <span className="text-indigo-400 font-bold">{selectedHost}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Destination Directory:</span> <span className="text-slate-200">{FILE_TYPES[fileType].dir}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">File Name:</span> <span className="text-slate-200 font-bold">{selectedFile.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Config Alias Name:</span> <span className="text-emerald-400 font-bold">{aliasName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Action:</span> <span className={checkResult.exists ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>{checkResult.exists ? "OVERWRITE EXISTING" : "NEW UPLOAD"}</span></div>
                </div>

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
      )}

      {/* ── TAB 2: VIEW ENDPOINT CERTIFICATES ──────────────────── */}
      {activeTab === "view" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-48 shrink-0 space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Server Target</label>
                <select
                  value={viewHost}
                  onChange={(e) => setViewHost(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
                >
                  <option value="ALL">All Servers</option>
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
                    {isViewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    {viewHost === "ALL" ? "Search All" : "View File"}
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

          {viewResults.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 px-1">
                <span>Target Path: <strong className="text-indigo-400">{viewPath}</strong></span>
              </div>

              {hasMismatch && (
                <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-bold">Mismatch Detected: Different versions of {viewFileName} exist across the cluster! Check fingerprints.</span>
                </div>
              )}

              {/* Summary Comparison Table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Server</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Expiry Date (GMT)</th>
                      <th className="px-4 py-3">SHA-256 Fingerprint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-mono">
                    {viewResults.map((res) => (
                      <tr key={res.host} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-indigo-400 font-bold">{res.host}</td>
                        <td className="px-4 py-3">
                          {res.status === "FOUND" ? <span className="text-emerald-400">Found</span> : 
                           res.status === "NOT_FOUND" ? <span className="text-slate-500">Not Found</span> : 
                           <span className="text-red-400">Error: {res.error}</span>}
                        </td>
                        <td className="px-4 py-3">{res.expiry || "-"}</td>
                        <td className="px-4 py-3 text-[10px] break-all">{res.fingerprint || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Render Content Blocks for found files */}
              {foundCerts.map((res) => (
                <div key={res.host} className="space-y-2 mt-4">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                    <span className="text-emerald-400">Raw content from <strong>{res.host}</strong></span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all rounded-2xl border border-slate-800 bg-black/50 p-4 text-xs font-mono text-emerald-400 max-h-[380px] overflow-y-auto leading-relaxed">
                    <CopyButton text={res.content || ""} className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer float-right"/>
                    <br/>
                    <p>{res.content}</p>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: GLOBAL INVENTORY ────────────────────────────── */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                  <Server className="h-3 w-3 text-indigo-400" /> Server Target
                </label>
                <select
                  value={scanHost}
                  onChange={(e) => setScanHost(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 font-mono focus:border-indigo-500"
                >
                  <option value="ALL">All Servers (Scan Cluster)</option>
                  {ALLOWED_SERVERS.map((ip) => (
                    <option key={ip} value={ip}>{ip}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleScanServers}
                disabled={isScanning}
                className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-indigo-600/20 transition-all"
              >
                {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {isScanning ? "Scanning..." : "Scan & Build Inventory"}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Pulls real-time expiry dates and SHA-256 fingerprints for all .cer and .pem files in <code className="text-indigo-400">/opt/IBM/EndPoint_Public</code>
            </p>
          </div>

          {scanError && (
            <div className="rounded-xl border border-red-800 bg-red-950/60 p-4 text-xs font-mono text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {scanError}
            </div>
          )}

          {scanResults.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {failedHosts.length > 0 && (
                <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-300">
                  <span className="font-bold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5"/> Failed to connect to some hosts:</span>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    {failedHosts.map(fh => <li key={fh.host} className="font-mono">{fh.host}: {fh.error}</li>)}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Server IP</th>
                        <th className="px-4 py-3">Certificate Name</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Expiry Date (GMT)</th>
                        <th className="px-4 py-3">SHA-256 Fingerprint</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-mono">
                      {flatCerts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500 italic">No certificates found on the scanned hosts.</td>
                        </tr>
                      ) : (
                        flatCerts.map((cert, idx) => {
                          const status = getCertStatus(cert.expiry);
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 text-indigo-400 font-bold whitespace-nowrap">{cert.host}</td>
                              <td className="px-4 py-3 text-slate-200">{cert.name}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider ${status.color}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">{cert.expiry}</td>
                              <td className="px-4 py-3 text-[10px] break-all max-w-[250px]">{cert.fingerprint}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}