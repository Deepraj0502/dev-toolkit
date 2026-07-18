import { useState, useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  Database,
  Settings,
  Terminal,
  ChevronDown,
  Rocket,
  Layers,
  Globe,
  Server,
  ListChecks,
} from "lucide-react";
import { CopyButton } from "./CopyButton";

// ============================================================================
// Types
// ============================================================================

type Environment = "DEV" | "SIT" | "UAT" | "PROD";
type YesNoD = "Y" | "N" | "D";
type DbLoggingValue = "N" | "Y" | "H";
type ArrayHandle = "O" | "N";
type GenerationMode = "SQL" | "SERVER_CACHE";

/**
 * Keys whose values are cache FIELD_NAMEs rather than FIELD_VALUEs.
 * Each is auto-derived from destination/type/subtype the moment those
 * change, but stays user-editable afterward — see `touchedFieldNames`.
 */
type FieldNameKey =
  | "sysServiceFieldName"
  | "sysUrlFieldName"
  | "sysHttpTimeoutFieldName"
  | "contentCheckFieldName"
  | "sourceIdFieldName"
  | "arrayHandleFieldName"
  | "thirdPartyUrlFieldName"
  | "dmzUrlFieldName"
  | "httpTimeoutFieldName"
  | "dbLoggingFieldName";

const FIELD_NAME_KEYS: FieldNameKey[] = [
  "sysServiceFieldName",
  "sysUrlFieldName",
  "sysHttpTimeoutFieldName",
  "contentCheckFieldName",
  "sourceIdFieldName",
  "arrayHandleFieldName",
  "thirdPartyUrlFieldName",
  "dmzUrlFieldName",
  "httpTimeoutFieldName",
  "dbLoggingFieldName",
];

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
  arrayHandle: ArrayHandle;
  dbLoggingValue: DbLoggingValue;
  environment: Environment;
  addCommitAfterEachQuery: boolean;
  includeSysCache: boolean;
  includeTxnCache: boolean;
  includeAccessMaster: boolean;
  includeApiMaster: boolean;
  includeApiParameter: boolean;

  mode: GenerationMode;
  serverCacheHost: string;

  sysServiceFieldName: string;
  sysUrlFieldName: string;
  sysHttpTimeoutFieldName: string;
  contentCheckFieldName: string;
  sourceIdFieldName: string;
  arrayHandleFieldName: string;
  thirdPartyUrlFieldName: string;
  dmzUrlFieldName: string;
  httpTimeoutFieldName: string;
  dbLoggingFieldName: string;
}

interface GeneratedStatement {
  section: string;
  content: string;
}

interface ServerCacheField {
  FIELD_NAME: string;
  FIELD_VALUE: string;
}

// ============================================================================
// Constants
// ============================================================================

const ENV_SCHEMA_MAP: Record<Environment, string> = {
  DEV: "EISDEV",
  SIT: "EISSIT",
  UAT: "EISAPP",
  PROD: "EISAPP",
};
const ENVIRONMENTS: Environment[] = ["DEV", "SIT", "UAT", "PROD"];
const NULL_LIT = "'NULL'";
const NOW = "TRUNC(SYSDATE)";

const stripEdgeUnderscores = (value: string) => value.replace(/^_+|_+$/g, "");

/**
 * Recomputes every auto-generated cache FIELD_NAME from the current
 * destination/type/subtype. Called on every identity-field keystroke;
 * only keys the user hasn't manually edited (see `touchedFieldNames`)
 * get overwritten with the result.
 */
