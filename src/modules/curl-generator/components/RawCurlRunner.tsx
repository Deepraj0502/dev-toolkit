import { useState } from "react";
import { Play, Loader2, Terminal } from "lucide-react";
import { ALLOWED_CURL_HOSTS, type ExecuteCurlResponse } from "../types/curlExec";
import { runCurl } from "../engines/runCurl";

export default function RawCurlRunner() {
  const [command, setCommand] = useState("");
  const [targetHost, setTargetHost] = useState<string>(ALLOWED_CURL_HOSTS[0]);
  const [verbose, setVerbose] = useState(false);
  const [prettyJson, setPrettyJson] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecuteCurlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    if (!command.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await runCurl({ command, targetHost, verbose, prettyJson });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center gap-2 text-slate-200 uppercase tracking-[0.2em] text-xs font-bold">
        <Terminal className="h-4 w-4 text-indigo-400" />
        Raw Curl Runner
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] mb-4">
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={`curl -X GET "http://${ALLOWED_CURL_HOSTS[0]}/health"`}
          rows={6}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex flex-col gap-2 min-w-[160px]">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">SSH into (run curl on)</label>
          <select
            value={targetHost}
            onChange={(e) => setTargetHost(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm text-slate-100"
          >
            {ALLOWED_CURL_HOSTS.map((ip) => (
              <option key={ip} value={ip}>
                {ip}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 leading-4">
            This is only the SSH destination. The curl command's own URL is sent as-is and can point anywhere.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-slate-300">
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
          disabled={running || !command.trim()}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Running..." : "Execute"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/60 p-3 text-xs text-red-300 mb-3">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs">
            <span className={result.success ? "text-green-400" : "text-red-400"}>
              {result.success ? "Success" : "Failed"}
            </span>
            <span className="text-slate-500">exit code: {result.exitCode ?? "—"}</span>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">Response body</div>
            <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-100 max-h-80 overflow-y-auto bg-black/30 rounded-xl p-3">
              {result.prettyOutput ?? result.stdout ?? "(empty)"}
            </pre>
          </div>

          {result.stderr && (
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">stderr / verbose trace</div>
              <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-amber-200/80 max-h-60 overflow-y-auto bg-black/30 rounded-xl p-3">
                {result.stderr}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
