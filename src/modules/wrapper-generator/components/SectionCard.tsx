import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export default function SectionCard({ title, subtitle, icon: Icon, className = "", children }: Props) {
  return (
    <div className={`rounded-2xl h-full border border-slate-800 bg-[#0b0f1d] p-6 shadow-xl shadow-black/30 ${className}`}>
      <div className="mb-5 flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-indigo-400" /> : null}
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-200">{title}</p>
      </div>
      {subtitle ? <p className="-mt-4 mb-5 text-xs text-slate-500">{subtitle}</p> : null}
      {children}
    </div>
  );
}
