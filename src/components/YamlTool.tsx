import { useState, useRef, useCallback, useMemo, type ReactElement } from 'react';
import {
  LayoutDashboard, Database,
  Settings, CheckCircle2, Eye, Terminal, ShieldAlert,
  ChevronDown, Sparkles, ShieldCheck, Rocket, AlertTriangle,
  XCircle, Loader2, ListChecks
} from 'lucide-react';
import { CopyButton } from './CopyButton';

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

const ENV_SCHEMA_MAP: Record<Environment, string> = {
  DEV: 'EISDEV',
  SIT: 'EISSIT',
  UAT: 'EISAPP',
  PROD: 'EISAPP',
};
const ENVIRONMENTS: Environment[] = ['DEV', 'SIT', 'UAT', 'PROD'];

const TABLE_REF_REGEX = /(?:INSERT\s+INTO|UPDATE|FROM|JOIN|DELETE\s+FROM|MERGE\s+INTO)\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)/gi;

// ============================================================================
// Pure helper functions 
// ============================================================================

function getLineNumber(sql: string, charIndex: number): number {
  return sql.slice(0, charIndex).split('\n').length;
}

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

interface ParsedFragment extends ParsedStatement {
  isCommit: boolean;
}

function parseAllFragments(sql: string): ParsedFragment[] {
  const fragments: ParsedFragment[] = [];
  const rawParts = sql.split(';');
  let offset = 0;

  rawParts.forEach((part, idx) => {
    const startIndex = offset;
    offset += part.length + 1;

    const trimmed = part.trim();
    if (!trimmed) return;

    const isLastFragment = idx === rawParts.length - 1;
    fragments.push({
      text: part,
      trimmedText: trimmed,
      startIndex,
      hasSemicolon: !isLastFragment,
      isCommit: trimmed.toUpperCase() === 'COMMIT',
    });
  });

  return fragments;
}

function parseQueries(sql: string): ParsedStatement[] {
  return parseAllFragments(sql).filter(f => !f.isCommit);
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
  const withoutEscaped = text.replace(/''/g, '');
  const quoteCount = (withoutEscaped.match(/'/g) || []).length;
  return quoteCount % 2 === 0;
}

interface TableRef {
  raw: string;
  parts: string[];
}

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
      notes.push({ severity: 'error', message: `Duplicate/double schema in table reference "${ref.raw}".` });
      schemasUsed.add(ref.parts[0].toUpperCase());
      return;
    }

    if (ref.parts.length === 1) {
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

function visualizeSpaces(value: string): string {
  return value.replace(/ /g, '\u2423');
}

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

function extractBalancedParen(text: string, openIndex: number): { content: string; endIndex: number } | null {
  let depth = 0;
  let inQuote = false;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") inQuote = !inQuote;
    if (!inQuote) {
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) return { content: text.slice(openIndex + 1, i), endIndex: i };
      }
    }
  }
  return null;
}

function extractValueTuples(text: string, scanFromIndex: number): string[] {
  const tuples: string[] = [];
  let i = scanFromIndex;
  while (i < text.length) {
    while (i < text.length && /[\s,]/.test(text[i])) i++;
    if (text[i] !== '(') break;
    const result = extractBalancedParen(text, i);
    if (!result) break;
    tuples.push(result.content);
    i = result.endIndex + 1;
  }
  return tuples;
}

interface InsertMatchResult {
  cols: number;
  totalTuples: number;
  mismatchedTuples: { tupleIndex: number; vals: number }[];
  valid: boolean;
}

