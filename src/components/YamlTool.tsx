import { useState, useRef, useCallback, useMemo, type ReactElement } from 'react';
import {
  Clipboard, LayoutDashboard, Database,
  Settings, CheckCircle2, Eye, Terminal, ShieldAlert,
  ChevronDown, Sparkles, ShieldCheck, Rocket, AlertTriangle,
  XCircle, Loader2, ListChecks
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type Severity = 'error' | 'warning' | 'success';
type StatementType = 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' | 'MERGE' | 'UNKNOWN';
type QueryStatus = 'passed' | 'warning' | 'error';
type Environment = 'DEV' | 'SIT' | 'UAT' | 'PROD';

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
  environment: Environment;
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

const ALLOWED_STATEMENTS: StatementType[] = ['INSERT', 'UPDATE', 'DELETE', 'SELECT', 'MERGE'];
const RESTRICTED_TABLES = ['URL_MAPPER', 'SYS_URL_MAPPER'];

// The schema every table reference must resolve to for a given target
// environment. DEV is the only environment where an unqualified table name
// (no "SCHEMA." prefix) is also acceptable.
const ENV_SCHEMA_MAP: Record<Environment, string> = {
  DEV: 'EISDEV',
  SIT: 'EISSIT',
  UAT: 'EISAPP',
  PROD: 'EISAPP',
};
const ENVIRONMENTS: Environment[] = ['DEV', 'SIT', 'UAT', 'PROD'];

// Matches "SCHEMA.TABLE", "SCHEMA.SCHEMA.TABLE" etc. immediately following
// a table-referencing keyword, so we only look at real table refs and not
// arbitrary dotted expressions elsewhere in the statement.
const TABLE_REF_REGEX = /(?:INSERT\s+INTO|UPDATE|FROM|JOIN|DELETE\s+FROM|MERGE\s+INTO)\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)/gi;

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

interface TableRef {
  raw: string;
  parts: string[];
}

/** Pulls every "SCHEMA.TABLE"-style reference out of a statement. */
function extractTableRefs(text: string): TableRef[] {
  const refs: TableRef[] = [];
  TABLE_REF_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TABLE_REF_REGEX.exec(text)) !== null) {
    const raw = match[1];
    refs.push({ raw, parts: raw.split('.') });
  }
  return refs;
}

/**
 * Enforces three related rules against every table reference in a statement:
 *  - the same schema must be used consistently across the whole statement
 *  - a schema can't be duplicated in the path (e.g. EISAPP.EISAPP.TABLE)
 *  - the schema used must match the schema required by the selected target
 *    environment (DEV/SIT/UAT/PROD), where DEV alone also permits omitting
 *    the schema entirely
 */
function validateSchemaAndEnvironment(
  text: string,
  statementType: StatementType,
  environment: Environment
): ValidationMessage[] {
  if (!['INSERT', 'UPDATE', 'DELETE', 'SELECT', 'MERGE'].includes(statementType)) return [];

  const refs = extractTableRefs(text);
  if (refs.length === 0) return [];

  const expectedSchema = ENV_SCHEMA_MAP[environment];
  const notes: { severity: Severity; message: string }[] = [];
  const schemasUsed = new Set<string>();

  refs.forEach(ref => {
    if (ref.parts.length > 2) {
      // e.g. EISAPP.EISAPP.CACHE_DETAILS
      notes.push({ severity: 'error', message: `Duplicate/double schema in table reference "${ref.raw}".` });
      schemasUsed.add(ref.parts[0].toUpperCase());
      return;
    }

    if (ref.parts.length === 1) {
      // No schema prefix at all.
      if (environment === 'DEV') {
        notes.push({ severity: 'success', message: `No schema on "${ref.raw}" (allowed for DEV).` });
      } else {
        notes.push({ severity: 'error', message: `Missing schema on table "${ref.raw}". ${environment} requires "${expectedSchema}".` });
      }
      return;
    }

    const schema = ref.parts[0].toUpperCase();
    schemasUsed.add(schema);
    if (schema !== expectedSchema) {
      notes.push({ severity: 'error', message: `Invalid schema "${schema}" on "${ref.raw}". ${environment} requires "${expectedSchema}".` });
    } else {
      notes.push({ severity: 'success', message: `Schema "${schema}" matches ${environment} environment.` });
    }
  });

  if (schemasUsed.size > 1) {
    notes.unshift({
      severity: 'error',
      message: `All tables in a query must use the same schema — found: ${[...schemasUsed].join(', ')}.`,
    });
  }

  return notes.map(n => ({ queryNumber: 0, line: 0, severity: n.severity, message: n.message }));
}

/** Renders a string with spaces swapped for a visible glyph, for display in messages. */
function visualizeSpaces(value: string): string {
  return value.replace(/ /g, '\u2423');
}

/**
 * Rule: flag string literal values that carry leading/trailing or repeated
 * ("double") spaces — a common source of silent data mismatches.
 */
