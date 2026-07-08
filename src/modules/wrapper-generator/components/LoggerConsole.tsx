import { Terminal, Trash2 } from "lucide-react";
import type { LogEntry } from "../types/Generator";

interface Props {
  logs: LogEntry[];
  loading?: boolean;
}

function isDivider(message: string) {
  return /^-{3,}/.test(message.trim());
}

export default function LoggerConsole({ logs, loading }: Props) {
  const percent = logs.length === 0 ? 0 : loading ? Math.min(95, logs.length * 6) : 100;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-xl shadow-black/30">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-indigo-400" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-200">Logs</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0f1424] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear Logs
        </button>
      </div>

      <div className="h-[420px] overflow-y-auto rounded-xl border border-slate-800/80 bg-black/60 p-4 font-mono text-[13px] leading-relaxed">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-slate-600">
            Run the generator to watch the workflow live.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {logs.map((log) => {
              if (isDivider(log.message)) {
                return (
                  <div key={log.id} className="whitespace-pre text-indigo-400">
                    <span className="text-slate-600">[{log.timestamp}]</span> {log.message}
                  </div>
                );
              }
              return (
                <div key={log.id} className="whitespace-pre-wrap text-slate-300">
                  <span className="text-slate-600">[{log.timestamp}]</span>{" "}
                  {log.level === "success" ? (
                    <span className="font-semibold text-amber-300">{log.message}</span>
                  ) : log.level === "error" ? (
                    <>
                      <span className="text-rose-400">ERROR</span> {log.message}
                    </>
                  ) : log.level === "warning" ? (
                    <>
                      <span className="text-amber-400">WARNING</span> {log.message}
                    </>
                  ) : (
                    log.message
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="w-10 text-right text-xs font-medium text-slate-400">{percent}%</span>
      </div>
    </div>
  );
}
