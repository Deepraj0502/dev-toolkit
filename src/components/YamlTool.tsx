import { useState, useRef, useCallback, useMemo, type ReactElement } from 'react';
import {
  Clipboard, LayoutDashboard, Database,
  Settings, CheckCircle2, Eye, Terminal,
  ChevronDown, Sparkles, ShieldCheck, Rocket, AlertTriangle,
  XCircle, Loader2, ListChecks
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type Severity = 'error' | 'warning' | 'success';
type StatementType = 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' | 'MERGE' | 'UNKNOWN';
type QueryStatus = 'passed' | 'warning' | 'error';

interface ValidationMessage {
  queryNumber: number;
  line: number;
  severity: Severity;
  message: string;
}

interface QueryReport {
  queryNumber: number;
  text: string;
  statementType: StatementType;
  startLine: number;
  status: QueryStatus;
  messages: ValidationMessage[];
}

interface ValidationSummary {
  queryReports: QueryReport[];
  allMessages: ValidationMessage[];
  totalQueries: number;
  queriesPassed: number;
  queriesWithWarnings: number;
  queriesWithErrors: number;
  totalErrors: number;
  totalWarnings: number;
}

interface FormData {
  apiName: string;
  node: string;
  server: string;
  deploy: string;
  sql: string;
}

interface ParsedStatement {
  text: string;
  trimmedText: string;
  startIndex: number;
  hasSemicolon: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_SCHEMAS = ['EISDEV', 'EISSIT', 'EISAPP'];
const ALLOWED_STATEMENTS: StatementType[] = ['INSERT', 'UPDATE', 'DELETE', 'SELECT', 'MERGE'];
const RESTRICTED_TABLES = ['URL_MAPPER', 'SYS_URL_MAPPER'];

// ============================================================================
// Pure helper functions (kept outside the component to avoid re-creation
// on every render, and to make each rule independently testable/reusable)
// ============================================================================

/** Returns the 1-indexed line number that a character offset falls on. */
function getLineNumber(sql: string, charIndex: number): number {
  return sql.slice(0, charIndex).split('\n').length;
}

/**
 * Splits a comma-separated argument list (e.g. the inside of a column list
 * or a VALUES(...) clause) while respecting nested parentheses and quoted
 * strings, so commas inside function calls or string literals don't
 * fragment the split.
 */
function splitArgs(str: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let inQuote = false;
  let current = '';

  for (const ch of str) {
    if (ch === "'") inQuote = !inQuote;
    if (!inQuote) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
    }
    if (ch === ',' && depth === 0 && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result.filter(Boolean);
}

/**
 * Splits raw SQL text into individual statements, tracking each statement's
 * character offset (used to compute line numbers) and whether it was
 * properly terminated with a semicolon. Blank fragments and standalone
 * COMMIT statements are dropped, per business rules.
 */
function parseQueries(sql: string): ParsedStatement[] {
  const statements: ParsedStatement[] = [];
  const rawParts = sql.split(';');
  let offset = 0;

  rawParts.forEach((part, idx) => {
    const startIndex = offset;
    offset += part.length + 1; // account for the removed ';'

    const trimmed = part.trim();
    if (!trimmed) return;
    if (trimmed.toUpperCase() === 'COMMIT') return;

    const isLastFragment = idx === rawParts.length - 1;
    statements.push({
      text: part,
      trimmedText: trimmed,
      startIndex,
      hasSemicolon: !isLastFragment,
    });
  });

  return statements;
}

function getStatementType(upperTrimmed: string): StatementType {
  const match = upperTrimmed.match(/^\(*\s*(\w+)/);
  const word = match?.[1] as StatementType | undefined;
  return word && ALLOWED_STATEMENTS.includes(word) ? word : 'UNKNOWN';
}

function validateParentheses(text: string): { balanced: boolean; opens: number; closes: number } {
  const opens = (text.match(/\(/g) || []).length;
  const closes = (text.match(/\)/g) || []).length;
  return { balanced: opens === closes, opens, closes };
}

function validateQuotes(text: string): boolean {
  // Doubled '' is an escaped quote inside a string literal, not a delimiter.
  const withoutEscaped = text.replace(/''/g, '');
  const quoteCount = (withoutEscaped.match(/'/g) || []).length;
  return quoteCount % 2 === 0;
}

function validateSchema(upperTrimmed: string): boolean {
  return ALLOWED_SCHEMAS.some(schema => upperTrimmed.includes(schema));
}

function validateInsertColumnsMatchValues(text: string): { valid: boolean; cols: number; vals: number } | null {
  const colMatch = text.match(/\(([\s\S]*?)\)\s*VALUES/i);
  const valMatch = text.match(/VALUES\s*\(([\s\S]*?)\)/i);
  if (!colMatch || !valMatch) return null;

  const cols = splitArgs(colMatch[1]).length;
  const vals = splitArgs(valMatch[1]).length;
  return { valid: cols === vals, cols, vals };
}

function isRestrictedTableViolation(upperTrimmed: string): boolean {
  const touchesRestrictedTable = upperTrimmed.includes('EISAPP') &&
    RESTRICTED_TABLES.some(t => upperTrimmed.includes(t));
  return touchesRestrictedTable && upperTrimmed.includes('CR_NO');
}

/** Runs every business rule against a single parsed statement. */
function validateStatement(stmt: ParsedStatement, queryNumber: number, sql: string): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const line = getLineNumber(sql, stmt.startIndex);
  const upper = stmt.trimmedText.toUpperCase();
  const push = (severity: Severity, message: string) =>
    messages.push({ queryNumber, line, severity, message });

  const statementType = getStatementType(upper);

  // Rule 2: statement type must be one of the allowed set
  if (statementType === 'UNKNOWN') {
    push('error', 'Unknown or unsupported statement type.');
    return messages; // further rules assume a recognized statement shape
  }

  // Rule 3: semicolon termination (COMMIT already filtered out in parseQueries)
  if (!stmt.hasSemicolon) {
    push('error', 'Missing semicolon.');
  }

  // Rule 4: parentheses balance
  const parens = validateParentheses(stmt.text);
  if (!parens.balanced) {
    push('error', `Unbalanced parentheses (${parens.opens} open, ${parens.closes} close).`);
  } else if (parens.opens > 0) {
    push('success', 'Parentheses balanced.');
  }

  // Rule 5: quote balance
  if (!validateQuotes(stmt.text)) {
    push('error', 'Unbalanced quotes.');
  } else {
    push('success', 'Quotes balanced.');
  }

  // Rule 1: allowed schema (INSERT/UPDATE/DELETE only)
  if (['INSERT', 'UPDATE', 'DELETE'].includes(statementType)) {
    if (!validateSchema(upper)) {
      push('error', `Invalid schema. Allowed: ${ALLOWED_SCHEMAS.join(', ')}.`);
    } else {
      push('success', 'Allowed schema.');
    }
  }

  // Rule 6: INSERT column/value count match
  if (statementType === 'INSERT') {
    const match = validateInsertColumnsMatchValues(stmt.text);
    if (match) {
      if (!match.valid) {
        push('error', `Column/value mismatch: ${match.cols} columns vs ${match.vals} values.`);
      } else {
        push('success', 'INSERT validation passed.');
      }
    }
  }

  // Rule 7 & 8: UPDATE must have SET, warn if missing WHERE
  if (statementType === 'UPDATE') {
    if (!upper.includes('SET')) {
      push('error', 'UPDATE statement missing SET clause.');
    }
    if (!upper.includes('WHERE')) {
      push('warning', 'UPDATE without WHERE clause.');
    }
  }

  // Rule 8: DELETE without WHERE
  if (statementType === 'DELETE' && !upper.includes('WHERE')) {
    push('warning', 'DELETE without WHERE clause.');
  }

  // Rule 9: restricted table columns
  if (isRestrictedTableViolation(upper)) {
    push('error', 'EISAPP restricted table: CR_NO field prohibited.');
  }

  return messages;
}

/** Rule 10: flags CACHE_DETAILS inserts that reuse the same cache key name. */
function detectDuplicateCacheKeys(queryReports: QueryReport[]): void {
  const cacheKeyToQueries: Record<string, number[]> = {};

  queryReports.forEach(qr => {
    const upper = qr.text.toUpperCase();
    if (qr.statementType === 'INSERT' && upper.includes('CACHE_DETAILS')) {
      const matches = [...qr.text.matchAll(/'(.*?)'/g)];
      const keyName = matches[0]?.[1];
      if (keyName) {
        (cacheKeyToQueries[keyName] ??= []).push(qr.queryNumber);
      }
    }
  });

  Object.entries(cacheKeyToQueries).forEach(([keyName, queryNumbers]) => {
    if (queryNumbers.length < 2) return;
    queryNumbers.forEach(qNum => {
      const report = queryReports.find(q => q.queryNumber === qNum);
      if (!report) return;
      const others = queryNumbers.filter(n => n !== qNum).join(', ');
      report.messages.push({
        queryNumber: qNum,
        line: report.startLine,
        severity: 'warning',
        message: `Duplicate cache key "${keyName}" also used in Query ${others}.`,
      });
      if (report.status === 'passed') report.status = 'warning';
    });
  });
}

/** Runs the full validation pipeline (rules 1-11) over raw SQL text. */
function validateSql(sql: string): ValidationSummary {
  const statements = parseQueries(sql);

  const queryReports: QueryReport[] = statements.map((stmt, i) => {
    const queryNumber = i + 1;
    const messages = validateStatement(stmt, queryNumber, sql);
    const status: QueryStatus = messages.some(m => m.severity === 'error')
      ? 'error'
      : messages.some(m => m.severity === 'warning')
        ? 'warning'
        : 'passed';

    return {
      queryNumber,
      text: stmt.text,
      statementType: getStatementType(stmt.trimmedText.toUpperCase()),
      startLine: getLineNumber(sql, stmt.startIndex),
      status,
      messages,
    };
  });

  detectDuplicateCacheKeys(queryReports);

  const allMessages = queryReports.flatMap(q => q.messages);

  return {
    queryReports,
    allMessages,
    totalQueries: queryReports.length,
    queriesPassed: queryReports.filter(q => q.status === 'passed').length,
    queriesWithWarnings: queryReports.filter(q => q.status === 'warning').length,
    queriesWithErrors: queryReports.filter(q => q.status === 'error').length,
    totalErrors: allMessages.filter(m => m.severity === 'error').length,
    totalWarnings: allMessages.filter(m => m.severity === 'warning').length,
  };
}

/** Formats raw SQL using the `sql-formatter` package (PostgreSQL dialect). */
async function formatSql(sql: string): Promise<string> {
  const { format } = await import('sql-formatter');
  return format(sql, {
    language: 'postgresql',
    keywordCase: 'upper',
    tabWidth: 4,
    linesBetweenQueries: 2,
  });
}

/** Builds the final YAML string from form + validated SQL (unchanged core logic). */
function buildYaml(formData: FormData): string {
  const { apiName, node, server, deploy, sql } = formData;
  let yaml = `${apiName || 'API_Name'}:\n  IntegrationNode: ${node}\n  IntegrationServer: ${server}\n  Deploy: ${deploy}\n  Cache:\n`;

  const statements = parseQueries(sql);

  statements.forEach(({ text }) => {
    const query = text.trim();
    let fieldName = '';
    let fieldValue = '';

    if (query.toUpperCase().includes('CACHE_DETAILS')) {
      const matches = [...query.matchAll(/'(.*?)'/g)];
      if (matches[0]) fieldName = matches[0][1].replace(/ /g, '\u00B7');
      if (matches[1]) fieldValue = matches[1][1].replace(/ /g, '\u00B7');
    }

    yaml += `    - Query: "${query.replace(/"/g, '\\"')};"\n      FIELD_NAME: "${fieldName}"\n      FIELD_VALUE: "${fieldValue}"\n`;
  });

  return yaml;
}

// ============================================================================
// Small presentational helpers
// ============================================================================

const severityIcon: Record<Severity, ReactElement> = {
  error: <XCircle size={14} className="text-red-500 flex-none" />,
  warning: <AlertTriangle size={14} className="text-amber-400 flex-none" />,
  success: <CheckCircle2 size={14} className="text-emerald-400 flex-none" />,
};

const severityTextClass: Record<Severity, string> = {
  error: 'text-red-300',
  warning: 'text-amber-200',
  success: 'text-emerald-300',
};

const statusBadgeClass: Record<QueryStatus, string> = {
  passed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/10 text-red-400 border-red-500/30',
};

// ============================================================================
// Component
// ============================================================================

export default function YamlTool({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState<FormData>({ apiName: '', node: '', server: '', deploy: 'false', sql: '' });
  const [output, setOutput] = useState('');
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const firstErrorRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const updateSql = (sql: string) => setFormData(prev => ({ ...prev, sql }));

  // -- Format SQL -----------------------------------------------------------
  const handleFormat = useCallback(async () => {
    if (!formData.sql.trim()) return;
    setIsFormatting(true);
    try {
      const formatted = await formatSql(formData.sql);
      updateSql(formatted);
      showToast('SQL formatted successfully', 'success');
    } catch {
      showToast('Formatting failed — check your SQL syntax', 'error');
    } finally {
      setIsFormatting(false);
    }
  }, [formData.sql, showToast]);

  // -- Validate SQL -----------------------------------------------------------
  const handleValidate = useCallback(() => {
    const result = validateSql(formData.sql);
    setSummary(result);
    setOutput('');
    requestAnimationFrame(() => {
      firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [formData.sql]);

  // -- Generate YAML -----------------------------------------------------------
  const handleGenerateYaml = useCallback(() => {
    const result = validateSql(formData.sql);
    setSummary(result);

    if (result.totalErrors > 0) {
      setOutput('');
      showToast('Cannot generate YAML — resolve validation errors first', 'error');
      requestAnimationFrame(() => {
        firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    setIsGenerating(true);
    // Brief async tick keeps the loading state visible/meaningful for large scripts.
    setTimeout(() => {
      setOutput(buildYaml(formData));
      setIsGenerating(false);
    }, 250);
  }, [formData, showToast]);

  // -- Copy to clipboard -----------------------------------------------------------
  const handleCopy = useCallback(() => {
    const cleanOutput = output.replace(/\u00B7/g, ' ');
    navigator.clipboard.writeText(cleanOutput);
    setCopied(true);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  }, [output, showToast]);

  // -- Jump the textarea cursor/selection to a given line -----------------------------------------------------------
  const jumpToLine = useCallback((line: number) => {
    const el = textareaRef.current;
    if (!el) return;
    const lines = el.value.split('\n');
    let start = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) start += lines[i].length + 1;
    const end = start + (lines[line - 1]?.length ?? 0);
    el.focus();
    el.setSelectionRange(start, end);
  }, []);

  const hasBlockingErrors = (summary?.totalErrors ?? 0) > 0;
  let firstErrorSeen = false;

  const summaryBadge = useMemo(() => {
    if (!summary) return null;
    return {
      errors: summary.totalErrors,
      warnings: summary.totalWarnings,
      passed: summary.queriesPassed,
    };
  }, [summary]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 font-sans">
      <div className="flex-none flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:opacity-75 transition-all">
          <LayoutDashboard size={20} /> Back to Dashboard
        </button>

        {toast && (
          <div className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {toast.message}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          <div className="flex-none bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Settings size={16} className="text-indigo-500" /> Environment
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="API Name" value={formData.apiName} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white" onChange={e => setFormData({ ...formData, apiName: e.target.value })} />
              <div className="relative">
                <select
                  value={formData.deploy}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white appearance-none cursor-pointer"
                  onChange={e => setFormData({ ...formData, deploy: e.target.value })}
                >
                  <option value="true">Deploy: True</option>
                  <option value="false">Deploy: False</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
              <input placeholder="Node" value={formData.node} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white" onChange={e => setFormData({ ...formData, node: e.target.value })} />
              <input placeholder="Server" value={formData.server} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white" onChange={e => setFormData({ ...formData, server: e.target.value })} />
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-0">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Database size={16} className="text-indigo-500" /> SQL Script Editor
            </h3>
            <textarea
              ref={textareaRef}
              value={formData.sql}
              className="flex-1 w-full p-4 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-indigo-500 dark:text-white resize-none"
              placeholder="Paste SQL here..."
              onChange={e => updateSql(e.target.value)}
            />

            <div className="mt-4 grid grid-cols-3 gap-3">
              <button
                onClick={handleFormat}
                disabled={isFormatting || !formData.sql.trim()}
                className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3.5 rounded-2xl font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFormatting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Format SQL
              </button>
              <button
                onClick={handleValidate}
                disabled={!formData.sql.trim()}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white py-3.5 rounded-2xl font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShieldCheck size={16} />
                Validate SQL
              </button>
              <button
                onClick={handleGenerateYaml}
                disabled={isGenerating || !formData.sql.trim() || hasBlockingErrors}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                title={hasBlockingErrors ? 'Resolve validation errors before generating' : undefined}
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                Generate YAML
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden min-h-0 h-full">
          <div className="flex-none p-4 bg-slate-900 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                {summary
                  ? hasBlockingErrors ? 'Log: Build Failed' : 'Log: Validation Report'
                  : 'Log: Configuration'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {summaryBadge && (
                <div className="flex items-center gap-3 text-[10px] font-bold font-mono uppercase tracking-wider">
                  <span className="text-red-400">Errors: {summaryBadge.errors}</span>
                  <span className="text-amber-400">Warnings: {summaryBadge.warnings}</span>
                  <span className="text-emerald-400">Passed: {summaryBadge.passed}</span>
                </div>
              )}
              {output && !hasBlockingErrors && (
                <button
                  onClick={handleCopy}
                  className={`text-xs font-bold flex items-center gap-2 transition-colors ${copied ? 'text-emerald-400' : 'text-indigo-400 hover:text-indigo-300'}`}
                >
                  {copied ? <CheckCircle2 size={14} /> : <Clipboard size={14} />}
                  {copied ? 'Copied to Clipboard' : 'Copy Clean YAML'}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed custom-scrollbar min-h-0 space-y-6">

            {/* --- Validation report --- */}
            {summary && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-bold">
                  <ListChecks size={14} />
                  {summary.totalQueries} {summary.totalQueries === 1 ? 'Query' : 'Queries'} Found
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-400">{summary.queriesPassed} Passed</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-400">{summary.queriesWithWarnings} Warning{summary.queriesWithWarnings !== 1 ? 's' : ''}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-red-400">{summary.queriesWithErrors} Error{summary.queriesWithErrors !== 1 ? 's' : ''}</span>
                </div>

                {summary.queryReports.length === 0 && (
                  <p className="text-slate-500 italic text-xs">No functional statements found (only blank lines / COMMIT).</p>
                )}

                {summary.queryReports.map(qr => (
                  <div key={qr.queryNumber} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-bold text-xs uppercase tracking-wider">
                        Query {qr.queryNumber} <span className="text-slate-600">· Ln {qr.startLine} · {qr.statementType}</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusBadgeClass[qr.status]}`}>
                        {qr.status}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {qr.messages.map((m, i) => {
                        const isFirstBlockingError = m.severity === 'error' && !firstErrorSeen;
                        if (isFirstBlockingError) firstErrorSeen = true;
                        return (
                          <div
                            key={i}
                            ref={isFirstBlockingError ? firstErrorRef : undefined}
                            className="flex items-start gap-2 text-xs"
                          >
                            {severityIcon[m.severity]}
                            <span className={severityTextClass[m.severity]}>{m.message}</span>
                            <button
                              onClick={() => jumpToLine(m.line)}
                              className="text-slate-600 hover:text-indigo-400 whitespace-nowrap ml-auto transition-colors"
                            >
                              Ln {m.line}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* --- YAML output --- */}
            {output && !hasBlockingErrors && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold mb-4 w-fit uppercase tracking-tighter">
                  <Eye size={10} /> Dot-Highlighter Active
                </div>
                <pre className="text-emerald-400 whitespace-pre-wrap">{output}</pre>
              </div>
            )}

            {/* --- Empty state --- */}
            {!summary && !output && (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 dark:text-slate-600 italic">
                <Database size={32} className="opacity-10 mb-2" />
                <p className="text-xs text-center">Console Ready. Paste SQL, then Format → Validate → Generate.<br />Note: COMMIT; statements are automatically filtered.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
