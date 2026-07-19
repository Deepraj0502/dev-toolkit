import { useState } from "react";
import { Terminal, Play, Loader2 } from "lucide-react";
import type { CurlResult } from "../types/CurlGenerator";
import { ALLOWED_CURL_HOSTS, type ExecuteCurlResponse } from "../types/curlExec";
import { runCurl } from "../engines/runCurl";
import { CopyButton } from "../../../components/CopyButton";

interface Props {
  result: CurlResult | null;
}

function OutputSection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {title}
        </span>
        <CopyButton text={text} />
      </div>
      <pre className="max-h-64 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all text-xs leading-6 text-slate-100 sm:max-h-80">
        {text || "(empty)"}
      </pre>
    </section>
  );
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
      <div className="h-full rounded-2xl border border-slate-800 bg-[#0b0f1d] p-4 shadow-xl shadow-black/30 text-slate-500 sm:rounded-3xl sm:p-6">
        <p className="text-sm">
          Generated request output will appear here after you click Generate.
        </p>
      </div>
    );
  }

  const execute = async () => {
    setRunning(true);
    setExecError(null);
    setExecResult(null);
    try {
      const res = await runCurl({
        command: result.curlCommand,
        targetHost,
        verbose,
        prettyJson,
      });
      setExecResult(res);
    } catch (err) {
      setExecError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full rounded-2xl border border-slate-800 bg-[#0b0f1d] p-4 shadow-xl shadow-black/30 sm:rounded-3xl sm:p-6">
      <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-200">
        <Terminal className="h-4 w-4 shrink-0 text-indigo-400" />
        Generated CURL Output
      </div>

      <div className="space-y-4 sm:space-y-5">
        <OutputSection title="cURL command" text={result.curlCommand} />
        <OutputSection title="Access Token" text={result.accessToken} />
        <OutputSection title="Encrypted Request" text={result.requestValue} />
        <OutputSection title="Digital Signature" text={result.digiSign} />

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            Run on Server
          </div>

          <div className="mb-3 flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <label className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <span className="shrink-0 text-xs uppercase tracking-wide text-slate-400 sm:text-sm sm:normal-case sm:tracking-normal">
                Target server
              </span>
              <select
                value={targetHost}
                onChange={(e) => setTargetHost(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm text-slate-100 sm:w-auto"
              >
                {ALLOWED_CURL_HOSTS.map((ip) => (
                  <option key={ip} value={ip}>
                    {ip}
                  </option>
                ))}
              </select>
            </label>

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
              disabled={running}
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

          {execError && (
            <div className="mb-3 rounded-xl border border-red-800 bg-red-950/60 p-3 text-xs text-red-300">
              {execError}
            </div>
          )}

          {execResult && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span
                  className={
                    execResult.success ? "text-green-400" : "text-red-400"
                  }
                >
                  {execResult.success ? "Success" : "Failed"}
                </span>
                <span className="text-slate-500">
                  exit code: {execResult.exitCode ?? "—"}
                </span>
              </div>

              <div>
                <div className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Response body
                </div>
                <pre className="max-h-60 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-black/30 p-3 text-xs leading-6 text-slate-100 sm:max-h-80">
                  {execResult.prettyOutput ?? execResult.stdout ?? "(empty)"}
                </pre>
              </div>

              {execResult.stderr && (
                <div>
                  <div className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    stderr / verbose trace
                  </div>
                  <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-black/30 p-3 text-xs leading-6 text-amber-200/80 sm:max-h-60">
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
