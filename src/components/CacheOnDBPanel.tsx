import React, { useState } from 'react';
import { 
  Database, RefreshCw, CheckCircle2, XCircle, Clock, 
  Terminal, ShieldCheck, Server 
} from 'lucide-react';
import { CopyButton } from './CopyButton';

interface ServerCardState {
  status: 'IDLE' | 'LOADING' | 'SUCCESS' | 'TIMEOUT' | 'ERROR';
  durationMs?: number;
  message?: string;
  data?: any;
}

export const CacheOnDBPanel: React.FC = () => {
  const SUBNET_BASE = '10.177.44';
  const PORT = '8002';

  // DEV range: 21, 22, 23, 25, 26, 27
  const DEV_SERVERS = [21, 22, 23, 25, 26, 27];
  
  // PREPROD (STUB) range: 80 to 109
  const PREPROD_SERVERS = Array.from({ length: 109 - 80 + 1 }, (_, i) => 80 + i);

  const [activeTab, setActiveTab] = useState<'DEV' | 'PREPROD'>('DEV');
  const [serverStates, setServerStates] = useState<Record<number, ServerCardState>>({});
  const [selectedResult, setSelectedResult] = useState<{ octet: number; res: ServerCardState } | null>(null);

  const handleHitCacheOnDb = async (octet: number) => {
    // Set node loading
    setServerStates((prev) => ({
      ...prev,
      [octet]: { status: 'LOADING' },
    }));

    try {
      const response = await fetch('/api/cache/db-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subnet: SUBNET_BASE,
          octet,
          port: PORT,
        }),
      });

      const resData = await response.json();

      const updatedState: ServerCardState = {
        status: resData.status,
        durationMs: resData.durationMs,
        message: resData.message,
        data: resData.data,
      };

      setServerStates((prev) => ({
        ...prev,
        [octet]: updatedState,
      }));

      setSelectedResult({ octet, res: updatedState });
    } catch (err: any) {
      const errState: ServerCardState = {
        status: 'ERROR',
        message: err.message || 'Network call failed',
      };
      setServerStates((prev) => ({
        ...prev,
        [octet]: errState,
      }));
      setSelectedResult({ octet, res: errState });
    }
  };

  const currentServers = activeTab === 'DEV' ? DEV_SERVERS : PREPROD_SERVERS;

  const getCurlCmd = (octet: number) => 
    `curl --location 'http://${SUBNET_BASE}.${octet}:${PORT}/cacheOnDB' \\\n  -H "Content-Type: application/json" \\\n  -d '{"UPDATE":"Y"}'`;

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Switcher & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('DEV')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition cursor-pointer ${
              activeTab === 'DEV'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="h-4 w-4" /> DEV Servers ({DEV_SERVERS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PREPROD')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition cursor-pointer ${
              activeTab === 'PREPROD'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> PREPROD (STUB) ({PREPROD_SERVERS.length})
          </button>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Target URL: <span className="text-emerald-400">http://{SUBNET_BASE}.X:{PORT}/cacheOnDB</span>
        </span>
      </div>

      {/* Grid of Server Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[480px] overflow-y-auto p-1">
        {currentServers.map((octet) => {
          const state = serverStates[octet] || { status: 'IDLE' };
          const isLoading = state.status === 'LOADING';
          const isSelected = selectedResult?.octet === octet;

          return (
            <div
              key={octet}
              onClick={() => !isLoading && handleHitCacheOnDb(octet)}
              className={`p-3.5 rounded-xl border font-mono text-xs transition duration-150 flex flex-col justify-between select-none relative group ${
                isLoading
                  ? 'bg-slate-900/80 border-slate-700 cursor-wait'
                  : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
              } ${
                isSelected ? 'ring-2 ring-emerald-400' : ''
              } ${
                state.status === 'SUCCESS'
                  ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200 hover:border-emerald-500'
                  : state.status === 'TIMEOUT'
                  ? 'bg-amber-950/30 border-amber-800/80 text-amber-200 hover:border-amber-500'
                  : state.status === 'ERROR'
                  ? 'bg-rose-950/30 border-rose-800/80 text-rose-200 hover:border-rose-500'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400">Node</span>
                <span className="h-2 w-2 rounded-full transition-colors duration-200">
                  {state.status === 'SUCCESS' && <span className="block h-2 w-2 rounded-full bg-emerald-400" />}
                  {state.status === 'TIMEOUT' && <span className="block h-2 w-2 rounded-full bg-amber-400" />}
                  {state.status === 'ERROR' && <span className="block h-2 w-2 rounded-full bg-rose-400" />}
                  {state.status === 'IDLE' && <span className="block h-2 w-2 rounded-full bg-slate-600" />}
                </span>
              </div>

              <div className="font-bold text-sm text-white tracking-wide">
                .{octet}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {SUBNET_BASE}.{octet}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Calling...
                  </span>
                ) : state.status === 'SUCCESS' ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {state.durationMs}ms
                  </span>
                ) : state.status === 'TIMEOUT' ? (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="h-3.5 w-3.5" /> 5s Timeout
                  </span>
                ) : state.status === 'ERROR' ? (
                  <span className="flex items-center gap-1 text-rose-400">
                    <XCircle className="h-3.5 w-3.5" /> Failed
                  </span>
                ) : (
                  <span className="text-slate-500 group-hover:text-slate-300 transition-colors">
                    Click to Hit
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Node Response & Curl Details Inspector */}
      {selectedResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Response Payload Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-emerald-400" />
                Response: {SUBNET_BASE}.{selectedResult.octet}:{PORT}
              </span>
              <CopyButton
                text={
                  typeof selectedResult.res.data === 'object'
                    ? JSON.stringify(selectedResult.res.data, null, 2)
                    : String(selectedResult.res.data || selectedResult.res.message)
                }
              />
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800/90 text-xs font-mono text-emerald-300 overflow-x-auto max-h-40 whitespace-pre-wrap break-all shadow-inner">
              {selectedResult.res.data
                ? typeof selectedResult.res.data === 'object'
                  ? JSON.stringify(selectedResult.res.data, null, 2)
                  : String(selectedResult.res.data)
                : selectedResult.res.message || 'No response data'}
            </pre>
          </div>

          {/* cURL Equivalent */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-sky-400" />
                cURL Command (.{selectedResult.octet})
              </span>
              <CopyButton text={getCurlCmd(selectedResult.octet)} />
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800/90 text-xs font-mono text-slate-300 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
              {getCurlCmd(selectedResult.octet)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};