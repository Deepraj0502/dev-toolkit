import React, { useState, useEffect } from "react";
import {
  parseServerOctets,
  extractFromSqlInserts,
  type ServerTarget,
  type CacheEntry,
  type ServerExecutionResult,
  type HistoryRecord,
} from "../types/cacheTypes";
import {
  Plus,
  Trash2,
  Play,
  Database,
  History,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { CopyButton } from "./CopyButton";
import { CacheOnDBPanel } from "./CacheOnDBPanel";

interface CacheManagerProps {
  onBack?: () => void;
}

export const CacheManager: React.FC<CacheManagerProps> = ({ onBack }) => {
  const SUBNET_BASE = "10.177.44";
  const [port, setPort] = useState("8002");

  const [featureTab, setFeatureTab] = useState<"LOAD_CACHE" | "CACHE_ON_DB">(
    "LOAD_CACHE",
  );

  // IP Target Mode: Single IP vs IP Range
  const [ipMode, setIpMode] = useState<"single" | "range">("single");
  const [singleIp, setSingleIp] = useState("21");
  const [rangeIp, setRangeIp] = useState("25-27, 32-34");

  const [method, setMethod] = useState<"POST" | "GET">("POST");
  const [entries, setEntries] = useState<CacheEntry[]>([
    { id: "1", FIELD_NAME: "", FIELD_VALUE: "" },
  ]);
  const [sqlInput, setSqlInput] = useState("");
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ServerExecutionResult[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const activeTargetInput = ipMode === "single" ? singleIp : rangeIp;

  useEffect(() => {
    const saved = localStorage.getItem("DEVTOOL_CACHE_HISTORY");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (rec: HistoryRecord) => {
    const updated = [rec, ...history.slice(0, 49)];
    setHistory(updated);
    localStorage.setItem("DEVTOOL_CACHE_HISTORY", JSON.stringify(updated));
  };

  const addEntryRow = () => {
    setEntries([
      ...entries,
      { id: crypto.randomUUID(), FIELD_NAME: "", FIELD_VALUE: "" },
    ]);
  };

  const updateEntry = (
    id: string,
    key: "FIELD_NAME" | "FIELD_VALUE",
    val: string,
  ) => {
    setEntries(
      entries.map((item) => (item.id === id ? { ...item, [key]: val } : item)),
    );
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter((item) => item.id !== id));
    } else {
      setEntries([
        { id: crypto.randomUUID(), FIELD_NAME: "", FIELD_VALUE: "" },
      ]);
    }
  };

  const handleImportSql = () => {
    const extracted = extractFromSqlInserts(sqlInput);
    if (extracted.length > 0) {
      setEntries(extracted);
      setShowSqlModal(false);
      setSqlInput("");
    } else {
      alert(
        "No CACHE_DETAILS table insert statements found with FIELD_NAME and FIELD_VALUE.",
      );
    }
  };

  const executeCacheSync = async () => {
    const targets: ServerTarget[] = parseServerOctets(
      SUBNET_BASE,
      activeTargetInput,
      port,
    );
    if (targets.length === 0) {
      alert("Invalid server targets provided.");
      return;
    }

    const validEntries = entries.filter((e) => e.FIELD_NAME.trim() !== "");
    if (validEntries.length === 0) {
      alert("Please provide at least one valid FIELD_NAME.");
      return;
    }

    setIsRunning(true);
    setResults([]);
    setConsoleLogs([
      `[INFO] Starting cache ${method} over ${targets.length} node(s)...`,
    ]);

    const activeResults: ServerExecutionResult[] = targets.map((t) => ({
      server: `${t.ip}:${t.port}`,
      status: "PENDING",
    }));
    setResults([...activeResults]);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const targetLabel = `${target.ip}:${target.port}`;
      const startTime = performance.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        let response: Response;

        if (method === "POST") {
          const payload = validEntries.map((e) => ({
            FIELD_NAME: e.FIELD_NAME.trim(),
            FIELD_VALUE: e.FIELD_VALUE.trim(),
          }));

          response = await fetch(target.fullUrl("/cache/v1/loadCache"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        } else {
          const queryField = encodeURIComponent(
            validEntries[0].FIELD_NAME.trim(),
          );
          response = await fetch(
            target.fullUrl(`/cache/v1/loadCache?FIELD_NAME=${queryField}`),
            {
              method: "GET",
              signal: controller.signal,
            },
          );
        }

        clearTimeout(timeoutId);
        const duration = Math.round(performance.now() - startTime);

        if (response.ok) {
          activeResults[i] = {
            server: targetLabel,
            status: "SUCCESS",
            statusCode: response.status,
            durationMs: duration,
          };
          successCount++;
          setConsoleLogs((prev) => [
            ...prev,
            `[200 OK] ${targetLabel} (${duration}ms)`,
          ]);
        } else {
          activeResults[i] = {
            server: targetLabel,
            status: "ERROR",
            statusCode: response.status,
            durationMs: duration,
            message: `HTTP ${response.status}`,
          };
          failCount++;
          setConsoleLogs((prev) => [
            ...prev,
            `[ERR ${response.status}] ${targetLabel} failed.`,
          ]);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        const duration = Math.round(performance.now() - startTime);

        if (err.name === "AbortError") {
          activeResults[i] = {
            server: targetLabel,
            status: "TIMEOUT",
            durationMs: duration,
            message: "Timed out (5s)",
          };
          failCount++;
          setConsoleLogs((prev) => [
            ...prev,
            `[TIMEOUT] ${targetLabel} unreachable after 5000ms.`,
          ]);
        } else {
          activeResults[i] = {
            server: targetLabel,
            status: "ERROR",
            durationMs: duration,
            message: err.message || "Network Error",
          };
          failCount++;
          setConsoleLogs((prev) => [
            ...prev,
            `[NET_FAIL] ${targetLabel}: ${err.message}`,
          ]);
        }
      }

      setResults([...activeResults]);
    }

    setIsRunning(false);
    setConsoleLogs((prev) => [
      ...prev,
      `[COMPLETE] Execution ended. Successful: ${successCount}, Failed/Timed-out: ${failCount}`,
    ]);

    saveToHistory({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      method,
      serverRange: activeTargetInput,
      entries: validEntries,
      successCount,
      failureCount: failCount,
    });
  };

  const generateCurlPreview = () => {
    const payload = entries.map((e) => ({
      FIELD_NAME: e.FIELD_NAME,
      FIELD_VALUE: e.FIELD_VALUE,
    }));
    const serverSegment = ipMode === "single" ? singleIp : `[${rangeIp}]`;
    if (method === "POST") {
      return `curl -kX POST "http://${SUBNET_BASE}.${serverSegment}:${port}/cache/v1/loadCache" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(payload, null, 2)}'`;
    }
    const sampleField = entries[0]?.FIELD_NAME || "FIELD_NAME_PARAM";
    return `curl -kX GET "http://${SUBNET_BASE}.${serverSegment}:${port}/cache/v1/loadCache?FIELD_NAME=${encodeURIComponent(sampleField)}"`;
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Header and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="text-emerald-400 h-6 w-6" /> Cache Server
              Manager
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Broadcast cache updates or retrieve keys across individual or
              clustered IP hosts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSqlModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <Database className="h-4 w-4 text-sky-400" /> Import SQL Insert
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <History className="h-4 w-4 text-amber-400" /> History (
            {history.length})
          </button>
          {/* Top Feature Switcher Pills */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 py-2">
            <button
              type="button"
              onClick={() => setFeatureTab("LOAD_CACHE")}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                featureTab === "LOAD_CACHE"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Load / Query Cache
            </button>
            <button
              type="button"
              onClick={() => setFeatureTab("CACHE_ON_DB")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                featureTab === "CACHE_ON_DB"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database className="h-3.5 w-3.5" /> Cache On DB
            </button>
          </div>
        </div>
      </div>

      {/* Render Active View */}
      {featureTab === "LOAD_CACHE" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Target Config */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg backdrop-blur">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Server Target Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Target Mode Dropdown */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Target Mode
                  </label>
                  <select
                    value={ipMode}
                    onChange={(e) =>
                      setIpMode(e.target.value as "single" | "range")
                    }
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition cursor-pointer"
                  >
                    <option value="single">Single IP</option>
                    <option value="range">Range / Multiple IPs</option>
                  </select>
                </div>

                {/* IP Input */}
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {ipMode === "single"
                      ? "Target Server"
                      : "Server Ranges (Servers)"}
                  </label>
                  {ipMode === "single" ? (
                    <input
                      type="text"
                      value={singleIp}
                      onChange={(e) => setSingleIp(e.target.value)}
                      placeholder="21"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-mono text-emerald-300 outline-none transition"
                    />
                  ) : (
                    <input
                      type="text"
                      value={rangeIp}
                      onChange={(e) => setRangeIp(e.target.value)}
                      placeholder="25-27, 32-34"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-mono text-emerald-300 outline-none transition"
                    />
                  )}
                </div>

                {/* Port */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-400">Operation:</span>
                <button
                  type="button"
                  onClick={() => setMethod("POST")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    method === "POST"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  POST (Insert / Update)
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("GET")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    method === "GET"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  GET (Fetch Key)
                </button>
              </div>
            </div>

            {/* Key-Value Editor */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg backdrop-blur flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Cache Fields ({entries.length})
                </h2>
                {method === "POST" && (
                  <button
                    type="button"
                    onClick={addEntryRow}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Field
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {entries.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={item.FIELD_NAME}
                      onChange={(e) =>
                        updateEntry(item.id, "FIELD_NAME", e.target.value)
                      }
                      placeholder="FIELD_NAME"
                      className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none transition"
                    />
                    {method === "POST" && (
                      <input
                        type="text"
                        value={item.FIELD_VALUE}
                        onChange={(e) =>
                          updateEntry(item.id, "FIELD_VALUE", e.target.value)
                        }
                        placeholder="FIELD_VALUE"
                        className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none transition"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeEntry(item.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={executeCacheSync}
                  disabled={isRunning}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    isRunning
                      ? "bg-slate-800 text-slate-500 !cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                  }`}
                >
                  {isRunning ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 fill-white" />
                  )}
                  {isRunning ? "Firing Requests..." : "Trigger Cache Sync"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Target Cluster Status */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg backdrop-blur">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Server Matrix
              </h2>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {results.length === 0 ? (
                  <div className="col-span-2 text-center text-xs text-slate-500 py-6">
                    Ready to execute target requests
                  </div>
                ) : (
                  results.map((res, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono ${
                        res.status === "SUCCESS"
                          ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-300"
                          : res.status === "TIMEOUT"
                            ? "bg-amber-950/20 border-amber-900/50 text-amber-300"
                            : res.status === "ERROR"
                              ? "bg-rose-950/20 border-rose-900/50 text-rose-300"
                              : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span>{res.server}</span>
                      <span className="flex items-center gap-1">
                        {res.status === "SUCCESS" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        {res.status === "TIMEOUT" && (
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                        )}
                        {res.status === "ERROR" && (
                          <XCircle className="h-3.5 w-3.5 text-rose-400" />
                        )}
                        {res.status === "PENDING" && (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
                        )}
                        {res.durationMs ? `${res.durationMs}ms` : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Realtime Output Console */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 shadow-xl flex-1 flex flex-col font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Console
                  Output
                </span>
                <button
                  type="button"
                  onClick={() => setConsoleLogs([])}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 text-xs text-slate-300 max-h-56">
                {consoleLogs.length === 0 ? (
                  <div className="text-slate-600 italic">
                    No execution logs yet.
                  </div>
                ) : (
                  consoleLogs.map((log, i) => <div key={i}>{log}</div>)
                )}
              </div>
            </div>

            {/* Generated Curl Preview with CopyButton */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-xs font-mono">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">cURL Equivalent</span>
                <CopyButton text={generateCurlPreview()} />
              </div>
              <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap break-all bg-slate-950 p-3 rounded border border-slate-800">
                {generateCurlPreview()}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <CacheOnDBPanel />
      )}

      {/* SQL Import Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Extract Cache from SQL Inserts
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Paste raw SQL inserts for table <code>CACHE_DETAILS</code>. The
              extractor will isolate <code>FIELD_NAME</code> and{" "}
              <code>FIELD_VALUE</code>.
            </p>
            <textarea
              rows={8}
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder="Insert into EISAPP.CACHE_DETAILS (FIELD_NAME,FIELD_VALUE,...) values ('KEY','VAL',...);"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSql}
                className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition cursor-pointer"
              >
                Extract & Populate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Saved Cache History
            </h3>
            <div className="max-h-80 overflow-y-auto space-y-3 pr-1 my-4">
              {history.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-6">
                  No previous executions found.
                </div>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        {h.method} &bull; Target: {h.serverRange}
                      </div>
                      <div className="text-slate-500 mt-1">
                        {h.timestamp} &bull; {h.entries.length} field(s) &bull;{" "}
                        <span className="text-emerald-400">
                          {h.successCount} passed
                        </span>
                        ,{" "}
                        <span className="text-rose-400">
                          {h.failureCount} failed
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEntries(h.entries);
                        if (
                          h.serverRange.includes("-") ||
                          h.serverRange.includes(",")
                        ) {
                          setIpMode("range");
                          setRangeIp(h.serverRange);
                        } else {
                          setIpMode("single");
                          setSingleIp(h.serverRange);
                        }
                        setMethod(h.method);
                        setShowHistoryModal(false);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
                    >
                      Load Config
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