function computeDefaultFieldNames(
  destination: string,
  type: string,
  subtype: string,
): Record<FieldNameKey, string> {
  const prefixType = stripEdgeUnderscores(`${destination}_${type}`);
  const prefixSub = stripEdgeUnderscores(`${destination}_${type}_${subtype}`);
  return {
    sysServiceFieldName: stripEdgeUnderscores(`${prefixType}_Sys_Service`),
    sysUrlFieldName: stripEdgeUnderscores(`${prefixType}_Sys_URL`),
    sysHttpTimeoutFieldName: stripEdgeUnderscores(
      `${prefixType}_Sys_HTTPTimeout`,
    ),
    contentCheckFieldName: stripEdgeUnderscores(`${prefixSub}_CONTENT_CHECK`),
    sourceIdFieldName: prefixSub,
    arrayHandleFieldName: stripEdgeUnderscores(`${prefixSub}_ARRAY_HANDLE`),
    thirdPartyUrlFieldName: stripEdgeUnderscores(
      `${prefixSub}_THIRD_PARTY_URL`,
    ),
    dmzUrlFieldName: stripEdgeUnderscores(`${prefixSub}_EIS_DMZ_URL`),
    httpTimeoutFieldName: stripEdgeUnderscores(`${prefixType}_HTTPTimeOut`),
    dbLoggingFieldName: stripEdgeUnderscores(`${prefixSub}_DB_LOGGING`),
  };
}

const DEFAULT_FORM: CacheFormState = {
  destination: "",
  type: "",
  subtype: "",
  sourceIds: "",
  thirdPartyUrl: "",
  dmzUrl: "",
  wireDmzInMaster: false,
  contentCheck: "Y",
  serviceName: "",
  sysUrl: "",
  sysHttpTimeout: "10",
  httpTimeout: "15",
  arrayHandle: "O",
  dbLoggingValue: "N",
  environment: "DEV",
  addCommitAfterEachQuery: false,
  includeSysCache: true,
  includeTxnCache: true,
  includeAccessMaster: true,
  includeApiMaster: true,
  includeApiParameter: true,
  mode: "SQL",
  serverCacheHost: "10.177.44.[21-27]:8002",
  ...computeDefaultFieldNames("", "", ""),
};

// ============================================================================
// Pure generation logic — SQL mode
// ============================================================================

