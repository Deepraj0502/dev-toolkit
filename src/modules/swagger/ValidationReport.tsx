import { AlertTriangle, CheckCircle, Info, Edit2, ShieldAlert, Trash2, EyeOff } from 'lucide-react';
import type { ValidationIssue } from '../../utils/swaggerCore';

interface ValidationReportProps {
  report: ValidationIssue[];
  fieldEdits: Record<string, any>;
  onEditField: (field: any) => void;
  onRemoveField?: (fieldName: string) => void;
  onIgnoreField?: (fieldName: string) => void;
}

export default function ValidationReport({
  report,
  fieldEdits,
  onEditField,
  onRemoveField,
  onIgnoreField,
}: ValidationReportProps) {
  const errCount = report.filter((i) => i.type === 'err').length;
  const warnCount = report.filter((i) => i.type === 'warn').length;
  const okCount = report.filter((i) => i.type === 'ok').length;

  return (
    <div className="flex flex-col h-full bg-slate-50/80 dark:bg-slate-900/40 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <ShieldAlert size={16} className="text-indigo-500" />
          Validation Report
        </h3>

        {report.length > 0 && (
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-rose-500 flex items-center gap-1">{errCount} Err</span>
            <span className="text-amber-500 flex items-center gap-1">· {warnCount} Warn</span>
            <span className="text-emerald-500 flex items-center gap-1">· {okCount} OK</span>
          </div>
        )}
      </div>

      {report.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl my-auto min-h-[180px]">
          <Info size={28} className="mb-2 opacity-40" />
          <p className="text-xs font-medium">
            Upload your XSD and YAML files, then trigger validation to see detailed schema comparisons.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 overflow-y-auto max-h-[420px] pr-1">
          {report.map((issue, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex gap-3.5 transition-all ${
                issue.type === 'err'
                  ? 'bg-rose-500/5 border-rose-500/20 text-rose-950 dark:text-rose-200'
                  : issue.type === 'warn'
                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-200'
                  : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-200'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {issue.type === 'err' && <AlertTriangle className="text-rose-500" size={18} />}
                {issue.type === 'warn' && <Info className="text-amber-500" size={18} />}
                {issue.type === 'ok' && <CheckCircle className="text-emerald-500" size={18} />}
              </div>

              <div className="flex-1 min-w-0">
                <strong className="text-xs font-bold block mb-0.5">{issue.title}</strong>
                <span className="text-xs opacity-80 block leading-relaxed">{issue.sub}</span>

                {/* Missing Field Chips */}
                {issue.missingFields && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-rose-500/10 dark:border-rose-500/20">
                    {issue.missingFields.map((f: any) => {
                      const isEdited = fieldEdits[f.name];
                      return (
                        <button
                          type="button"
                          key={f.name}
                          onClick={() => onEditField(isEdited ? { ...f, ...isEdited } : f)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                            isEdited
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20 hover:scale-[1.02]'
                          }`}
                        >
                          {isEdited ? <CheckCircle size={12} className="text-emerald-500" /> : <Edit2 size={12} />}
                          <span>{f.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Action Buttons for Undocumented Fields */}
                {issue.undocumentedField && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-amber-500/10 dark:border-amber-500/20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onRemoveField && onRemoveField(issue.undocumentedField!.name);
                      }}
                      className="px-3 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20 hover:scale-[1.02] transition-all shadow-sm cursor-pointer"
                      title="Delete this property from the output code"
                    >
                      <Trash2 size={13} className="text-rose-500" />
                      <span>Remove from Spec</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onIgnoreField && onIgnoreField(issue.undocumentedField!.name);
                      }}
                      className="px-3 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20 hover:scale-[1.02] transition-all shadow-sm cursor-pointer"
                      title="Keep property in output code and dismiss warning"
                    >
                      <EyeOff size={13} className="text-slate-400" />
                      <span>Keep / Ignore Warning</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}