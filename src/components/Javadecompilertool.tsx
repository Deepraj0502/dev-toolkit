import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LayoutDashboard, UploadCloud, FileArchive, FileCode2, Folder, FolderOpen,
  Loader2, Clipboard, CheckCircle2, Download, Search, AlertTriangle, XCircle, Archive,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type JobStatus = 'idle' | 'uploading' | 'decompiling' | 'ready' | 'error';

interface TreeNode {
  name: string;
  path: string; // full class path, e.g. com/example/Foo.java
  isFile: boolean;
  children: Map<string, TreeNode>;
}

// ============================================================================
// Config — matches the endpoints added to abc.js (combined backend, port 4417)
// ============================================================================

/** Adjust if the decompiler backend runs on a different host/port than this one. */
const DECOMPILE_API_BASE = 'http://10.177.44.29:4417';
const POLL_INTERVAL_MS = 1200;

// ============================================================================
// Pure helpers
// ============================================================================

/** Builds a package/class tree from a flat list of "a/b/Foo.java" paths. */
function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isFile: false, children: new Map() };
  paths.forEach(fullPath => {
    const parts = fullPath.split('/');
    let node = root;
    parts.forEach((part, idx) => {
      const isFile = idx === parts.length - 1;
      const path = parts.slice(0, idx + 1).join('/');
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, path, isFile, children: new Map() });
      }
      node = node.children.get(part)!;
    });
  });
  return root;
}

function filterPaths(paths: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return paths;
  return paths.filter(p => p.toLowerCase().includes(q));
}

function allFolderPaths(node: TreeNode, acc: string[] = []): string[] {
  node.children.forEach(child => {
    if (!child.isFile) {
      acc.push(child.path);
      allFolderPaths(child, acc);
    }
  });
  return acc;
}

// ============================================================================
// API client — matches the reference Express backend (decompile-server.mjs)
// ============================================================================