function validateInsertColumnsMatchValues(text: string): InsertMatchResult | null {
  const upper = text.toUpperCase();
  const valuesMatch = upper.match(/\bVALUES\b/);
  if (!valuesMatch || valuesMatch.index === undefined) return null;
  const valuesIdx = valuesMatch.index;

  const colOpenIdx = text.indexOf('(');
  if (colOpenIdx === -1 || colOpenIdx > valuesIdx) return null; 

  const colResult = extractBalancedParen(text, colOpenIdx);
  if (!colResult) return null;
  const cols = splitArgs(colResult.content).length;

  const tuples = extractValueTuples(text, valuesIdx + 'VALUES'.length);
  if (tuples.length === 0) return null;

  const mismatchedTuples = tuples
    .map((tuple, idx) => ({ tupleIndex: idx + 1, vals: splitArgs(tuple).length }))
    .filter(t => t.vals !== cols);

  return { cols, totalTuples: tuples.length, mismatchedTuples, valid: mismatchedTuples.length === 0 };
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

  // Check for line breaks inside the SQL query
  if (stmt.text.includes('\n') || stmt.text.includes('\r')) {
    push('error', 'Line breaks are not allowed inside a SQL query.');
  }

  // Rule 2: statement type must be one of the allowed set
  if (statementType === 'UNKNOWN') {
    push('error', 'Unknown or unsupported statement type.');
    return messages; 
  }

  // Rule 3: semicolon termination
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

  // Rule 1: schema must be consistent across the statement
  validateSchemaAndEnvironment(stmt.text, statementType, environment).forEach(n =>
    push(n.severity, n.message)
  );

  // Rule: flag stray leading/trailing/double spaces
  findSpacingIssues(stmt.text).forEach(({ value, issues }) => {
    push('warning', `Spacing issue (${issues.join(', ')}) in value: "${visualizeSpaces(value)}".`);
  });

  // Rule 6: INSERT validation
  if (statementType === 'INSERT') {
    const match = validateInsertColumnsMatchValues(stmt.text);
    if (match) {
      if (!match.valid) {
        match.mismatchedTuples.forEach(t => {
          push('error', `Column/value mismatch in VALUES row ${t.tupleIndex}${match.totalTuples > 1 ? ` of ${match.totalTuples}` : ''}: ${match.cols} columns vs ${t.vals} values.`);
        });
      } else {
        push('success', `INSERT validation passed (${match.totalTuples} row${match.totalTuples !== 1 ? 's' : ''}).`);
      }
      
      // FIELD_NAME / FIELD_VALUE space validation & EIS_DMZ domain check
      const colOpenIdx = stmt.text.indexOf('(');
      const colResult = extractBalancedParen(stmt.text, colOpenIdx);
      if (colResult) {
        const columns = splitArgs(colResult.content).map(c => c.toUpperCase().replace(/['"]/g, '').trim());
        const fieldNameIdx = columns.indexOf('FIELD_NAME');
        const fieldValueIdx = columns.indexOf('FIELD_VALUE');

        if (fieldNameIdx !== -1 || fieldValueIdx !== -1) {
          const valuesIdx = upper.match(/\bVALUES\b/)?.index;
          if (valuesIdx !== undefined) {
            const tuples = extractValueTuples(stmt.text, valuesIdx + 'VALUES'.length);
            
            tuples.forEach((tuple, tIdx) => {
              const vals = splitArgs(tuple);

              // Rule: No spaces allowed in FIELD_NAME or FIELD_VALUE parameter values
              [fieldNameIdx, fieldValueIdx].forEach(idx => {
                if (idx !== -1 && vals[idx]) {
                  const valInside = vals[idx].replace(/^'|'$/g, '');
                  if (valInside.includes(' ')) {
                    push('error', `Space not allowed in parameter value for ${columns[idx]} (row ${tIdx + 1}).`);
                  }
                }
              });

              // Rule: If FIELD_NAME contains EIS_DMZ, FIELD_VALUE must have siservices.bank.sbi
              if (fieldNameIdx !== -1 && fieldValueIdx !== -1 && vals[fieldNameIdx] && vals[fieldValueIdx]) {
                const fnVal = vals[fieldNameIdx].replace(/^'|'$/g, '');
                const fvVal = vals[fieldValueIdx].replace(/^'|'$/g, '');
                if (fnVal.includes('EIS_DMZ') && !fvVal.toLowerCase().includes('siservices.bank.sbi')) {
                  push('error', `FIELD_NAME containing EIS_DMZ must have "siservices.bank.sbi" as domain in FIELD_VALUE (row ${tIdx + 1}).`);
                }
              }
            });
          }
        }
      }
    }
  }

  // Rule 7 & 8: UPDATE checks
  if (statementType === 'UPDATE') {
    if (!upper.includes('SET')) {
      push('error', 'UPDATE statement missing SET clause.');
    }
    if (!upper.includes('WHERE')) {
      push('warning', 'UPDATE without WHERE clause.');
    }

    // Check for spaces in UPDATE statements modifying FIELD_NAME or FIELD_VALUE
    const updateFieldRegex = /(FIELD_NAME|FIELD_VALUE)\s*=\s*'([^']*)'/gi;
    let fieldMatch;
    while ((fieldMatch = updateFieldRegex.exec(stmt.text)) !== null) {
      if (fieldMatch[2].includes(' ')) {
        push('error', `Space not allowed in parameter value for ${fieldMatch[1].toUpperCase()}.`);
      }
    }

    // Domain check for EIS_DMZ in UPDATE statements
    if (upper.includes('EIS_DMZ') && !stmt.text.toLowerCase().includes('siservices.bank.sbi')) {
      push('error', 'Update containing EIS_DMZ must have "siservices.bank.sbi" as domain.');
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

function validateSql(sql: string, environment: Environment): ValidationSummary {
  const fragments = parseAllFragments(sql);
  const statements = fragments.filter(f => !f.isCommit);

  const queryReports: QueryReport[] = statements.map((stmt, i) => {
    const queryNumber = i + 1;
    const messages = validateStatement(stmt, queryNumber, sql, environment);

    if (environment === 'PROD') {
      const positionInAll = fragments.indexOf(stmt);
      const nextFragment = fragments[positionInAll + 1];
      if (!nextFragment || !nextFragment.isCommit) {
        messages.push({
          queryNumber,
          line: getLineNumber(sql, stmt.startIndex),
          severity: 'error',
          message: 'PROD requires a COMMIT; immediately after this query.',
        });
      }
    }

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


// ============================================================================
// Main React Component
// ============================================================================

export default function YamlTool(): ReactElement {
  const [formData, setFormData] = useState<FormData>({
    apiName: '',
    node: '',
    server: '',
    deploy: '',
    environment: 'DEV',
    sql: ''
  });
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const sqlInputRef = useRef<HTMLTextAreaElement>(null);

  const handleSqlChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSql = e.target.value;
    setFormData(prev => ({ ...prev, sql: newSql }));
    
    const domSchema = detectDominantSchema(newSql);
    if (domSchema) {
      const env = schemaToEnvironment(domSchema);
      if (env) {
        setFormData(prev => ({ ...prev, environment: env }));
      }
    }
  }, []);

  const handleValidate = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = validateSql(formData.sql, formData.environment);
      setSummary(result);
      setIsProcessing(false);
    }, 150); // Small timeout to show loading state if desired
  }, [formData]);

  const hasIssues = useMemo(() => {
    if (!summary) return false;
    return summary.totalErrors > 0 || summary.totalWarnings > 0;
  }, [summary]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-slate-800">
      
      {/* Header utilizing icons */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center space-x-2">
          <Database className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">SQL Deployment Validator</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Settings className="w-5 h-5 text-slate-500" />
          <LayoutDashboard className="w-5 h-5 text-slate-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Form & SQL Input */}
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="flex items-center text-sm font-semibold text-slate-700">
              <Rocket className="w-4 h-4 mr-2" /> Target Environment
            </label>
            <div className="relative">
              <select
                className="w-full p-2 border rounded appearance-none pr-8"
                value={formData.environment}
                onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value as Environment }))}
              >
                {ENVIRONMENTS.map(env => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-semibold text-slate-700">
                <Terminal className="w-4 h-4 mr-2" /> SQL Query
              </label>
              <CopyButton text={formData.sql} />
            </div>
            <textarea
              ref={sqlInputRef}
              className="w-full p-3 border rounded font-mono text-sm h-64 focus:ring focus:ring-blue-200 outline-none"
              placeholder="Paste your SQL here..."
              value={formData.sql}
              onChange={handleSqlChange}
            />
          </div>

          <button
            onClick={handleValidate}
            disabled={isProcessing || !formData.sql.trim()}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-2 rounded font-medium transition-colors"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ListChecks className="w-5 h-5" />}
            <span>Validate SQL</span>
          </button>
        </div>

        {/* Right Column: Results Summary */}
        <div className="space-y-4 bg-slate-50 p-4 rounded border">
          <h2 className="flex items-center text-lg font-bold">
            <Eye className="w-5 h-5 mr-2" /> Validation Report
          </h2>

          {!summary ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8" />
              <p>Enter SQL and run validation to see the report.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="p-2 bg-white rounded border">
                  <div className="font-bold text-lg">{summary.totalQueries}</div>
                  <div className="text-slate-500">Queries</div>
                </div>
                <div className="p-2 bg-red-50 text-red-700 rounded border border-red-100">
                  <div className="font-bold text-lg">{summary.totalErrors}</div>
                  <div>Errors</div>
                </div>
                <div className="p-2 bg-yellow-50 text-yellow-700 rounded border border-yellow-100">
                  <div className="font-bold text-lg">{summary.totalWarnings}</div>
                  <div>Warnings</div>
                </div>
              </div>

              {/* Status Banner */}
              {summary.totalErrors === 0 && summary.totalWarnings === 0 ? (
                <div className="flex items-center p-3 bg-green-100 text-green-800 rounded">
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  <span className="font-medium">All checks passed successfully.</span>
                </div>
              ) : hasIssues && summary.totalErrors === 0 ? (
                <div className="flex items-center p-3 bg-yellow-100 text-yellow-800 rounded">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Passed with warnings. Please review.</span>
                </div>
              ) : (
                <div className="flex items-center p-3 bg-red-100 text-red-800 rounded">
                  <ShieldAlert className="w-5 h-5 mr-2" />
                  <span className="font-medium">Validation failed. Fix errors to proceed.</span>
                </div>
              )}

              {/* Detailed Messages */}
              {hasIssues && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {summary.allMessages
                    .filter(m => m.severity !== 'success')
                    .map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 text-sm rounded border flex items-start space-x-2 ${
                        msg.severity === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-yellow-50 border-yellow-200 text-yellow-900'
                      }`}
                    >
                      {msg.severity === 'error' ? (
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600" />
                      )}
                      <div>
                        <span className="font-bold mr-1">Query {msg.queryNumber} (Line {msg.line}):</span>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Success Messages toggle could go here, omitting for brevity but ensuring imports are used */}
              {!hasIssues && summary.totalQueries > 0 && (
                <div className="flex justify-center text-green-600 pt-4">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
