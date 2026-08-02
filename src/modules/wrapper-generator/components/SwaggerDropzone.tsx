import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { CheckCircle2, FileJson, UploadCloud } from "lucide-react";

interface Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function SwaggerDropzone({ file, onFileChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    onFileChange(selected);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) {
      return;
    }
    const dropped = event.dataTransfer.files?.[0] || null;
    if (dropped) {
      onFileChange(dropped);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-medium text-slate-300">
        Swagger Definition <span className="text-rose-400">*</span>
      </span>

      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        } ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10"
            : file
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-slate-800 bg-[#0f1424] hover:border-slate-700"
        }`}
      >
        {file ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <p className="truncate text-sm font-medium text-slate-100">{file.name}</p>
            <p className="text-xs text-slate-500">Drop a different file, or click to browse</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-indigo-400" />
            <p className="text-sm text-slate-300">Drag & drop your swagger JSON here</p>
            <p className="text-xs text-slate-500">or click to browse</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleSelect}
        disabled={disabled}
      />

      {file ? (
        <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
          <FileJson className="h-3.5 w-3.5" />
          Inserted as-is — content is not auto-rewritten.
        </div>
      ) : null}
    </div>
  );
}
