import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { FileJson, UploadCloud, X } from "lucide-react";

interface Props {
  /** Raw swagger text — either pasted/typed directly, or read from a dropped file. */
  value: string;
  onValueChange: (text: string) => void;
  /** Name of the file the content came from, if any (for logging only). Null if hand-typed/pasted. */
  fileName: string | null;
  onFileNameChange: (name: string | null) => void;
  disabled?: boolean;
}

export default function SwaggerInputPanel({
  value,
  onValueChange,
  fileName,
  onFileNameChange,
  disabled
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  async function loadFile(file: File) {
    setReadError(null);
    try {
      const text = await file.text();
      onValueChange(text);
      onFileNameChange(file.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setReadError(`Could not read "${file.name}": ${message}`);
    }
  }

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) {
      void loadFile(selected);
    }
    // reset so selecting the same file again still fires onChange
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) {
      return;
    }
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      void loadFile(dropped);
    }
  }

  function handleTextareaChange(text: string) {
    onValueChange(text);
    // Once the user edits by hand, the content is no longer strictly "the
    // uploaded file" — clear the filename badge so it doesn't mislead.
    if (fileName) {
      onFileNameChange(null);
    }
  }

  function clearAll() {
    onValueChange("");
    onFileNameChange(null);
    setReadError(null);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">
          Swagger Definition <span className="text-rose-400">*</span>
        </span>
        <div className="flex items-center gap-2">
          {value ? (
            <button
              type="button"
              onClick={clearAll}
              disabled={disabled}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => !disabled && inputRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0f1424] px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Browse File
          </button>
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed transition ${
          disabled ? "opacity-60" : ""
        } ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10"
            : value
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-slate-800 bg-[#0f1424]"
        }`}
      >
        <textarea
          value={value}
          disabled={disabled}
          onChange={(event) => handleTextareaChange(event.target.value)}
          placeholder="Drag & drop your swagger JSON here, or paste raw swagger/OpenAPI content..."
          spellCheck={false}
          className="h-48 w-full resize-y rounded-xl bg-transparent p-3 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json,.yaml,.yml"
        className="hidden"
        onChange={handleSelect}
        disabled={disabled}
      />

      {readError ? <p className="px-1 text-xs text-rose-400">{readError}</p> : null}

      {fileName ? (
        <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
          <FileJson className="h-3.5 w-3.5" />
          Loaded from {fileName} — inserted as-is, content is not auto-rewritten.
        </div>
      ) : value ? (
        <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
          <FileJson className="h-3.5 w-3.5" />
          Pasted content — inserted as-is, not auto-rewritten.
        </div>
      ) : null}
    </div>
  );
}