async function uploadJar(file: File): Promise<{ jobId: string }> {
  const formData = new FormData();
  formData.append('jar', file);
  const res = await fetch(`${DECOMPILE_API_BASE}/decompile-upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Upload failed');
  return res.json();
}

interface StatusResponse {
  status: 'decompiling' | 'ready' | 'error';
  error?: string;
  classes?: string[];
}

async function pollStatus(jobId: string): Promise<StatusResponse> {
  const res = await fetch(`${DECOMPILE_API_BASE}/decompile-status/${jobId}`);
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Status check failed');
  return res.json();
}

async function fetchSource(jobId: string, classPath: string): Promise<string> {
  const res = await fetch(`${DECOMPILE_API_BASE}/decompile-source/${jobId}?path=${encodeURIComponent(classPath)}`);
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not load source');
  return res.text();
}

async function fetchProjectZip(jobId: string): Promise<Blob> {
  const res = await fetch(`${DECOMPILE_API_BASE}/decompile-download/${jobId}`);
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not build zip');
  return res.blob();
}

// ============================================================================
// Tree view
// ============================================================================

function TreeView({
  node, depth, expanded, onToggle, selected, onSelect,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const entries = [...node.children.values()].sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1; // folders first
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      {entries.map(child => {
        const isOpen = expanded.has(child.path);
        if (child.isFile) {
          return (
            <button
              key={child.path}
              onClick={() => onSelect(child.path)}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
              className={`w-full flex items-center gap-2 text-left py-1.5 rounded-lg text-xs font-mono truncate transition-colors ${
                selected === child.path
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
              title={child.path}
            >
              <FileCode2 size={13} className="flex-none" />
              <span className="truncate">{child.name}</span>
            </button>
          );
        }
        return (
          <div key={child.path}>
            <button
              onClick={() => onToggle(child.path)}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
              className="w-full flex items-center gap-2 text-left py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:bg-slate-800/60 transition-colors"
            >
              {isOpen ? <FolderOpen size={13} className="flex-none text-amber-400" /> : <Folder size={13} className="flex-none text-amber-400" />}
              <span className="truncate">{child.name}</span>
            </button>
            {isOpen && (
              <TreeView node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} selected={selected} onSelect={onSelect} />
            )}
          </div>
        );
      })}
    </>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function JavaDecompilerTool({ onBack }: { onBack: () => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classPaths, setClassPaths] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [sourceCache, setSourceCache] = useState<Record<string, string>>({});
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const resetForNewUpload = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setJobId(null);
    setClassPaths([]);
    setSelectedClass(null);
    setSourceCache({});
    setSourceError(null);
    setExpanded(new Set());
    setErrorMessage(null);
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.jar')) {
      setStatus('error');
      setErrorMessage('Only .jar files are supported.');
      return;
    }

    resetForNewUpload();
    setFileName(file.name);
    setStatus('uploading');

    try {
      const { jobId: newJobId } = await uploadJar(file);
      setJobId(newJobId);
      setStatus('decompiling');

      pollRef.current = setInterval(async () => {
        try {
          const result = await pollStatus(newJobId);
          if (result.status === 'ready') {
            if (pollRef.current) clearInterval(pollRef.current);
            setClassPaths(result.classes ?? []);
            setStatus('ready');
          } else if (result.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            setStatus('error');
            setErrorMessage(result.error ?? 'Decompilation failed.');
          }
        } catch (err) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Status check failed.');
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSelectClass = useCallback(async (classPath: string) => {
    setSelectedClass(classPath);
    setSourceError(null);
    if (sourceCache[classPath] !== undefined) return;
    if (!jobId) return;

    setSourceLoading(true);
    try {
      const source = await fetchSource(jobId, classPath);
      setSourceCache(prev => ({ ...prev, [classPath]: source }));
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : 'Could not load source.');
    } finally {
      setSourceLoading(false);
    }
  }, [jobId, sourceCache]);

  const handleCopy = useCallback(() => {
    if (!selectedClass || sourceCache[selectedClass] === undefined) return;
    navigator.clipboard.writeText(sourceCache[selectedClass]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedClass, sourceCache]);

  const handleDownload = useCallback(() => {
    if (!selectedClass || sourceCache[selectedClass] === undefined) return;
    const blob = new Blob([sourceCache[selectedClass]], { type: 'text/x-java-source' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedClass.split('/').pop() ?? 'Source.java';
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedClass, sourceCache]);

  const handleDownloadZip = useCallback(async () => {
    if (!jobId) return;
    setZipping(true);
    setZipError(null);
    try {
      const blob = await fetchProjectZip(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(fileName ?? 'project').replace(/\.jar$/i, '')}-decompiled.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'Could not build zip.');
    } finally {
      setZipping(false);
    }
  }, [jobId, fileName]);

  const filteredPaths = filterPaths(classPaths, search);
  const tree = buildTree(filteredPaths);

  const expandAll = () => setExpanded(new Set(allFolderPaths(tree)));
  const collapseAll = () => setExpanded(new Set());

  const isBusy = status === 'uploading' || status === 'decompiling';

  return (
    <div className="min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] flex flex-col gap-4 sm:gap-6 font-sans">
      <div className="flex-none flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:opacity-75 transition-all">
          <LayoutDashboard size={20} /> Back to Dashboard
        </button>
      </div>

      {status === 'idle' || status === 'error' ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex-1 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".jar"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <UploadCloud size={40} className="text-indigo-500" />
          <p className="font-bold dark:text-white">Drag & drop a .jar file here</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">or click to browse</p>
          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
              <XCircle size={16} className="flex-none" /> {errorMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-hidden min-h-0">
          {/* -------------------- Class tree -------------------- */}
          <div className="lg:w-80 flex-none flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[240px] lg:min-h-0">
            <div className="flex-none p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <FileArchive size={16} className="text-indigo-500 flex-none" />
                <span className="text-sm font-bold dark:text-white truncate" title={fileName ?? undefined}>{fileName}</span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter classes..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 ring-indigo-500 dark:text-white"
                />
              </div>
              {status === 'ready' && (
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{filteredPaths.length} of {classPaths.length} classes</span>
                  <div className="flex gap-2">
                    <button onClick={expandAll} className="hover:text-indigo-500">Expand</button>
                    <button onClick={collapseAll} className="hover:text-indigo-500">Collapse</button>
                  </div>
                </div>
              )}
              {status === 'ready' && (
                <button
                  onClick={handleDownloadZip}
                  disabled={zipping}
                  className="w-full mt-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {zipping ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
                  {zipping ? 'Building zip…' : 'Download Project as ZIP'}
                </button>
              )}
              {zipError && (
                <p className="mt-2 text-[11px] text-red-500">{zipError}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {isBusy && (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 py-10">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                  <p className="text-xs">{status === 'uploading' ? 'Uploading jar…' : 'Decompiling classes…'}</p>
                </div>
              )}
              {status === 'ready' && (
                <TreeView node={tree} depth={0} expanded={expanded} onToggle={p => setExpanded(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; })} selected={selectedClass} onSelect={handleSelectClass} />
              )}
            </div>
          </div>

          {/* -------------------- Source viewer -------------------- */}
          <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden min-h-[300px]">
            <div className="flex-none p-3 sm:p-4 bg-slate-900 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-mono text-slate-400 truncate">{selectedClass ?? 'No class selected'}</span>
              {selectedClass && sourceCache[selectedClass] !== undefined && (
                <div className="flex items-center gap-3 flex-none">
                  <button onClick={handleCopy} className={`text-xs font-bold flex items-center gap-1.5 ${copied ? 'text-emerald-400' : 'text-indigo-400 hover:text-indigo-300'}`}>
                    {copied ? <CheckCircle2 size={14} /> : <Clipboard size={14} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={handleDownload} className="text-xs font-bold flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300">
                    <Download size={14} /> .java
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed custom-scrollbar">
              {!selectedClass && (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 italic gap-2">
                  <FileCode2 size={32} className="opacity-10" />
                  <p className="text-xs">Select a class to view its decompiled source.</p>
                </div>
              )}
              {selectedClass && sourceLoading && (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                  <p className="text-xs">Decompiling {selectedClass.split('/').pop()}…</p>
                </div>
              )}
              {selectedClass && sourceError && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="flex-none mt-0.5" /> {sourceError}
                </div>
              )}
              {selectedClass && !sourceLoading && !sourceError && sourceCache[selectedClass] !== undefined && (
                <pre className="text-slate-200 whitespace-pre">{sourceCache[selectedClass]}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}