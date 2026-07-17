import { useCallback, useRef, useState } from "react";
import { UploadCloud, File as FileIcon, CheckCircle2, XCircle, Loader2, X } from "lucide-react";

// ── Config ──────────────────────────────────────────────────────
// Point this at wherever abc.js is running (see notes below on keeping it alive).
const SFTP_UPLOAD_URL = "http://10.177.44.29:4417/sftp-upload";

type FileStatus = "queued" | "uploading" | "success" | "error";

interface QueuedFile {
  id: string;
  file: File;
  status: FileStatus;
  message?: string;
}

export default function SftpUpload() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [targetDir, setTargetDir] = useState("/tmp/");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const next: QueuedFile[] = Array.from(incoming).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: "queued",
    }));
    setFiles((prev) => [...prev, ...next]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadOne = async (item: QueuedFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", message: undefined } : f))
    );

    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("targetDir", targetDir);

    try {
      const res = await fetch(SFTP_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "success", message: data.message } : f
        )
      );
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: "error", message: err instanceof Error ? err.message : "Upload failed" }
            : f
        )
      );
    }
  };

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "queued" || f.status === "error");
    // Backend handles one file per request, so send sequentially.
    for (const item of pending) {
      await uploadOne(item);
    }
  };

  const hasQueued = files.some((f) => f.status === "queued" || f.status === "error");

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target directory</label>
        <input
          type="text"
          value={targetDir}
          onChange={(e) => setTargetDir(e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          placeholder="/tmp/"
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        }`}
      >
        <UploadCloud className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Drag & drop files here, or <span className="text-blue-600 dark:text-blue-400 font-medium">browse</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <span className="truncate text-gray-900 dark:text-gray-100">{f.file.name}</span>
                <span className="text-gray-400 dark:text-gray-500 shrink-0">
                  ({(f.file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {f.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-400" />}
                {f.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />}
                {f.status === "error" && (
                  <span title={f.message}>
                    <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                  </span>
                )}
                {f.status !== "uploading" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(f.id);
                    }}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={uploadAll}
        disabled={!hasQueued}
        className="w-full rounded-md bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors"
      >
        Send to SFTP
      </button>
    </div>
  );
}
