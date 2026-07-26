import React, { useState } from 'react';
import { UploadCloud, FileCode, CheckCircle, X } from 'lucide-react';

interface FileDropzoneProps {
  label: string;
  accept: string;
  value: string;
  fileName: string;
  placeholder: string;
  onFileSelect: (content: string, name: string) => void;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

export default function FileDropzone({
  label,
  accept,
  value,
  fileName,
  placeholder,
  onFileSelect,
  onChangeText,
  onClear
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) onFileSelect(content, file.name);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {fileName && (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-1 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <CheckCircle size={12} />
            <span className="truncate max-w-[150px] sm:max-w-[220px]">{fileName}</span>
            <button onClick={onClear} className="hover:text-rose-500 transition-colors ml-1" title="Clear file">
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 overflow-hidden flex flex-col ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99] shadow-lg shadow-indigo-500/10'
            : 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-400 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 gap-3 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
            <UploadCloud size={18} className="text-indigo-500 shrink-0" />
            <span>Drag & drop file here, or browse</span>
          </div>
          
          <label className="w-full sm:w-auto text-center px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer shadow-sm transition-all shrink-0">
            <FileCode size={14} className="inline mr-1.5 -mt-0.5 text-indigo-500" />
            Browse File
            <input type="file" className="hidden" accept={accept} onChange={handleFileInput} />
          </label>
        </div>

        {/* Live Textarea Editor */}
        <textarea
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          className="w-full h-36 sm:h-44 p-3.5 bg-transparent text-xs font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none resize-y"
          spellCheck={false}
        />
      </div>
    </div>
  );
}