function findSpacingIssues(text: string): { value: string; issues: string[] }[] {
  const findings: { value: string; issues: string[] }[] = [];
  const literalMatches = [...text.matchAll(/'([^']*)'/g)];

  literalMatches.forEach(m => {
    const value = m[1];
    const issues: string[] = [];
    if (/^ /.test(value)) issues.push('leading space');
    if (/ $/.test(value)) issues.push('trailing space');
    if (/ {2,}/.test(value)) issues.push('double space');
    if (issues.length > 0) findings.push({ value, issues });
  });

  return findings;
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
function validateStatement(
  stmt: ParsedStatement,
  queryNumber: number,
  sql: string,
  environment: Environment
): ValidationMessage[] {
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

  // Rule 1: schema must be consistent across the statement, non-duplicated,
  // and must match the schema required by the selected target environment.
  validateSchemaAndEnvironment(stmt.text, statementType, environment).forEach(n =>
    push(n.severity, n.message)
  );

  // Rule: flag stray leading/trailing/double spaces inside string literal values.
  findSpacingIssues(stmt.text).forEach(({ value, issues }) => {
    push('warning', `Spacing issue (${issues.join(', ')}) in value: "${visualizeSpaces(value)}".`);
  });

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

/**
 * Looks at every table reference in the SQL and returns whichever known
 * schema (EISDEV/EISSIT/EISAPP) appears most often, or null if none is
 * used yet. Used to auto-pick a sensible default Environment so the
 * dropdown doesn't silently disagree with SQL the person just pasted.
 */
function detectDominantSchema(sql: string): string | null {
  const counts: Record<string, number> = {};
  parseQueries(sql).forEach(stmt => {
    extractTableRefs(stmt.text).forEach(ref => {
      if (ref.parts.length >= 2) {
        const schema = ref.parts[0].toUpperCase();
        counts[schema] = (counts[schema] ?? 0) + 1;
      }
    });
  });
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function schemaToEnvironment(schema: string): Environment | null {
  const match = (Object.entries(ENV_SCHEMA_MAP) as [Environment, string][])
    .find(([, s]) => s === schema);
  return match ? match[0] : null;
}

/** Runs the full validation pipeline over raw SQL text for a given target environment. */
function validateSql(sql: string, environment: Environment): ValidationSummary {
  const statements = parseQueries(sql);

  const queryReports: QueryReport[] = statements.map((stmt, i) => {
    const queryNumber = i + 1;
    const messages = validateStatement(stmt, queryNumber, sql, environment);
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
  const [formData, setFormData] = useState<FormData>({ apiName: '', node: '', server: '', deploy: 'false', environment: 'DEV', sql: '' });
  const [output, setOutput] = useState('');
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [environmentTouched, setEnvironmentTouched] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const firstErrorRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const updateSql = (sql: string) => {
    setFormData(prev => {
      if (environmentTouched) return { ...prev, sql };
      const detectedSchema = detectDominantSchema(sql);
      const detectedEnv = detectedSchema ? schemaToEnvironment(detectedSchema) : null;
      return { ...prev, sql, environment: detectedEnv ?? prev.environment };
    });
  };

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
    const result = validateSql(formData.sql, formData.environment);
    setSummary(result);
    setOutput('');
    requestAnimationFrame(() => {
      firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [formData.sql, formData.environment]);

  // -- Generate YAML -----------------------------------------------------------
  const handleGenerateYaml = useCallback(() => {
    const result = validateSql(formData.sql, formData.environment);
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
    <div className="min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] flex flex-col gap-4 sm:gap-6 font-sans">
      <div className="flex-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:opacity-75 transition-all">
          <LayoutDashboard size={20} /> Back to Dashboard
        </button>

        {toast && (
          <div className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 w-fit ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {toast.message}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col gap-4 sm:gap-6 min-h-0">
          <div className="flex-none bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Settings size={16} className="text-indigo-500" /> Environment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input placeholder="API Name" value={formData.apiName} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white" onChange={e => setFormData({ ...formData, apiName: e.target.value })} />
              <div className="relative">
                <select
                  value={formData.environment}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white appearance-none cursor-pointer"
                  onChange={e => {
                    setEnvironmentTouched(true);
                    setFormData(prev => ({ ...prev, environment: e.target.value as Environment }));
                  }}
                  title="Target environment — determines the required table schema during validation. Auto-detected from your SQL until you pick one manually."
                >
                  {ENVIRONMENTS.map(env => (
                    <option key={env} value={env}>
                      {env} ({ENV_SCHEMA_MAP[env]}{env === 'DEV' ? ' or none' : ''})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
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

          <div className="flex-1 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-0">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Database size={16} className="text-indigo-500" /> SQL Script Editor
            </h3>
            <textarea
              ref={textareaRef}
              value={formData.sql}
              className="flex-1 w-full min-h-[160px] p-4 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-indigo-500 dark:text-white resize-none"
              placeholder="Paste SQL here..."
              onChange={e => updateSql(e.target.value)}
            />

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            {summary && hasBlockingErrors && (
              <div className="mt-3 flex items-start gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                <ShieldAlert size={14} className="flex-none mt-0.5" />
                <span>
                  {summary.totalErrors} validation error{summary.totalErrors !== 1 ? 's' : ''} must be fixed before YAML can be generated —
                  see the report on the right. If it's a schema error, check the <strong>Environment</strong> dropdown ({formData.environment}) matches the schema in your SQL.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden h-full min-h-[420px] lg:min-h-0">
          <div className="flex-none p-3 sm:p-4 bg-slate-900 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-slate-500 flex-none" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                {summary
                  ? hasBlockingErrors ? 'Log: Build Failed' : 'Log: Validation Report'
                  : 'Log: Configuration'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {summaryBadge && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold font-mono uppercase tracking-wider">
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

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed custom-scrollbar min-h-0 space-y-6">

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
                  <div key={qr.queryNumber} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
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
                            className="flex flex-wrap items-start gap-x-2 gap-y-1 text-xs"
                          >
                            {severityIcon[m.severity]}
                            <span className={`${severityTextClass[m.severity]} break-words`}>{m.message}</span>
                            <button
                              onClick={() => jumpToLine(m.line)}
                              className="text-slate-600 hover:text-indigo-400 whitespace-nowrap sm:ml-auto transition-colors"
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
