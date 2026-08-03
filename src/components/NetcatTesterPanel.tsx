import { useState } from "react";
import { Terminal, Send, Server, Network, Activity, AlertTriangle, Loader2, Clock } from "lucide-react";
import { CopyButton } from "./CopyButton";

const BACKEND_URL = "http://10.177.44.29:4417";
const ALLOWED_SERVERS = [
  "10.177.44.21",
  "10.177.44.22",
  "10.177.44.23",
  "10.177.44.25",
  "10.177.44.26",
  "10.177.44.27",
];

export default function NetcatTesterPanel() {
  const [jumpHost, setJumpHost] = useState(ALLOWED_SERVERS[3]);
  const [destIp, setDestIp] = useState("");
  const [destPort, setDestPort] = useState("");
  const [payload, setPayload] = useState("");
  const [delayMs, setDelayMs] = useState(1500); // New state for injection delay
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!destIp || !destPort) {
      setErrorMsg("Destination IP and Port are required.");
      return;
    }

    setIsExecuting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/run-nc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jumpHost,
          destIp: destIp.trim(),
          destPort: destPort.trim(),
          payload,
          delayMs, // Send delay to backend
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute nc command");

      setResult({
        stdout: data.stdout,
        stderr: data.stderr,
        exitCode: data.exitCode,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-2xl text-slate-100 space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
        <Network className="h-6 w-6 text-indigo-400" />
        <h2 className="text-lg font-bold tracking-wide uppercase font-mono">Netcat (TCP) Server Tester</h2>
      </div>

      <div className="space-y-6">
        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-indigo-400" /> Jump Server
            </label>
            <select
              value={jumpHost}
              onChange={(e) => setJumpHost(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {ALLOWED_SERVERS.map((ip) => (
                <option key={ip} value={ip}>{ip}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-indigo-400" /> Dest IP
            </label>
            <input
              type="text"
              value={destIp}
              onChange={(e) => setDestIp(e.target.value)}
              placeholder="10.150.22.4"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-indigo-400" /> Port
            </label>
            <input
              type="number"
              value={destPort}
              onChange={(e) => setDestPort(e.target.value)}
              placeholder="8080"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5" title="Time to wait for server prompt before sending payload">
              <Clock className="h-3.5 w-3.5 text-indigo-400" /> Wait Time
            </label>
            <select
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value={500}>500 ms (Fast)</option>
              <option value={1000}>1.0 Sec</option>
              <option value={1500}>1.5 Sec (Default)</option>
              <option value={3000}>3.0 Sec (Slow)</option>
            </select>
          </div>
        </div>

        {/* Payload Input */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-indigo-400" /> Input Payload String
          </label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="Enter the payload. The tool will connect, wait for the server prompt, and automatically inject this data."
            rows={4}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-y"
          />
        </div>

        <button
          onClick={handleExecute}
          disabled={isExecuting || !destIp || !destPort}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 transition-all"
        >
          {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
          {isExecuting ? "Connecting and waiting for prompt..." : "Execute Netcat Test"}
        </button>

        {/* Error Banner */}
        {errorMsg && (
          <div className="rounded-xl border border-red-800/80 bg-red-950/50 p-3.5 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Results Output Console */}
        {result && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span>Origin: <strong className="text-indigo-400">{jumpHost}</strong></span>
              <span className={result.exitCode === 0 ? "text-emerald-400" : "text-amber-400"}>
                Process Exit Code: {result.exitCode}
              </span>
            </div>
            
            <div className="rounded-2xl border border-slate-800 bg-black/80 p-4 relative overflow-hidden">
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                {(result.stdout || result.stderr) && (
                  <CopyButton text={`${result.stderr}\n${result.stdout}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors" />
                )}
              </div>
              
              <pre className="whitespace-pre-wrap break-all text-xs font-mono max-h-[400px] overflow-y-auto leading-relaxed pt-8 lg:pt-0">
                {/* Netcat connection logs output to stderr in verbose mode */}
                {result.stderr && (
                  <div className="text-slate-400 mb-2 italic">
                    {result.stderr}
                  </div>
                )}
                
                {/* The actual server response outputs to stdout */}
                {result.stdout ? (
                  <div className="text-emerald-400">
                    {result.stdout}
                  </div>
                ) : (
                  !result.stderr && <div className="text-slate-600 italic">No output returned from server.</div>
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