const escapeSql = (value: string) => value.replace(/'/g, "''");
const lit = (value: string) => `'${escapeSql(value)}'`;

function parseSourceIds(raw: string): string[] {
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function insertStmt(
  schema: string,
  table: string,
  columns: string[],
  values: string[],
): string {
  return `INSERT INTO ${schema}.${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
}

/**
 * Builds every INSERT statement for a third-party cache onboarding.
 * Field names are read directly from the form's editable FieldNameKey
 * inputs (auto-populated from destination/type/subtype, but user
 * overrides win) rather than being recomputed inline.
 */
function generateCacheStatements(form: CacheFormState): GeneratedStatement[] {
  const schema = ENV_SCHEMA_MAP[form.environment];
  const { destination: dest, type, subtype } = form;
  const sourceIds = parseSourceIds(form.sourceIds);
  const allowedSource = sourceIds.join("|");
  const statements: GeneratedStatement[] = [];

  const cacheColumns = [
    "FIELD_NAME",
    "FIELD_VALUE",
    "REQUEST_ACTION",
    "PROCESSING_ACTION",
    "RESPONSE_ACTION",
    "SOURCE_ID",
    "BACKEND_TYPE",
    "BACKEND_SUB_TYPE",
    "TRAN_CODE",
    "SERVICE_NAME",
    "CREATION_TIME",
  ];
  const cacheRow = (
    fieldName: string,
    fieldValue: string,
    requestAction: string,
  ): string =>
    insertStmt(schema, "CACHE_DETAILS", cacheColumns, [
      lit(fieldName),
      lit(fieldValue),
      lit(requestAction),
      NULL_LIT,
      NULL_LIT,
      "'MULTIPLE'",
      lit(type),
      lit(subtype),
      lit(dest),
      lit(form.serviceName),
      NOW,
    ]);

  if (form.includeSysCache) {
    statements.push({
      section: "SYS Cache",
      content: cacheRow(
        form.sysServiceFieldName,
        form.serviceName,
        "Sys_SERVICE",
      ),
    });
    statements.push({
      section: "SYS Cache",
      content: cacheRow(form.sysUrlFieldName, form.sysUrl, "Sys_URL"),
    });
    statements.push({
      section: "SYS Cache",
      content: cacheRow(
        form.sysHttpTimeoutFieldName,
        form.sysHttpTimeout,
        "Sys_HTTPTimeout",
      ),
    });
  }

  if (form.includeTxnCache) {
    statements.push({
      section: "TXN Cache",
      content: cacheRow(
        form.contentCheckFieldName,
        form.contentCheck,
        "CONTENT_CHECK",
      ),
    });
    statements.push({
      section: "TXN Cache",
      content: cacheRow(form.sourceIdFieldName, allowedSource, "SOURCE_ID"),
    });
    statements.push({
      section: "TXN Cache",
      content: cacheRow(
        form.arrayHandleFieldName,
        form.arrayHandle,
        "ARRAY_HANDLE",
      ),
    });
    statements.push({
      section: "TXN Cache",
      content: cacheRow(
        form.thirdPartyUrlFieldName,
        form.thirdPartyUrl,
        "THIRD_PARTY_URL",
      ),
    });
    if (form.dmzUrl.trim()) {
      statements.push({
        section: "TXN Cache",
        content: cacheRow(form.dmzUrlFieldName, form.dmzUrl, "THIRD_PARTY_URL"),
      });
    }
    if (form.dbLoggingFieldName.trim()) {
      statements.push({
        section: "TXN Cache",
        content: cacheRow(
          form.dbLoggingFieldName.trim(),
          form.dbLoggingValue,
          "NULL",
        ),
      });
    }
    statements.push({
      section: "TXN Cache",
      content: cacheRow(
        form.httpTimeoutFieldName,
        form.httpTimeout,
        "HTTPTimeOut",
      ),
    });
  }

  if (form.includeAccessMaster) {
    // Whitelisted-source records — ST is always excluded per business rule.
    sourceIds
      .filter((id) => id.toUpperCase() !== "ST")
      .forEach((id) => {
        statements.push({
          section: "Access Master",
          content: insertStmt(
            schema,
            "THIRD_PARTY_API_ACCESS_MASTER",
            [
              "DESTINATION",
              "TXN_TYPE",
              "TXN_SUB_TYPE",
              "SOURCE_ID",
              "SERVICE_ACTIVE",
              "CREATION_DATE_TIME",
              "MODIFIED_DATE_TIME",
            ],
            [lit(dest), lit(type), lit(subtype), lit(id), "'Y'", NOW, NOW],
          ),
        });
      });
  }

  if (form.includeApiMaster) {
    const dmzProvided = form.dmzUrl.trim().length > 0;
    const routeUrl =
      form.wireDmzInMaster && dmzProvided ? lit(form.dmzUrl) : NULL_LIT;
    const routeUrlCache =
      form.wireDmzInMaster && dmzProvided
        ? lit(form.dmzUrlFieldName)
        : NULL_LIT;
    statements.push({
      section: "API Master",
      content: insertStmt(
        schema,
        "THIRD_PARTY_API_MASTER",
        [
          "DESTINATION",
          "TXN_TYPE",
          "TXN_SUB_TYPE",
          "ACTUAL_URL",
          "ROUTE_URL",
          "ACTUAL_URL_CACHE",
          "ROUTE_URL_CACHE",
          "ALLOWED_SOURCE",
          "ALLOWED_SOURCE_CACHE",
          "CREATION_DATE_TIME",
          "MODIFIED_DATE_TIME",
          "DB_ENCRYPTED",
          "DB_ENCRYPTED_CACHE",
          "CONTENT_CHECK",
          "CONTENT_CHECK_CACHE",
          "HTTPTIMEOUT",
          "HTTPTIMEOUT_CACHE",
          "SYS_URL_CACHE",
          "SYS_URL",
          "SYS_SERVICE",
          "SYS_SERVICE_CACHE",
        ],
        [
          lit(dest),
          lit(type),
          lit(subtype),
          lit(form.thirdPartyUrl),
          routeUrl,
          lit(form.thirdPartyUrlFieldName),
          routeUrlCache,
          lit(allowedSource),
          lit(form.sourceIdFieldName),
          NOW,
          NOW,
          NULL_LIT,
          NULL_LIT,
          lit(form.contentCheck),
          lit(form.contentCheckFieldName),
          lit(form.httpTimeout),
          lit(form.httpTimeoutFieldName),
          lit(form.sysUrlFieldName),
          lit(form.sysUrl),
          lit(form.serviceName),
          lit(form.sysServiceFieldName),
        ],
      ),
    });
  }

  if (form.includeApiParameter) {
    statements.push({
      section: "API Parameter",
      content: insertStmt(
        schema,
        "THIRD_PARTY_API_PARAMETER",
        ["DESTINATION", "CREATION_DATE_TIME"],
        [lit(dest), NOW],
      ),
    });
  }

  return statements;
}

function buildScript(
  statements: GeneratedStatement[],
  addCommit: boolean,
): string {
  const lines = statements.map((s) =>
    addCommit ? `${s.content}\nCOMMIT;` : s.content,
  );
  return lines.join("\n\n");
}

// ============================================================================
// Pure generation logic — Server Cache mode
// ============================================================================

/**
 * Builds only the CACHE_DETAILS-equivalent FIELD_NAME/FIELD_VALUE pairs
 * (SYS + TXN cache keys) — matching the shape the /cache/v1/loadCache
 * endpoint expects, with none of the SQL-only columns (REQUEST_ACTION,
 * BACKEND_TYPE, etc).
 */
function generateServerCacheFields(form: CacheFormState): ServerCacheField[] {
  const fields: ServerCacheField[] = [];
  const sourceIds = parseSourceIds(form.sourceIds);
  const allowedSource = sourceIds.join("|");

  if (form.includeSysCache) {
    fields.push({
      FIELD_NAME: form.sysServiceFieldName,
      FIELD_VALUE: form.serviceName,
    });
    fields.push({ FIELD_NAME: form.sysUrlFieldName, FIELD_VALUE: form.sysUrl });
    fields.push({
      FIELD_NAME: form.sysHttpTimeoutFieldName,
      FIELD_VALUE: form.sysHttpTimeout,
    });
  }

  if (form.includeTxnCache) {
    fields.push({
      FIELD_NAME: form.contentCheckFieldName,
      FIELD_VALUE: form.contentCheck,
    });
    fields.push({
      FIELD_NAME: form.sourceIdFieldName,
      FIELD_VALUE: allowedSource,
    });
    fields.push({
      FIELD_NAME: form.arrayHandleFieldName,
      FIELD_VALUE: form.arrayHandle,
    });
    fields.push({
      FIELD_NAME: form.thirdPartyUrlFieldName,
      FIELD_VALUE: form.thirdPartyUrl,
    });
    if (form.dmzUrl.trim()) {
      fields.push({
        FIELD_NAME: form.dmzUrlFieldName,
        FIELD_VALUE: form.dmzUrl,
      });
    }
    if (form.dbLoggingFieldName.trim()) {
      fields.push({
        FIELD_NAME: form.dbLoggingFieldName.trim(),
        FIELD_VALUE: form.dbLoggingValue,
      });
    }
    fields.push({
      FIELD_NAME: form.httpTimeoutFieldName,
      FIELD_VALUE: form.httpTimeout,
    });
  }

  return fields;
}

function buildServerCacheCurl(
  host: string,
  fields: ServerCacheField[],
): string {
  const json = JSON.stringify(fields, null, 4);
  const cleanHost = host.trim().replace(/\/+$/, "");
  return `curl -kX POST http://${cleanHost}/cache/v1/loadCache -d '${json}'`;
}

// ============================================================================
// Small presentational helpers
// ============================================================================

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function CacheFieldNameInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-semibold tracking-widest text-indigo-500 dark:text-indigo-400 uppercase mb-1 mt-1.5">
        Cache Field Name
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Auto-generated — edit if needed"
        className="w-full p-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg text-[11px] font-mono text-indigo-700 dark:text-indigo-300 outline-none focus:ring-2 ring-indigo-500"
      />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

const SECTION_TOGGLES: {
  key: keyof CacheFormState;
  label: string;
  hint: string;
}[] = [
  {
    key: "includeSysCache",
    label: "SYS Cache",
    hint: "Service / URL / timeout (per destination+type)",
  },
  {
    key: "includeTxnCache",
    label: "TXN Cache",
    hint: "Content check, source, URLs, DB logging, timeout",
  },
  {
    key: "includeAccessMaster",
    label: "Access Master",
    hint: "One row per source ID (ST excluded)",
  },
  {
    key: "includeApiMaster",
    label: "API Master",
    hint: "Destination/type/subtype routing record",
  },
  {
    key: "includeApiParameter",
    label: "API Parameter",
    hint: "Destination-level parameter row",
  },
];

// Only these two apply to server cache mode — Access/API Master/Parameter
// are SQL-table-only concepts and don't have a loadCache equivalent.
const SERVER_CACHE_TOGGLES = SECTION_TOGGLES.filter(
  (t) => t.key === "includeSysCache" || t.key === "includeTxnCache",
);

export default function CacheGeneratorTool({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<CacheFormState>(DEFAULT_FORM);
  const [touchedFieldNames, setTouchedFieldNames] = useState<Set<FieldNameKey>>(
    new Set(),
  );
  const [statements, setStatements] = useState<GeneratedStatement[] | null>(
    null,
  );
  // const [copied, setCopied] = useState<string | null>(null);

  const set = <K extends keyof CacheFormState>(
    key: K,
    value: CacheFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const setIdentityField = (
    key: "destination" | "type" | "subtype",
    value: string,
  ) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      const defaults = computeDefaultFieldNames(
        next.destination,
        next.type,
        next.subtype,
      );
      FIELD_NAME_KEYS.forEach((fnKey) => {
        if (!touchedFieldNames.has(fnKey)) {
          next[fnKey] = defaults[fnKey];
        }
      });
      return next;
    });
  };

  const setFieldName = (key: FieldNameKey, value: string) => {
    setTouchedFieldNames((prev) => new Set(prev).add(key));
    set(key, value);
  };

  const isValid =
    form.destination.trim() &&
    form.type.trim() &&
    form.subtype.trim() &&
    form.sourceIds.trim() &&
    form.thirdPartyUrl.trim() &&
    form.serviceName.trim() &&
    form.sysUrl.trim() &&
    (form.mode !== "SERVER_CACHE" || form.serverCacheHost.trim());

  const grouped = useMemo(() => {
    if (!statements) return null;
    const bySection = new Map<string, string[]>();
    statements.forEach((s) => {
      const arr = bySection.get(s.section) ?? [];
      arr.push(s.content);
      bySection.set(s.section, arr);
    });
    return bySection;
  }, [statements]);

  const handleGenerate = useCallback(() => {
    if (form.mode === "SQL") {
      setStatements(generateCacheStatements(form));
      return;
    }
    const fields = generateServerCacheFields(form);
    setStatements([
      {
        section: "Server Cache JSON",
        content: JSON.stringify(fields, null, 4),
      },
      {
        section: "CURL Request",
        content: buildServerCacheCurl(form.serverCacheHost, fields),
      },
    ]);
  }, [form]);

  const fullScript = statements
    ? buildScript(
        statements,
        form.mode === "SQL" && form.addCommitAfterEachQuery,
      )
    : "";

  return (
    <div className="min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] flex flex-col gap-4 sm:gap-6 font-sans">
      <div className="flex-none flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:opacity-75 transition-all"
        >
          <LayoutDashboard size={20} /> Back to Dashboard
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-hidden min-h-0">
        {/* -------------------- Form column -------------------- */}
        <div className="flex-1 lg:max-w-md flex flex-col gap-4 sm:gap-6 overflow-y-auto min-h-0 pr-1">
          {/* Mode toggle */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-1.5">
            <button
              onClick={() => set("mode", "SQL")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${form.mode === "SQL" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              <Database size={16} /> SQL Queries
            </button>
            <button
              onClick={() => set("mode", "SERVER_CACHE")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${form.mode === "SERVER_CACHE" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              <Server size={16} /> Server Cache + CURL
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Layers size={16} className="text-indigo-500" /> Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Destination">
                <input
                  placeholder="e.g. SBI_LIFE"
                  value={form.destination}
                  className={inputClass}
                  onChange={(e) =>
                    setIdentityField(
                      "destination",
                      e.target.value.toUpperCase(),
                    )
                  }
                />
              </Field>
              <Field label="Type">
                <input
                  placeholder="e.g. CRM"
                  value={form.type}
                  className={inputClass}
                  onChange={(e) =>
                    setIdentityField("type", e.target.value.toUpperCase())
                  }
                />
              </Field>
              <Field label="Subtype" className="sm:col-span-2">
                <input
                  placeholder="e.g. CASE_CREATE"
                  value={form.subtype}
                  className={inputClass}
                  onChange={(e) =>
                    setIdentityField("subtype", e.target.value.toUpperCase())
                  }
                />
              </Field>
              <Field label="Environment" className="sm:col-span-2">
                <div className="relative">
                  <select
                    value={form.environment}
                    className={`${inputClass} appearance-none cursor-pointer`}
                    onChange={(e) =>
                      set("environment", e.target.value as Environment)
                    }
                  >
                    {ENVIRONMENTS.map((env) => (
                      <option key={env} value={env}>
                        {env} ({ENV_SCHEMA_MAP[env]})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </Field>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Globe size={16} className="text-indigo-500" /> Routing
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Field label="Source IDs (pipe-separated)">
                  <input
                    placeholder="e.g. ST|CR|SBILF"
                    value={form.sourceIds}
                    className={inputClass}
                    onChange={(e) =>
                      set("sourceIds", e.target.value.toUpperCase())
                    }
                  />
                </Field>
                <CacheFieldNameInput
                  value={form.sourceIdFieldName}
                  onChange={(v) => setFieldName("sourceIdFieldName", v)}
                />
              </div>
              <div>
                <Field label="Third-Party URL">
                  <input
                    placeholder="Third-party URL"
                    value={form.thirdPartyUrl}
                    className={inputClass}
                    onChange={(e) => set("thirdPartyUrl", e.target.value)}
                  />
                </Field>
                <CacheFieldNameInput
                  value={form.thirdPartyUrlFieldName}
                  onChange={(v) => setFieldName("thirdPartyUrlFieldName", v)}
                />
              </div>
              <div>
                <Field label="DMZ URL (optional)">
                  <input
                    placeholder="DMZ URL (optional)"
                    value={form.dmzUrl}
                    className={inputClass}
                    onChange={(e) => set("dmzUrl", e.target.value)}
                  />
                </Field>
                {form.dmzUrl.trim() && (
                  <CacheFieldNameInput
                    value={form.dmzUrlFieldName}
                    onChange={(v) => setFieldName("dmzUrlFieldName", v)}
                  />
                )}
              </div>
              {form.mode === "SQL" && (
                <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-1">
                  <input
                    type="checkbox"
                    checked={form.wireDmzInMaster}
                    onChange={(e) => set("wireDmzInMaster", e.target.checked)}
                    className="rounded accent-indigo-600"
                    disabled={!form.dmzUrl.trim()}
                  />
                  Route API Master through DMZ URL (otherwise the cache entry is
                  created but left unwired, same as the reference)
                </label>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Server size={16} className="text-indigo-500" /> Sys Service
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Field label="Service Name">
                  <input
                    placeholder="e.g. thirdPartySBILife_sys"
                    value={form.serviceName}
                    className={inputClass}
                    onChange={(e) => set("serviceName", e.target.value)}
                  />
                </Field>
                <CacheFieldNameInput
                  value={form.sysServiceFieldName}
                  onChange={(v) => setFieldName("sysServiceFieldName", v)}
                />
              </div>
              <div>
                <Field label="Sys URL">
                  <input
                    placeholder="Sys URL"
                    value={form.sysUrl}
                    className={inputClass}
                    onChange={(e) => set("sysUrl", e.target.value)}
                  />
                </Field>
                <CacheFieldNameInput
                  value={form.sysUrlFieldName}
                  onChange={(v) => setFieldName("sysUrlFieldName", v)}
                />
              </div>
              <div>
                <Field label="Sys HTTP Timeout (seconds)">
                  <input
                    placeholder="Sys HTTP timeout"
                    value={form.sysHttpTimeout}
                    className={inputClass}
                    onChange={(e) => set("sysHttpTimeout", e.target.value)}
                  />
                </Field>
                <CacheFieldNameInput
                  value={form.sysHttpTimeoutFieldName}
                  onChange={(v) => setFieldName("sysHttpTimeoutFieldName", v)}
                />
              </div>
              <div>
                <Field label="Array Handle">
                  <div className="relative">
                    <select
                      value={form.arrayHandle}
                      className={`${inputClass} appearance-none cursor-pointer`}
                      onChange={(e) =>
                        set("arrayHandle", e.target.value as ArrayHandle)
                      }
                    >
                      <option value="O">O - Array Present in Request</option>
                      <option value="N">N — No Array in Request</option>
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </Field>
                <CacheFieldNameInput
                  value={form.arrayHandleFieldName}
                  onChange={(v) => setFieldName("arrayHandleFieldName", v)}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <Settings size={16} className="text-indigo-500" /> Txn Settings
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Field label="Content Check">
                  <div className="relative">
                    <select
                      value={form.contentCheck}
                      className={`${inputClass} appearance-none cursor-pointer`}
                      onChange={(e) =>
                        set("contentCheck", e.target.value as YesNoD)
                      }
                    >
                      <option value="Y">Y — Enabled</option>
                      <option value="N">N — Disabled</option>
                      <option value="D">D — Default</option>
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </Field>
                <CacheFieldNameInput
                  value={form.contentCheckFieldName}
                  onChange={(v) => setFieldName("contentCheckFieldName", v)}
                />
              </div>
              <div>
                <Field label="HTTP Timeout (seconds)">
                  <input
                    placeholder="HTTP timeout"
                    value={form.httpTimeout}
                    className={inputClass}
                    onChange={(e) => set("httpTimeout", e.target.value)}
                  />
                </Field>
                <CacheFieldNameInput
                  value={form.httpTimeoutFieldName}
                  onChange={(v) => setFieldName("httpTimeoutFieldName", v)}
                />
              </div>
              <Field label="DB Logging Field Name (optional — leave blank to skip)">
                <input
                  placeholder="Auto-generated — edit if needed"
                  value={form.dbLoggingFieldName}
                  className={inputClass}
                  onChange={(e) =>
                    setFieldName("dbLoggingFieldName", e.target.value)
                  }
                />
              </Field>
              <Field label="DB Logging Value">
                <div className="relative">
                  <select
                    value={form.dbLoggingValue}
                    className={`${inputClass} appearance-none cursor-pointer`}
                    onChange={(e) =>
                      set("dbLoggingValue", e.target.value as DbLoggingValue)
                    }
                  >
                    <option value="N">N — Off</option>
                    <option value="Y">Y — On</option>
                    <option value="H">H — Header only</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </Field>
            </div>
          </div>

          {form.mode === "SERVER_CACHE" && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
                <Server size={16} className="text-indigo-500" /> Server Cache
                Target
              </h3>
              <Field label="Cache Load Host (host:port)">
                <input
                  placeholder="e.g. 10.177.44.[21-27]:8002"
                  value={form.serverCacheHost}
                  className={inputClass}
                  onChange={(e) => set("serverCacheHost", e.target.value)}
                />
              </Field>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-3 flex items-center gap-2 dark:text-white text-sm uppercase tracking-wider">
              <ListChecks size={16} className="text-indigo-500" />{" "}
              {form.mode === "SQL"
                ? "Queries to Generate"
                : "Cache Sections to Include"}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {(form.mode === "SQL"
                ? SECTION_TOGGLES
                : SERVER_CACHE_TOGGLES
              ).map((t) => (
                <label
                  key={t.key}
                  className="flex items-start gap-2 text-sm dark:text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={form[t.key] as boolean}
                    onChange={(e) =>
                      set(
                        t.key,
                        e.target.checked as CacheFormState[typeof t.key],
                      )
                    }
                    className="mt-0.5 rounded accent-indigo-600"
                  />
                  <span>
                    <span className="font-semibold">{t.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {t.hint}
                    </span>
                  </span>
                </label>
              ))}
              {form.mode === "SQL" && (
                <label className="flex items-center gap-2 text-sm dark:text-slate-200 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={form.addCommitAfterEachQuery}
                    onChange={(e) =>
                      set("addCommitAfterEachQuery", e.target.checked)
                    }
                    className="rounded accent-indigo-600"
                  />
                  <span className="font-semibold">
                    Add COMMIT; after each query
                  </span>
                </label>
              )}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!isValid}
            className="flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Rocket size={16} />{" "}
            {form.mode === "SQL" ? "Generate Queries" : "Generate Server Cache"}
          </button>
        </div>

        {/* -------------------- Output column -------------------- */}

        <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden h-full min-h-[420px] lg:min-h-0">
          <div className="flex-none p-3 sm:p-4 bg-slate-900 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-slate-500 flex-none" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                {statements
                  ? `${statements.length} ${form.mode === "SQL" ? "Statement" : "Item"}${statements.length !== 1 ? "s" : ""} Generated`
                  : "Log: Configuration"}
              </span>
            </div>

            {/* ── Copy All Button ───────────────────────────────────── */}
            {statements && statements.length > 0 && (
              <CopyButton
                text={fullScript}
                label="Copy All"
                className="text-xs font-bold inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all border border-indigo-500/20"
              />
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed custom-scrollbar min-h-0 space-y-6">
            {grouped && grouped.size > 0 ? (
              [...grouped.entries()].map(([section, contents]) => (
                <div key={section} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">
                      {section}
                    </span>

                    {/* ── Section Copy Button ───────────────────────── */}
                    <CopyButton
                      text={contents.join("\n\n")}
                      label="Copy"
                      className="text-[11px] font-bold inline-flex items-center gap-1.5 rounded-md bg-slate-800/80 px-2.5 py-1 text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-slate-700/50"
                    />
                  </div>
                  <pre className="text-emerald-400 whitespace-pre-wrap break-all">
                    {contents.join("\n\n")}
                  </pre>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 dark:text-slate-600 italic">
                <Database size={32} className="opacity-10 mb-2" />
                <p className="text-xs text-center">
                  {form.mode === "SQL"
                    ? "Fill in the form and generate cache onboarding queries."
                    : "Fill in the form and generate a server cache payload + CURL request."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white";
