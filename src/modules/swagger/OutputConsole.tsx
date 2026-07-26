// src/components/swagger/OutputConsole.tsx
import { useState, useMemo } from 'react';
import { Code2, Sparkles, CheckCircle2, FileText, Download } from 'lucide-react';
import { CopyButton } from '../../components/CopyButton';

interface OutputConsoleProps {
  outputYaml: string; 
  fileName?: string;
}

export default function OutputConsole({ outputYaml, fileName }: OutputConsoleProps) {
  const [autoFormat, setAutoFormat] = useState(true);

  // Check if output is valid JSON and pretty-print it cleanly with 2 spaces
  const { formattedCode, isJson } = useMemo(() => {
    if (!outputYaml) return { formattedCode: '', isJson: false };
    try {
      const parsed = JSON.parse(outputYaml);
      return {
        formattedCode: autoFormat ? JSON.stringify(parsed, null, 2) : outputYaml,
        isJson: true,
      };
    } catch {
      // If parsing fails (e.g., standard YAML format), return raw text
      return { formattedCode: outputYaml, isJson: false };
    }
  }, [outputYaml, autoFormat]);

  const handleDownload = () => {
    if (!formattedCode) return;
    
    // Automatically pick the right file extension and MIME type
    const extension = isJson ? 'json' : 'yaml';
    const mimeType = isJson ? 'application/json' : 'text/yaml';
    
    const blob = new Blob([formattedCode], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'swagger'}.${extension}`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up temporary DOM element and Blob URL
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Syntax highlighter for JSON output
  const highlightedHtml = useMemo(() => {
    if (!formattedCode) return '';
    if (!isJson) {
      // Basic HTML escaping for non-JSON / raw YAML text
      return formattedCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // Apply IDE-style syntax colors
    return formattedCode.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g,
      (match) => {
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            // JSON Key (Sky Blue)
            return `<span class="text-sky-400 dark:text-sky-300 font-semibold">${match}</span>`;
          }
          // JSON String Value (Emerald Green)
          return `<span class="text-emerald-400 dark:text-emerald-300">${match}</span>`;
        }
        if (/true|false/.test(match)) {
          // Booleans (Rose Red)
          return `<span class="text-rose-400 font-semibold">${match}</span>`;
        }
        if (/null/.test(match)) {
          // Null (Slate Gray)
          return `<span class="text-slate-500 font-semibold">${match}</span>`;
        }
        if (/[{}\[\]]/.test(match)) {
          // Braces & Brackets (Slate Gray)
          return `<span class="text-slate-400 font-bold">${match}</span>`;
        }
        // Numbers (Amber Orange)
        return `<span class="text-amber-400 dark:text-amber-300">${match}</span>`;
      }
    );
  }, [formattedCode, isJson]);

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800/80 text-slate-300 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Output Code</span>
          </div>

          {/* Format Status Badge */}
          {outputYaml && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800/80 border border-slate-700/60">
              {isJson ? (
                <>
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Valid JSON</span>
                </>
              ) : (
                <>
                  <FileText size={12} className="text-amber-400" />
                  <span className="text-slate-300">YAML / Raw</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-Format Toggle Button */}
          {isJson && (
            <button
              type="button"
              onClick={() => setAutoFormat(!autoFormat)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                autoFormat
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle automatic JSON pretty-printing"
            >
              <Sparkles size={13} className={autoFormat ? 'text-indigo-400' : 'text-slate-400'} />
              <span>{autoFormat ? 'Formatted' : 'Raw'}</span>
            </button>
          )}

          {/* Copy Button */}
          <CopyButton text={formattedCode} />

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!outputYaml}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            title="Download spec to your device"
          >
            <Download size={13} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="flex-1 p-4 overflow-auto min-h-[220px] max-h-[460px] bg-slate-950">
        {outputYaml ? (
          <pre
            className="text-xs font-mono leading-relaxed tab-4 select-text whitespace-pre"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <pre className="text-xs font-mono text-slate-500 leading-relaxed tab-4 select-none italic">
            // Corrected OpenAPI/Swagger JSON or YAML will appear here after validation...
          </pre>
        )}
      </div>
    </div>
  );
}