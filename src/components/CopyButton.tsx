import { Copy, Check } from "lucide-react";
import { useClipboard } from "../hooks/useClipboard";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ 
  text, 
  label = "Copy", 
  className = "inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer" 
}: CopyButtonProps) {
  const { copied, copy } = useClipboard({ timeout: 2000 });

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={`${className} ${copied ? "!bg-emerald-950/80 !text-emerald-300" : ""}`}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400 animate-in zoom-in duration-150" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}