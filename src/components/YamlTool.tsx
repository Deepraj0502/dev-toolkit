import { useState } from 'react';
import { 
  Clipboard, LayoutDashboard, Database, 
  Settings, CheckCircle2, Eye, Terminal, ShieldAlert,
  ChevronDown
} from 'lucide-react';

export default function YamlTool({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({ apiName: '', node: '', server: '', deploy: 'false', sql: '' });
  const [output, setOutput] = useState('');
  const [errors, setErrors] = useState<{ line: number; msg: string }[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Reverse the visual dot replacement for the clipboard
    const cleanOutput = output.replace(/·/g, ' ');
    
    navigator.clipboard.writeText(cleanOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Validation Logic (remains consistent)
  const validateSql = (sql: string) => {
    const errs: { line: number; msg: string }[] = [];
    const lines = sql.split('\n');
    const allowedSchemas = ['EISDEV', 'EISSIT', 'EISAPP'];

    lines.forEach((line, index) => {
      const trimmed = line.trim().toUpperCase();
      if (!trimmed || trimmed === 'COMMIT;') return; // Ignore COMMIT in validation too
      const lineNum = index + 1;

      if (!allowedSchemas.some(s => trimmed.includes(s)) && (trimmed.includes('INSERT') || trimmed.includes('UPDATE'))) {
        errs.push({ line: lineNum, msg: `Invalid schema. Must be: ${allowedSchemas.join(', ')}` });
      }

      if (trimmed.includes('INSERT INTO')) {
        const colMatch = line.match(/\((.*?)\)/);
        const valMatch = line.match(/VALUES\s*\((.*?)\)/i);
        if (colMatch && valMatch) {
          const cols = colMatch[1].split(',').filter(x => x.trim()).length;
          const vals = valMatch[1].split(',').filter(x => x.trim()).length;
          if (cols !== vals) errs.push({ line: lineNum, msg: `Mismatch: ${cols} cols vs ${vals} values.` });
        }
      }

      if (trimmed.includes('EISAPP') && (trimmed.includes('SYS_URL_MAPPER') || trimmed.includes('URL_MAPPER'))) {
        if (trimmed.includes('CR_NO')) errs.push({ line: lineNum, msg: `EISAPP Table Restriction: CR_NO field prohibited.` });
      }

      if (!trimmed.endsWith(';') && trimmed.length > 5) errs.push({ line: lineNum, msg: `Missing semicolon.` });
    });

    setErrors(errs);
    return errs.length === 0;
  };

  const generateYaml = () => {
    if (!validateSql(formData.sql)) {
      setOutput(""); 
      return;
    }
    const { apiName, node, server, deploy, sql } = formData;
    let yaml = `${apiName || 'API_Name'}:\n  IntegrationNode: ${node}\n  IntegrationServer: ${server}\n  Deploy: ${deploy}\n  Cache:\n`;
    
    // Split by semicolon and filter out COMMIT statements
    const queries = sql.split(';');
    
    queries.forEach((q) => {
      const query = q.trim();
      
      // RULE: Ignore empty strings or standalone COMMIT statements
      if (!query || query.toUpperCase() === 'COMMIT') return;

      let fieldName = "";
      let fieldValue = "";

      if (query.toUpperCase().includes("CACHE_DETAILS")) {
        const matches = [...query.matchAll(/'(.*?)'/g)];
        if (matches[0]) fieldName = matches[0][1].replace(/ /g, '·');
        if (matches[1]) fieldValue = matches[1][1].replace(/ /g, '·');
      }

      // Append only if it's a functional query
      yaml += `    - Query: "${query.replace(/"/g, '\\"')};"\n      FIELD_NAME: "${fieldName}"\n      FIELD_VALUE: "${fieldValue}"\n`;
    });

    setOutput(yaml);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 font-sans">
      <div className="flex-none flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:opacity-75 transition-all">
          <LayoutDashboard size={20} /> Back to Dashboard
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          <div className="flex-none bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Settings size={16} className="text-indigo-500" /> Environment
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="API Name" className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white" onChange={e => setFormData({...formData, apiName: e.target.value})} />
              <div className="relative">
                <select 
                  value={formData.deploy}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white appearance-none cursor-pointer"
                  onChange={e => setFormData({...formData, deploy: e.target.value})}
                >
                  <option value="true">Deploy: True</option>
                  <option value="false">Deploy: False</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
              <input placeholder="Node" className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white" onChange={e => setFormData({...formData, node: e.target.value})} />
              <input placeholder="Server" className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white" onChange={e => setFormData({...formData, server: e.target.value})} />
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-0">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Database size={16} className="text-indigo-500" /> SQL Script Editor
            </h3>
            <textarea 
              className="flex-1 w-full p-4 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-indigo-500 dark:text-white resize-none" 
              placeholder="Paste SQL here..." 
              onChange={e => setFormData({...formData, sql: e.target.value})} 
            />
            <button 
              onClick={generateYaml} 
              className="mt-4 flex-none bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98]"
            >
              Run Validation & Generate
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden min-h-0 h-full">
          <div className="flex-none p-4 bg-slate-900 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                {errors.length > 0 ? "Log: Build Failed" : "Log: Configuration"}
              </span>
            </div>
            {output && !errors.length && (
              <button 
                onClick={handleCopy}
                className={`text-xs font-bold flex items-center gap-2 transition-colors ${copied ? 'text-emerald-400' : 'text-indigo-400 hover:text-indigo-300'}`}
              >
                {copied ? <CheckCircle2 size={14}/> : <Clipboard size={14}/>} 
                {copied ? 'Copied to Clipboard' : 'Copy Clean YAML'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed custom-scrollbar min-h-0">
            {errors.length > 0 ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="text-red-500 font-bold flex items-center gap-2 mb-4 uppercase text-xs tracking-widest">
                  <ShieldAlert size={16} /> Validation Errors
                </div>
                {errors.map((err, i) => (
                  <div key={i} className="flex gap-4 p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
                    <span className="text-red-500 font-black whitespace-nowrap">Ln {err.line}</span>
                    <span className="text-slate-300">{err.msg}</span>
                  </div>
                ))}
              </div>
            ) : output ? (
              <div className="animate-in fade-in duration-300 h-full">
                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold mb-4 w-fit uppercase tracking-tighter">
                  <Eye size={10} /> Dot-Highlighter Active
                </div>
                <pre className="text-emerald-400 whitespace-pre-wrap">{output}</pre>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 dark:text-slate-600 italic">
                <Database size={32} className="opacity-10 mb-2" />
                <p className="text-xs text-center">Console Ready. Awaiting script...<br/>Note: COMMIT; statements are automatically filtered.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}