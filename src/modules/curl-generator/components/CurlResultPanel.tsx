import { Copy, Terminal } from "lucide-react";
import type { CurlResult } from "../types/CurlGenerator";

interface Props {
  result: CurlResult | null;
}

export default function CurlResultPanel({ result }: Props) {
  if (!result) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-xl shadow-black/30 text-slate-500">
        <p className="text-sm">Generated request output will appear here after you click Generate.</p>
      </div>
    );
  }

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center gap-2 text-slate-200 uppercase tracking-[0.2em] text-xs font-bold">
        <Terminal className="h-4 w-4 text-indigo-400" />
        Generated CURL Output
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>cURL command</span>
            <button onClick={() => copyText(result.curlCommand)} className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{result.curlCommand}</pre>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Access Token</span>
            <button onClick={() => copyText(result.accessToken)} className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{result.accessToken}</pre>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Digital Signature</span>
            <button onClick={() => copyText(result.digiSign)} className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{result.digiSign}</pre>
        </section>
      </div>
    </div>
  );
}
