import { CheckCircle, X, Sliders } from 'lucide-react';

interface FieldEditorModalProps {
  field: any;
  onClose: () => void;
  onSave: (field: any) => void;
  onChange: (field: any) => void;
}

export default function FieldEditorModal({ field, onClose, onSave, onChange }: FieldEditorModalProps) {
  if (!field) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Edit Field Mapping: <span className="text-indigo-500 font-mono ml-1">{field.name}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Direction
              </label>
              <select
                value={field.direction || 'TX'}
                onChange={(e) => onChange({ ...field, direction: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500"
              >
                <option value="TX">TX — Request Body</option>
                <option value="RX">RX — Response Data</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                OpenAPI Data Type
              </label>
              <input
                type="text"
                value={field.oapiType || 'string'}
                onChange={(e) => onChange({ ...field, oapiType: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500"
                placeholder="string | integer | boolean | array"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Max Length Restriction
              </label>
              <input
                type="text"
                value={field.length || ''}
                onChange={(e) => onChange({ ...field, length: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500"
                placeholder="e.g., 50 (leave blank if none)"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Cardinality / Required
              </label>
              <select
                value={field.cardinality || '0,1'}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({ ...field, cardinality: val, required: val === '1,1' });
                }}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500"
              >
                <option value="1,1">1,1 — Mandatory (Required)</option>
                <option value="0,1">0,1 — Optional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Documentation / Description
            </label>
            <textarea
              rows={3}
              value={field.description || ''}
              onChange={(e) => onChange({ ...field, description: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-sans text-slate-800 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500 resize-none"
              placeholder="Add structural notes or mapping details..."
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(field)}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
          >
            <CheckCircle size={15} />
            <span>Apply Mapping</span>
          </button>
        </div>
      </div>
    </div>
  );
}