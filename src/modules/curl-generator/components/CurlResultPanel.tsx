import { useState } from "react";
import { Copy, Terminal, Play, Loader2 } from "lucide-react";
import type { CurlResult } from "../types/CurlGenerator";
import { ALLOWED_CURL_HOSTS, type ExecuteCurlResponse } from "../types/curlExec";
import { runCurl } from "../engines/runCurl";
import { CopyButton } from "../../../components/CopyButton";

interface Props {
  result: CurlResult | null;
}

export default function CurlResultPanel({ result }: Props) {
  const [targetHost, setTargetHost] = useState<string>(ALLOWED_CURL_HOSTS[0]);
  const [verbose, setVerbose] = useState(false);
  const [prettyJson, setPrettyJson] = useState(true);
  const [running, setRunning] = useState(false);
  const [execResult, setExecResult] = useState<ExecuteCurlResponse | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  if (!result) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-xl shadow-black/30 text-slate-500 h-full">
        <p className="text-sm">Generated request output will appear here after you click Generate.</p>
      </div>
    );
  }

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const execute = async () => {
    setRunning(true);
    setExecError(null);
    setExecResult(null);
    try {
      const res = await runCurl({ command: result.curlCommand, targetHost, verbose, prettyJson });
      setExecResult(res);
    } catch (err) {
      setExecError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-xl shadow-black/30 h-full">
      <div className="mb-5 flex items-center gap-2 text-slate-200 uppercase tracking-[0.2em] text-xs font-bold">
        <Terminal className="h-4 w-4 text-indigo-400" />
        Generated CURL Output
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>cURL command</span>
            <CopyButton text={result.curlCommand} />
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{result.curlCommand}</pre>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Access Token</span>
            <CopyButton text={result.accessToken} />
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{result.accessToken}</pre>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Encrypted Request</span>
            <CopyButton text={result.requestValue} />
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{result.requestValue}</pre>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Digital Signature</span>
            <CopyButton text={result.digiSign} />
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{result.digiSign}</pre>
        </section>

        {/* ── Run on Server ───────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Run on Server</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-slate-300">
            <label className="flex items-center gap-2">
              Target server
              <select
                value={targetHost}
                onChange={(e) => setTargetHost(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              >
                {ALLOWED_CURL_HOSTS.map((ip) => (
                  <option key={ip} value={ip}>
                    {ip}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={verbose} onChange={(e) => setVerbose(e.target.checked)} />
              -v (verbose)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={prettyJson} onChange={(e) => setPrettyJson(e.target.checked)} />
              Pretty-print JSON
            </label>
            <button
              onClick={execute}
              disabled={running}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {running ? "Running..." : "Execute"}
            </button>
          </div>

          {execError && (
            <div className="rounded-xl border border-red-800 bg-red-950/60 p-3 text-xs text-red-300 mb-3">
              {execError}
            </div>
          )}

          {execResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <span className={execResult.success ? "text-green-400" : "text-red-400"}>
                  {execResult.success ? "Success" : "Failed"}
                </span>
                <span className="text-slate-500">exit code: {execResult.exitCode ?? "—"}</span>
              </div>

              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">Response body</div>
                <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-100 max-h-80 overflow-y-auto bg-black/30 rounded-xl p-3">
                  {execResult.prettyOutput ?? execResult.stdout ?? "(empty)"}
                </pre>
              </div>

              {execResult.stderr && (
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">stderr / verbose trace</div>
                  <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-amber-200/80 max-h-60 overflow-y-auto bg-black/30 rounded-xl p-3">
                    {execResult.stderr}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
