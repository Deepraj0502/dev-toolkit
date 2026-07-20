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
    <div className="rounded-2xl border border-slate-800 bg-[#0b0f1d] p-4 shadow-xl shadow-black/30 sm:rounded-3xl sm:p-6">
      <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-200">
        <Terminal className="h-4 w-4 shrink-0 text-indigo-400" />
        Raw Curl Runner
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={`curl -X GET "http://${ALLOWED_CURL_HOSTS[0]}/health"`}
          rows={6}
          className="min-h-[140px] w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:min-h-[160px]"
        />

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
            SSH into (run curl on)
          </label>
          <select
            value={targetHost}
            onChange={(e) => setTargetHost(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm text-slate-100"
          >
            {ALLOWED_CURL_HOSTS.map((ip) => (
              <option key={ip} value={ip}>
                {ip}
              </option>
            ))}
          </select>
          <p className="text-[10px] leading-4 text-slate-500">
            This is only the SSH destination. The curl command's own URL is sent
            as-is and can point anywhere.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={verbose}
            onChange={(e) => setVerbose(e.target.checked)}
          />
          -v (verbose)
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={prettyJson}
            onChange={(e) => setPrettyJson(e.target.checked)}
          />
          Pretty-print JSON
        </label>
        <button
          onClick={execute}
          disabled={running || !command.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-700 sm:ml-auto sm:w-auto sm:py-1.5"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {running ? "Running..." : "Execute"}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-800 bg-red-950/60 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className={result.success ? "text-green-400" : "text-red-400"}>
              {result.success ? "Success" : "Failed"}
            </span>
            <span className="text-slate-500">
              exit code: {result.exitCode ?? "—"}
            </span>
          </div>

          <div>
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">
              Response body
            </div>
            <pre className="max-h-60 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-black/30 p-3 text-xs leading-6 text-slate-100 sm:max-h-80">
              {result.prettyOutput ?? result.stdout ?? "(empty)"}
            </pre>
          </div>

          {result.stderr && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                stderr / verbose trace
              </div>
              <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-black/30 p-3 text-xs leading-6 text-amber-200/80 sm:max-h-60">
                {result.stderr}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
