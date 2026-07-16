import { useState, useMemo, useCallback } from 'react';
import {
  Clipboard, LayoutDashboard, Database, Settings, CheckCircle2,
  Terminal, ChevronDown, Rocket, Layers, Globe, Server, ListChecks,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type Environment = 'DEV' | 'SIT' | 'UAT' | 'PROD';
type YesNoD = 'Y' | 'N' | 'D';
type DbLoggingValue = 'N' | 'Y' | 'H';

interface CacheFormState {
  destination: string;
  type: string;
  subtype: string;
  sourceIds: string;
  thirdPartyUrl: string;
  dmzUrl: string;
  wireDmzInMaster: boolean;
  contentCheck: YesNoD;
  serviceName: string;
  sysUrl: string;
  sysHttpTimeout: string;
  httpTimeout: string;
  arrayHandle: string;
  dbLoggingFieldName: string;
  dbLoggingValue: DbLoggingValue;
  environment: Environment;
  addCommitAfterEachQuery: boolean;
  includeSysCache: boolean;
  includeTxnCache: boolean;
  includeAccessMaster: boolean;
  includeApiMaster: boolean;
  includeApiParameter: boolean;
}

interface GeneratedStatement {
  section: string;
  sql: string;
}

// ============================================================================
// Constants
// ============================================================================

const ENV_SCHEMA_MAP: Record<Environment, string> = {
  DEV: 'EISDEV',
  SIT: 'EISSIT',
  UAT: 'EISAPP',
  PROD: 'EISAPP',
};
const ENVIRONMENTS: Environment[] = ['DEV', 'SIT', 'UAT', 'PROD'];
const NULL_LIT = "'NULL'";
const NOW = 'TRUNC(SYSDATE)';

const DEFAULT_FORM: CacheFormState = {
  destination: '',
  type: '',
  subtype: '',
  sourceIds: '',
  thirdPartyUrl: '',
  dmzUrl: '',
  wireDmzInMaster: false,
  contentCheck: 'Y',
  serviceName: '',
  sysUrl: '',
  sysHttpTimeout: '10',
  httpTimeout: '15',
  arrayHandle: 'O',
  dbLoggingFieldName: '',
  dbLoggingValue: 'N',
  environment: 'DEV',
  addCommitAfterEachQuery: false,
  includeSysCache: true,
  includeTxnCache: true,
  includeAccessMaster: true,
  includeApiMaster: true,
  includeApiParameter: true,
};

// ============================================================================
// Pure generation logic
// ============================================================================

const escapeSql = (value: string) => value.replace(/'/g, "''");
const lit = (value: string) => `'${escapeSql(value)}'`;

function parseSourceIds(raw: string): string[] {
  return raw.split('|').map(s => s.trim()).filter(Boolean);
}

function insertStmt(schema: string, table: string, columns: string[], values: string[]): string {
  return `INSERT INTO ${schema}.${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
}

/**
 * Builds every INSERT statement for a third-party cache onboarding, mirroring
 * the field-naming conventions observed in the reference script: SYS-level
 * cache keys are DEST_TYPE_..., TXN-level keys are DEST_TYPE_SUBTYPE_...
 * (except HTTPTimeOut, which — matching the reference exactly — stays at the
 * DEST_TYPE level even though it's configured per subtype), and the
 * SOURCE_ID cache row's key has no suffix at all.
 */
function generateCacheStatements(form: CacheFormState): GeneratedStatement[] {
  const schema = ENV_SCHEMA_MAP[form.environment];
  const { destination: dest, type, subtype } = form;
  const prefixType = `${dest}_${type}`;
  const prefixSub = `${dest}_${type}_${subtype}`;
  const sourceIds = parseSourceIds(form.sourceIds);
  const allowedSource = sourceIds.join('|');
  const statements: GeneratedStatement[] = [];

  const cacheColumns = [
    'FIELD_NAME', 'FIELD_VALUE', 'REQUEST_ACTION', 'PROCESSING_ACTION', 'RESPONSE_ACTION',
    'SOURCE_ID', 'BACKEND_TYPE', 'BACKEND_SUB_TYPE', 'TRAN_CODE', 'SERVICE_NAME', 'CREATION_TIME',
  ];
  const cacheRow = (fieldName: string, fieldValue: string, requestAction: string): string =>
    insertStmt(schema, 'CACHE_DETAILS', cacheColumns, [
      lit(fieldName), lit(fieldValue), lit(requestAction), NULL_LIT, NULL_LIT, "'MULTIPLE'",
      lit(type), lit(subtype), lit(dest), lit(form.serviceName), NOW,
    ]);

  if (form.includeSysCache) {
    statements.push({ section: 'SYS Cache', sql: cacheRow(`${prefixType}_Sys_Service`, form.serviceName, 'Sys_SERVICE') });
    statements.push({ section: 'SYS Cache', sql: cacheRow(`${prefixType}_Sys_URL`, form.sysUrl, 'Sys_URL') });
    statements.push({ section: 'SYS Cache', sql: cacheRow(`${prefixType}_Sys_HTTPTimeout`, form.sysHttpTimeout, 'Sys_HTTPTimeout') });
  }

  if (form.includeTxnCache) {
    statements.push({ section: 'TXN Cache', sql: cacheRow(`${prefixSub}_CONTENT_CHECK`, form.contentCheck, 'CONTENT_CHECK') });
    statements.push({ section: 'TXN Cache', sql: cacheRow(prefixSub, allowedSource, 'SOURCE_ID') });
    statements.push({ section: 'TXN Cache', sql: cacheRow(`${prefixSub}_ARRAY_HANDLE`, form.arrayHandle, 'ARRAY_HANDLE') });
    statements.push({ section: 'TXN Cache', sql: cacheRow(`${prefixSub}_THIRD_PARTY_URL`, form.thirdPartyUrl, 'THIRD_PARTY_URL') });
    if (form.dmzUrl.trim()) {
      statements.push({ section: 'TXN Cache', sql: cacheRow(`${prefixSub}_EIS_DMZ_URL`, form.dmzUrl, 'THIRD_PARTY_URL') });
    }
    if (form.dbLoggingFieldName.trim()) {
      statements.push({ section: 'TXN Cache', sql: cacheRow(form.dbLoggingFieldName.trim(), form.dbLoggingValue, 'NULL') });
    }
    statements.push({ section: 'TXN Cache', sql: cacheRow(`${prefixType}_HTTPTimeOut`, form.httpTimeout, 'HTTPTimeOut') });
  }

  if (form.includeAccessMaster) {
    // Whitelisted-source records — ST is always excluded per business rule.
    sourceIds.filter(id => id.toUpperCase() !== 'ST').forEach(id => {
      statements.push({
        section: 'Access Master',
        sql: insertStmt(
          schema, 'THIRD_PARTY_API_ACCESS_MASTER',
          ['DESTINATION', 'TXN_TYPE', 'TXN_SUB_TYPE', 'SOURCE_ID', 'SERVICE_ACTIVE', 'CREATION_DATE_TIME', 'MODIFIED_DATE_TIME'],
          [lit(dest), lit(type), lit(subtype), lit(id), "'Y'", NOW, NOW]
        ),
      });
    });
  }

  if (form.includeApiMaster) {
    const dmzProvided = form.dmzUrl.trim().length > 0;
    const routeUrl = form.wireDmzInMaster && dmzProvided ? lit(form.dmzUrl) : NULL_LIT;
    const routeUrlCache = form.wireDmzInMaster && dmzProvided ? lit(`${prefixSub}_EIS_DMZ_URL`) : NULL_LIT;
    statements.push({
      section: 'API Master',
      sql: insertStmt(
        schema, 'THIRD_PARTY_API_MASTER',
        [
          'DESTINATION', 'TXN_TYPE', 'TXN_SUB_TYPE', 'ACTUAL_URL', 'ROUTE_URL', 'ACTUAL_URL_CACHE', 'ROUTE_URL_CACHE',
          'ALLOWED_SOURCE', 'ALLOWED_SOURCE_CACHE', 'CREATION_DATE_TIME', 'MODIFIED_DATE_TIME', 'DB_ENCRYPTED',
          'DB_ENCRYPTED_CACHE', 'CONTENT_CHECK', 'CONTENT_CHECK_CACHE', 'HTTPTIMEOUT', 'HTTPTIMEOUT_CACHE',
          'SYS_URL_CACHE', 'SYS_URL', 'SYS_SERVICE', 'SYS_SERVICE_CACHE',
        ],
        [
          lit(dest), lit(type), lit(subtype), lit(form.thirdPartyUrl), routeUrl, lit(`${prefixSub}_THIRD_PARTY_URL`), routeUrlCache,
          lit(allowedSource), lit(prefixSub), NOW, NOW, NULL_LIT,
          NULL_LIT, lit(form.contentCheck), lit(`${prefixSub}_CONTENT_CHECK`), lit(form.httpTimeout), lit(`${prefixType}_HTTPTimeOut`),
          lit(`${prefixType}_Sys_URL`), lit(form.sysUrl), lit(form.serviceName), lit(`${prefixType}_Sys_Service`),
        ]
      ),
    });
  }

  if (form.includeApiParameter) {
    statements.push({
      section: 'API Parameter',
      sql: insertStmt(schema, 'THIRD_PARTY_API_PARAMETER', ['DESTINATION', 'CREATION_DATE_TIME'], [lit(dest), NOW]),
    });
  }

  return statements;
}

function buildScript(statements: GeneratedStatement[], addCommit: boolean): string {
  const lines = statements.map(s => (addCommit ? `${s.sql}\nCOMMIT;` : s.sql));
  return lines.join('\n\n');
}

// ============================================================================
// Component
// ============================================================================

const SECTION_TOGGLES: { key: keyof CacheFormState; label: string; hint: string }[] = [
  { key: 'includeSysCache', label: 'SYS Cache', hint: 'Service / URL / timeout (per destination+type)' },
  { key: 'includeTxnCache', label: 'TXN Cache', hint: 'Content check, source, URLs, DB logging, timeout' },
  { key: 'includeAccessMaster', label: 'Access Master', hint: 'One row per source ID (ST excluded)' },
  { key: 'includeApiMaster', label: 'API Master', hint: 'Destination/type/subtype routing record' },
  { key: 'includeApiParameter', label: 'API Parameter', hint: 'Destination-level parameter row' },
];

export default function CacheGeneratorTool({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<CacheFormState>(DEFAULT_FORM);
  const [dbLoggingTouched, setDbLoggingTouched] = useState(false);
  const [statements, setStatements] = useState<GeneratedStatement[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const set = <K extends keyof CacheFormState>(key: K, value: CacheFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const setIdentityField = (key: 'destination' | 'type' | 'subtype', value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (!dbLoggingTouched) {
        next.dbLoggingFieldName = `${next.destination}_${next.type}_${next.subtype}_DB_LOGGING`.replace(/^_+|_+$/g, '');
      }
      return next;
    });
  };

  const isValid = form.destination.trim() && form.type.trim() && form.subtype.trim() &&
    form.sourceIds.trim() && form.thirdPartyUrl.trim() && form.serviceName.trim() && form.sysUrl.trim();

  const grouped = useMemo(() => {
    if (!statements) return null;
    const bySection = new Map<string, string[]>();
    statements.forEach(s => {
      const arr = bySection.get(s.section) ?? [];
      arr.push(s.sql);
      bySection.set(s.section, arr);
    });
    return bySection;
  }, [statements]);

  const handleGenerate = useCallback(() => {
    setStatements(generateCacheStatements(form));
  }, [form]);

  const handleCopy = useCallback((label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const fullScript = statements ? buildScript(statements, form.addCommitAfterEachQuery) : '';

  return (
    <div className="min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] flex flex-col gap-4 sm:gap-6 font-sans">
      <div className="flex-none flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:opacity-75 transition-all">
          <LayoutDashboard size={20} /> Back to Dashboard
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-hidden min-h-0">
        {/* -------------------- Form column -------------------- */}
        <div className="flex-1 lg:max-w-md flex flex-col gap-4 sm:gap-6 overflow-y-auto min-h-0 pr-1">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Layers size={16} className="text-indigo-500" /> Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Destination (e.g. SBI_LIFE)" value={form.destination} className={inputClass} onChange={e => setIdentityField('destination', e.target.value.toUpperCase())} />
              <input placeholder="Type (e.g. CRM)" value={form.type} className={inputClass} onChange={e => setIdentityField('type', e.target.value.toUpperCase())} />
              <input placeholder="Subtype (e.g. CASE_CREATE)" value={form.subtype} className={`${inputClass} sm:col-span-2`} onChange={e => setIdentityField('subtype', e.target.value.toUpperCase())} />
              <div className="relative sm:col-span-2">
                <select value={form.environment} className={`${inputClass} appearance-none cursor-pointer`} onChange={e => set('environment', e.target.value as Environment)}>
                  {ENVIRONMENTS.map(env => (
                    <option key={env} value={env}>{env} ({ENV_SCHEMA_MAP[env]})</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Globe size={16} className="text-indigo-500" /> Routing
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Source IDs, pipe-separated (e.g. ST|CR|SBILF)" value={form.sourceIds} className={inputClass} onChange={e => set('sourceIds', e.target.value.toUpperCase())} />
              <input placeholder="Third-party URL" value={form.thirdPartyUrl} className={inputClass} onChange={e => set('thirdPartyUrl', e.target.value)} />
              <input placeholder="DMZ URL (optional)" value={form.dmzUrl} className={inputClass} onChange={e => set('dmzUrl', e.target.value)} />
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-1">
                <input type="checkbox" checked={form.wireDmzInMaster} onChange={e => set('wireDmzInMaster', e.target.checked)} className="rounded accent-indigo-600" disabled={!form.dmzUrl.trim()} />
                Route API Master through DMZ URL (otherwise the cache entry is created but left unwired, same as the reference)
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Server size={16} className="text-indigo-500" /> Sys Service
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Service name (e.g. thirdPartySBILife_sys)" value={form.serviceName} className={`${inputClass} sm:col-span-2`} onChange={e => set('serviceName', e.target.value)} />
              <input placeholder="Sys URL" value={form.sysUrl} className={`${inputClass} sm:col-span-2`} onChange={e => set('sysUrl', e.target.value)} />
              <input placeholder="Sys HTTP timeout" value={form.sysHttpTimeout} className={inputClass} onChange={e => set('sysHttpTimeout', e.target.value)} />
              <input placeholder="Array handle" value={form.arrayHandle} className={inputClass} onChange={e => set('arrayHandle', e.target.value)} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Settings size={16} className="text-indigo-500" /> Txn Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <select value={form.contentCheck} className={`${inputClass} appearance-none cursor-pointer`} onChange={e => set('contentCheck', e.target.value as YesNoD)}>
                  <option value="Y">Content Check: Y</option>
                  <option value="N">Content Check: N</option>
                  <option value="D">Content Check: D</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400"><ChevronDown size={14} /></div>
              </div>
              <input placeholder="HTTP timeout" value={form.httpTimeout} className={inputClass} onChange={e => set('httpTimeout', e.target.value)} />
              <input
                placeholder="DB logging field name"
                value={form.dbLoggingFieldName}
                className={`${inputClass} sm:col-span-2`}
                onChange={e => { setDbLoggingTouched(true); set('dbLoggingFieldName', e.target.value); }}
              />
              <div className="relative sm:col-span-2">
                <select value={form.dbLoggingValue} className={`${inputClass} appearance-none cursor-pointer`} onChange={e => set('dbLoggingValue', e.target.value as DbLoggingValue)}>
                  <option value="N">DB Logging: N</option>
                  <option value="Y">DB Logging: Y</option>
                  <option value="H">DB Logging: H</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400"><ChevronDown size={14} /></div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <ListChecks size={16} className="text-indigo-500" /> Queries to Generate
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {SECTION_TOGGLES.map(t => (
                <label key={t.key} className="flex items-start gap-2 text-sm dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form[t.key] as boolean}
                    onChange={e => set(t.key, e.target.checked as CacheFormState[typeof t.key])}
                    className="mt-0.5 rounded accent-indigo-600"
                  />
                  <span>
                    <span className="font-semibold">{t.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{t.hint}</span>
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm dark:text-slate-200 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <input type="checkbox" checked={form.addCommitAfterEachQuery} onChange={e => set('addCommitAfterEachQuery', e.target.checked)} className="rounded accent-indigo-600" />
                <span className="font-semibold">Add COMMIT; after each query</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!isValid}
            className="flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Rocket size={16} /> Generate Queries
          </button>
        </div>

        {/* -------------------- Output column -------------------- */}
        <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden h-full min-h-[420px] lg:min-h-0">
          <div className="flex-none p-3 sm:p-4 bg-slate-900 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-slate-500 flex-none" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                {statements ? `${statements.length} Statement${statements.length !== 1 ? 's' : ''} Generated` : 'Log: Configuration'}
              </span>
            </div>
            {statements && statements.length > 0 && (
              <button
                onClick={() => handleCopy('__all__', fullScript)}
                className={`text-xs font-bold flex items-center gap-2 transition-colors ${copied === '__all__' ? 'text-emerald-400' : 'text-indigo-400 hover:text-indigo-300'}`}
              >
                {copied === '__all__' ? <CheckCircle2 size={14} /> : <Clipboard size={14} />}
                {copied === '__all__' ? 'Copied All' : 'Copy All'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed custom-scrollbar min-h-0 space-y-6">
            {grouped && grouped.size > 0 ? (
              [...grouped.entries()].map(([section, sqls]) => (
                <div key={section} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">{section}</span>
                    <button
                      onClick={() => handleCopy(section, sqls.join('\n\n'))}
                      className={`text-[11px] font-bold flex items-center gap-1.5 transition-colors ${copied === section ? 'text-emerald-400' : 'text-indigo-400 hover:text-indigo-300'}`}
                    >
                      {copied === section ? <CheckCircle2 size={12} /> : <Clipboard size={12} />}
                      {copied === section ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-emerald-400 whitespace-pre-wrap break-all">{sqls.join('\n\n')}</pre>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 dark:text-slate-600 italic">
                <Database size={32} className="opacity-10 mb-2" />
                <p className="text-xs text-center">Fill in the form and generate cache onboarding queries.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass = 'w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white';
