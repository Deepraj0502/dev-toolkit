import type { ChangeEvent } from "react";

interface Props {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  multiline?: boolean;
  required?: boolean;
  prefix?: string;
}

export default function FormField({ label, placeholder, value, onChange, multiline, required, prefix }: Props) {
  const baseInputClasses =
    "w-full rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-slate-300">
        {label} {required ? <span className="text-rose-400">*</span> : null}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          className={`${baseInputClasses} resize-none`}
        />
      ) : prefix ? (
        <div className="flex overflow-hidden rounded-xl border border-slate-800 bg-[#0f1424] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <span className="flex items-center border-r border-slate-800 bg-[#141a2e] px-3 text-sm text-slate-500">
            {prefix}
          </span>
          <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
          />
        </div>
      ) : (
        <input value={value} onChange={onChange} placeholder={placeholder} className={baseInputClasses} />
      )}
    </label>
  );
}
