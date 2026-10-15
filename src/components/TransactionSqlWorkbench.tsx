import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Terminal,
  Database,
  Play,
  Pin,
  PinOff,
  Copy,
  Check,
  Search,
  BookOpen,
  Plus,
  X,
  RefreshCw,
  Download,
  AlertTriangle,
  Clock,
  Layers,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  FileCode,
  Tag,
  Sparkles,
  Server
} from "lucide-react";

// ── Types & Interfaces ───────────────────────────────────────────────

export type Environment = "DEV" | "SIT" | "UAT";
export type UserRole = "USER" | "MASTER_ADMIN";

export interface PresetQuery {
  id: string;
  category: string;
  title: string;
  sql: string;
  type: "SELECT" | "INSERT" | "UPDATE" | "DDL";
}

export interface QueryTab {
  id: string;
  title: string;
  query: string;
  environment: Environment;
  isPinned: boolean;
  status: "IDLE" | "LOADING" | "SUCCESS" | "FAILED";
  rows: Record<string, any>[];
  columns: string[];
  rowCount: number;
  executionTime: number | string | null;
  errorMessage?: string;
  rawResponse?: any;
}

export interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export interface AutocompleteSuggestion {
  text: string;
  type: "KEYWORD" | "TABLE" | "COLUMN" | "PRESET";
  title?: string;
}

// ── Exact Copy Logic ─────────────────────────────────────────────────

export function useClipboard({ timeout = 2000 }: { timeout?: number } = {}) {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    if (!text && text !== "0") return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(String(text));
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = String(text);
        textarea.style.position = "fixed";
        textarea.style.left = "-999999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  return { copied, copy };
}

export function CopyButton({
  text,
  label = "Copy",
  className = "inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
}: CopyButtonProps) {
  const { copied, copy } = useClipboard({ timeout: 2000 });

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        copy(text);
      }}
      className={`${className} ${copied ? "!bg-emerald-950/80 !text-emerald-300" : ""}`}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400 animate-in zoom-in duration-150" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

// ── Pre-Defined Presets Catalog ──────────────────────────────────────

const PRESET_QUERIES: PresetQuery[] = [
  // API_LOG & API_DETAILS
  {
    id: "api_log_1",
    category: "API_LOG & API_DETAILS",
    title: "Current Account Undertaking Link",
    sql: "SELECT * from API_LOG where URL like '%linkCurrentAccountToUndertaking/create%' order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "api_log_2",
    category: "API_LOG & API_DETAILS",
    title: "Deposits Stop Delete",
    sql: "SELECT * from API_LOG where URL like '%/depositsStop/Delete%' order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "api_log_3",
    category: "API_LOG & API_DETAILS",
    title: "M2P Transactions",
    sql: "SELECT * from API_LOG where API_NAME like '%M2P%' order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "api_log_4",
    category: "API_LOG & API_DETAILS",
    title: "Third Party Martech System",
    sql: "SELECT * from API_LOG where API_NAME like '%thirdPartyMartech_sys%' order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "api_log_5",
    category: "API_LOG & API_DETAILS",
    title: "Trace by Specific URN (API_LOG)",
    sql: "SELECT * from API_LOG where URN = 'SBIRL00437008202507893115';",
    type: "SELECT"
  },
  {
    id: "api_log_6",
    category: "API_LOG & API_DETAILS",
    title: "Payload Lookup (API_DETAILS)",
    sql: "SELECT * from API_DETAILS where URN = 'SBIST242611500yh711g871yh';",
    type: "SELECT"
  },

  // ORCH_API_LOG & ORCH_API_DETAILS
  {
    id: "orch_1",
    category: "ORCH_API_LOG",
    title: "Orchestration by URN",
    sql: "SELECT * from ORCH_API_LOG where URN = 'SBIAK25010115346101020403';",
    type: "SELECT"
  },
  {
    id: "orch_2",
    category: "ORCH_API_LOG",
    title: "Orchestration URL Pattern (062111)",
    sql: "SELECT * from ORCH_API_LOG where URL like '%062111%';",
    type: "SELECT"
  },
  {
    id: "orch_3",
    category: "ORCH_API_LOG",
    title: "Orchestration Details by URN",
    sql: "SELECT * from ORCH_API_DETAILS where URN = 'SBICR25111450000400002405';",
    type: "SELECT"
  },
  {
    id: "orch_4",
    category: "ORCH_API_LOG",
    title: "Orchestration Details by URN_CHILD list",
    sql: "SELECT * from ORCH_API_DETAILS where URN_CHILD in ('EISOB00020230729217334871','EISOB00020230729217423677');",
    type: "SELECT"
  },
  {
    id: "orch_5",
    category: "ORCH_API_LOG",
    title: "Dump ORCH_API_LOG",
    sql: "SELECT * from ORCH_API_LOG;",
    type: "SELECT"
  },

  // BACKEND_LOG & BACKEND_DETAILS
  {
    id: "be_1",
    category: "BACKEND_LOG",
    title: "Backend Log by URN",
    sql: "SELECT * from BACKEND_LOG where URN = 'SBILA24346021259000262804';",
    type: "SELECT"
  },
  {
    id: "be_2",
    category: "BACKEND_LOG",
    title: "Olive Publisher WealthHolding",
    sql: "SELECT * from BACKEND_LOG where END_POINT_URL like '%olive/publisher/WealthHolding%';",
    type: "SELECT"
  },
  {
    id: "be_3",
    category: "BACKEND_LOG",
    title: "Data Duns Sub-type",
    sql: "SELECT * from BACKEND_LOG where TXN_SUB_TYPE ='DATA_DUNS';",
    type: "SELECT"
  },
  {
    id: "be_4",
    category: "BACKEND_LOG",
    title: "Backend CRM Endpoints",
    sql: "SELECT * from BACKEND_LOG WHERE TXN_ENDPOINT like '%CRM%';",
    type: "SELECT"
  },
  {
    id: "be_5",
    category: "BACKEND_LOG",
    title: "Host s1d1ulmwa01.sbi.co.in Logs",
    sql: "SELECT * from BACKEND_LOG where end_point_url like '%s1d1ulmwa01.sbi.co.in%' order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "be_6",
    category: "BACKEND_LOG",
    title: "Backend Details by URN",
    sql: "SELECT * from BACKEND_DETAILS where URN = 'SBIYA25007174600000065377';",
    type: "SELECT"
  },

  // CBS_TXN_PARAM
  {
    id: "cbs_1",
    category: "CBS_TXN_PARAM",
    title: "CBS Txn No 027300",
    sql: "SELECT * from CBS_TXN_PARAM where TXN_NO='027300';",
    type: "SELECT"
  },

  // CACHE_DETAILS
  {
    id: "cache_1",
    category: "CACHE_DETAILS",
    title: "Cache Details for GARIMA",
    sql: "SELECT * from CACHE_DETAILS where FIELD_NAME like '%GARIMA%';",
    type: "SELECT"
  },
  {
    id: "cache_2",
    category: "CACHE_DETAILS",
    title: "Insert CE005 Length Source Config",
    sql: "INSERT into CACHE_DETAILS (FIELD_NAME,FIELD_VALUE,REQUEST_ACTION,PROCESSING_ACTION,RESPONSE_ACTION,SOURCE_ID,BACKEND_TYPE,BACKEND_SUB_TYPE,TRAN_CODE,SERVICE_NAME,CREATION_TIME)\nVALUES('CE005_Length_db',' 0147','NULL','SOURCE ID CONFIGURATION','NULL','NR','NULL','NULL','NULL','customerMiscDetails_NBC_sys',TRUNC(SYSDATE));",
    type: "INSERT"
  },
  {
    id: "cache_3",
    category: "CACHE_DETAILS",
    title: "Insert STZ Cheque Enquiry RespIndex",
    sql: "INSERT into CACHE_DETAILS (FIELD_NAME, FIELD_VALUE, REQUEST_ACTION, PROCESSING_ACTION, RESPONSE_ACTION, SOURCE_ID, BACKEND_TYPE, BACKEND_SUB_TYPE, TRAN_CODE, SERVICE_NAME,CREATION_TIME)\nVALUES('STZ_chequeEnquiry_expDS_RESPINDEX','1111','NULL','SOURCE ID CONFIGURATION','NULL','STZ','CBS','BANCS','036789','chequeEnquiry_expDS',TRUNC(SYSDATE));",
    type: "INSERT"
  },

  // URL_MAPPER
  {
    id: "url_1",
    category: "URL_MAPPER",
    title: "Dump URL_MAPPER",
    sql: "SELECT * from URL_MAPPER;",
    type: "SELECT"
  },
  {
    id: "url_2",
    category: "URL_MAPPER",
    title: "URL Mapper by CR 611",
    sql: "SELECT * from URL_MAPPER where CR_NO like '%611%';",
    type: "SELECT"
  },
  {
    id: "url_3",
    category: "URL_MAPPER",
    title: "Route URL with AOF",
    sql: "SELECT * from URL_MAPPER where (ROUTE_URL) like '%AOF%';",
    type: "SELECT"
  },
  {
    id: "url_4",
    category: "URL_MAPPER",
    title: "TDS Gateway Route",
    sql: "SELECT * from URL_MAPPER where LB_URL like '%https://eissidev.sbi.co.in/gen5/gateway/payments/customerCreate/TDS%';",
    type: "SELECT"
  },
  {
    id: "url_5",
    category: "URL_MAPPER",
    title: "Standing Instructions Route",
    sql: "SELECT * from URL_MAPPER where ROUTE_URL like '%standingInstruction_bth/create%';",
    type: "SELECT"
  },
  {
    id: "url_6",
    category: "URL_MAPPER",
    title: "Standing Instructions Business API",
    sql: "SELECT * from URL_MAPPER where BUSINESS_API_NAME like '%standingInstructionsCreate_th_expD%';",
    type: "SELECT"
  },
  {
    id: "url_7",
    category: "URL_MAPPER",
    title: "Empty Dev Portal Title Check",
    sql: "SELECT * from URL_MAPPER where API_TITLE_IN_DEV_PORTAL = '';",
    type: "SELECT"
  },
  {
    id: "url_8",
    category: "URL_MAPPER",
    title: "Insert CIF Enquiry Inspection Route",
    sql: "INSERT into URL_MAPPER (LB_URL, ROUTE_URL, INTERNAL_EXTERNAL_PASS, DEV_TEAM, BUSINESS_API_NAME, UPDATED_BY, TAG_MAKER_CHECKER_ENABLED, SUPERVISORY_ENABLED)\nvalues ('https://eissiuat.sbi.co.in/gen5/gateway/customers/CIF/Enquiry/inspection','http://eissiuat.sbi.co.in:3002/CIF/Enquiry/inspection/customers','INTERNAL','TCS','CIFEnquiryInspectionDetails_expDS','Samruddhi','Y','Y');",
    type: "INSERT"
  },
  {
    id: "url_9",
    category: "URL_MAPPER",
    title: "Insert CIF Amend Inspection Route",
    sql: "INSERT into URL_MAPPER (LB_URL, ROUTE_URL, INTERNAL_EXTERNAL_PASS, DEV_TEAM, BUSINESS_API_NAME, UPDATED_BY, TAG_MAKER_CHECKER_ENABLED, SUPERVISORY_ENABLED)\nvalues ('https://eissiuat.sbi.co.in/gen5/gateway/customers/CIF/Amend/inspection','http://eissiuat.sbi.co.in:3002/CIF/Amend/inspection/customers','INTERNAL','TCS','CIFAmendInspectionDetails_orchDS','Samruddhi','Y','Y');",
    type: "INSERT"
  },

  // SYS_URL_MAPPER
  {
    id: "sys_1",
    category: "SYS_URL_MAPPER",
    title: "Dump SYS_URL_MAPPER",
    sql: "SELECT * from SYS_URL_MAPPER;",
    type: "SELECT"
  },
  {
    id: "sys_2",
    category: "SYS_URL_MAPPER",
    title: "Insert Inspection Option NBC Sys (EXP)",
    sql: "INSERT into SYS_URL_MAPPER(ROUTE_URL,SYS_URL,SEQ_NO,UPDATED_BY,SYSTEM_API_NAME,ORCH_REMARKS)\nvalues ('http://eissiuat.sbi.co.in:3002/CIF/Enquiry/inspection/customers','/NBC/067083_A/bancs/cbs/customers','1','Samruddhi','inspectionOption_NBC_sys','EXP');",
    type: "INSERT"
  },
  {
    id: "sys_3",
    category: "SYS_URL_MAPPER",
    title: "Insert Inspection Option NBC Sys (ORCH)",
    sql: "INSERT into SYS_URL_MAPPER(ROUTE_URL,SYS_URL,SEQ_NO,UPDATED_BY,SYSTEM_API_NAME,ORCH_REMARKS)\nvalues ('http://eissiuat.sbi.co.in:3002/CIF/Amend/inspection/customers','/NBC/067083_A/bancs/cbs/customers','1','Samruddhi','inspectionOption_NBC_sys','ORCH');",
    type: "INSERT"
  },
  {
    id: "sys_4",
    category: "SYS_URL_MAPPER",
    title: "Update CR_NO for DOB Account",
    sql: "update SYS_URL_MAPPER SET CR_NO = '740,674' where ROUTE_URL like '%http://eisuat.sbi.co.in:3001/IVR/Non_RMN/DOB_Account_bth/enquiry/accounts%';",
    type: "UPDATE"
  },

  // THIRD_PARTY
  {
    id: "tp_1",
    category: "THIRD_PARTY",
    title: "Third Party API Master",
    sql: "SELECT * from THIRD_PARTY_API_MASTER order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "tp_2",
    category: "THIRD_PARTY",
    title: "Third Party API Parameters",
    sql: "SELECT * from THIRD_PARTY_API_PARAMETER order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "tp_3",
    category: "THIRD_PARTY",
    title: "Third Party API Access Master",
    sql: "SELECT * from THIRD_PARTY_API_ACCESS_MASTER order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "tp_4",
    category: "THIRD_PARTY",
    title: "Third Party Master Table",
    sql: "SELECT * from THIRD_PARTY order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },

  // AUDIT & SYSTEM LOGS
  {
    id: "syslog_1",
    category: "AUDIT & SYSTEM LOGS",
    title: "Processing Log SI001 Errors",
    sql: "SELECT * from API_PROCESSING_LOG where error_code like '%SI001%' order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "syslog_2",
    category: "AUDIT & SYSTEM LOGS",
    title: "Orchestration Enquiry by Entrytime",
    sql: "SELECT * from ORCH_ENQUIRY order by entrytime desc;",
    type: "SELECT"
  },
  {
    id: "syslog_3",
    category: "AUDIT & SYSTEM LOGS",
    title: "Source Mapper EPAY & PAN",
    sql: "SELECT * from source_mapper where APPLICATION_NAME like '%EPAY%' AND route_url like '%PAN%';",
    type: "SELECT"
  },
  {
    id: "syslog_4",
    category: "AUDIT & SYSTEM LOGS",
    title: "DPG Audit Logs",
    sql: "SELECT * from DPG_AUDIT order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "syslog_5",
    category: "AUDIT & SYSTEM LOGS",
    title: "ATM URN Details NCMC TCP/IP",
    sql: "SELECT * from URN_DETAILS_ATM where SERVICE_NAME like '%NCMC_ATM_TCPIP%' order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "syslog_6",
    category: "AUDIT & SYSTEM LOGS",
    title: "Cache Details Distinct Actions",
    sql: "SELECT distinct request_action, response_action, processing_action from cache_details;",
    type: "SELECT"
  },
  {
    id: "syslog_7",
    category: "AUDIT & SYSTEM LOGS",
    title: "ATM Inbound & Outbound Streams",
    sql: "SELECT * from ATM_INBOUND fetch first 50 rows only;",
    type: "SELECT"
  },
  {
    id: "syslog_8",
    category: "AUDIT & SYSTEM LOGS",
    title: "IHUB Log & Details Lookup",
    sql: "select * from IHUB_API_DETAILS where urn='SBIIH04041120240307124645';",
    type: "SELECT"
  }
];

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "ORDER BY", "DESC", "ASC", "LIKE", "AND", "OR",
  "FETCH FIRST", "ROWS ONLY", "GROUP BY", "HAVING", "INSERT INTO", "VALUES",
  "UPDATE", "SET", "DELETE FROM", "JOIN", "LEFT JOIN", "INNER JOIN", "DISTINCT",
  "IN", "NOT IN", "BETWEEN", "IS NULL", "IS NOT NULL", "WITH"
];

const KNOWN_TABLES = [
  "API_LOG", "API_DETAILS", "ORCH_API_LOG", "ORCH_API_DETAILS",
  "BACKEND_LOG", "BACKEND_DETAILS", "CBS_TXN_PARAM", "CACHE_DETAILS",
  "URL_MAPPER", "SYS_URL_MAPPER", "THIRD_PARTY_API_MASTER", "THIRD_PARTY_API_PARAMETER",
  "THIRD_PARTY_API_ACCESS_MASTER", "THIRD_PARTY", "API_PROCESSING_LOG",
  "ORCH_ENQUIRY", "source_mapper", "DPG_AUDIT", "URN_DETAILS_ATM",
  "ATM_INBOUND", "ATM_OUTBOUND", "IHUB_API_LOG", "IHUB_API_DETAILS"
];

const KNOWN_COLUMNS = [
  "URN", "URN_CHILD", "API_NAME", "URL", "LB_URL", "ROUTE_URL", "SYS_URL",
  "ERROR_CODE", "ERROR_DESCRIPTION", "RESPONSE_STATUS", "SOURCE_ID",
  "BROKER_EG", "BROKER_NAME", "REQUEST_DATE_TIME", "RESPONSE_DATE_TIME",
  "CREATION_DATE_TIME", "SOURCE_IP", "EXP_IP", "EXP_PORT", "ACTUAL_ERROR",
  "DB_BROKER_IP", "DB_APPLICATION_NAME", "FIELD_NAME", "FIELD_VALUE",
  "REQUEST_ACTION", "RESPONSE_ACTION", "PROCESSING_ACTION", "CR_NO"
];

// ── Main Component ───────────────────────────────────────────────────

export default function TransactionSqlWorkbench() {
  const [environment, setEnvironment] = useState<Environment>("DEV");
  const [role, setRole] = useState<UserRole>("USER");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null);

  // Tabs state: Initialized clean without static responses
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: "tab-1",
      title: "Query 1",
      query: "SELECT * from API_LOG where URL like '%linkCurrentAccountToUndertaking/create%' order by CREATION_DATE_TIME desc;",
      environment: "DEV",
      isPinned: false,
      status: "IDLE",
      rows: [],
      columns: [],
      rowCount: 0,
      executionTime: null
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  // ── Tab Management ───────────────────────────────────────────────────

  const updateActiveTab = (updates: Partial<QueryTab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t))
    );
  };

  const handleCreateTab = (initialQuery?: string, title?: string) => {
    const newId = `tab-${Date.now()}`;
    const newTab: QueryTab = {
      id: newId,
      title: title || `Query ${tabs.length + 1}`,
      query: initialQuery || "SELECT * from API_LOG order by CREATION_DATE_TIME desc;",
      environment,
      isPinned: false,
      status: "IDLE",
      rows: [],
      columns: [],
      rowCount: 0,
      executionTime: null
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    return newId;
  };

  const handleCloseTab = (tabIdToClose: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tabs.length === 1) return; // Keep at least one tab

    const newTabs = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(newTabs);
    if (activeTabId === tabIdToClose) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const togglePin = (tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isPinned: !t.isPinned } : t))
    );
  };

  // ── Autocomplete Logic ───────────────────────────────────────────────

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    updateActiveTab({ query: value });

    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const words = textBeforeCursor.split(/[\s,();]+/);
    const currentWord = words[words.length - 1]?.trim() || "";

    if (currentWord.length >= 2) {
      const upperWord = currentWord.toUpperCase();

      const matchedKeywords: AutocompleteSuggestion[] = SQL_KEYWORDS.filter((k) =>
        k.startsWith(upperWord)
      ).map((k) => ({ text: k, type: "KEYWORD" }));

      const matchedTables: AutocompleteSuggestion[] = KNOWN_TABLES.filter((tbl) =>
        tbl.toUpperCase().includes(upperWord)
      ).map((tbl) => ({ text: tbl, type: "TABLE" }));

      const matchedColumns: AutocompleteSuggestion[] = KNOWN_COLUMNS.filter((col) =>
        col.toUpperCase().includes(upperWord)
      ).map((col) => ({ text: col, type: "COLUMN" }));

      const matchedPresets: AutocompleteSuggestion[] = PRESET_QUERIES.filter(
        (p) =>
          p.title.toUpperCase().includes(upperWord) ||
          p.sql.toUpperCase().includes(upperWord)
      )
        .slice(0, 3)
        .map((p) => ({
          text: p.sql,
          title: p.title,
          type: "PRESET"
        }));

      const combined = [
        ...matchedPresets,
        ...matchedTables,
        ...matchedKeywords,
        ...matchedColumns
      ].slice(0, 8);

      if (combined.length > 0) {
        setSuggestions(combined);
        setShowSuggestions(true);
        setSelectedSuggestionIndex(0);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const applySuggestion = (suggestion: AutocompleteSuggestion) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const cursor = textarea.selectionStart;
    const text = activeTab.query;

    if (suggestion.type === "PRESET") {
      updateActiveTab({ query: suggestion.text });
      setShowSuggestions(false);
      return;
    }

    const textBeforeCursor = text.slice(0, cursor);
    const textAfterCursor = text.slice(cursor);
    const lastWordMatch = textBeforeCursor.match(/[\w]+$/);

    if (lastWordMatch) {
      const startIndex = textBeforeCursor.length - lastWordMatch[0].length;
      const newQuery =
        text.slice(0, startIndex) + suggestion.text + " " + textAfterCursor;
      updateActiveTab({ query: newQuery });
    }
    setShowSuggestions(false);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev === 0 ? suggestions.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleExecuteQuery();
    }
  };

  // ── Query Execution with Pin Protection ──────────────────────────────

  const handleExecuteQuery = async (forcedQuery?: string, runInNewTab = false) => {
    const rawSql = (forcedQuery || activeTab.query).trim();
    if (!rawSql) return;

    // RBAC validation check on frontend before dispatch
    const upper = rawSql.toUpperCase();
    const isSelect = upper.startsWith("SELECT") || upper.startsWith("WITH");
    const isDml =
      upper.startsWith("INSERT") ||
      upper.startsWith("UPDATE") ||
      upper.startsWith("DELETE");

    if (role !== "MASTER_ADMIN" && !isSelect) {
      updateActiveTab({
        status: "FAILED",
        errorMessage: "Access Denied: Standard users only have read (SELECT/WITH) access."
      });
      return;
    }

    if (
      upper.includes("DROP ") ||
      upper.includes("TRUNCATE ") ||
      upper.includes("ALTER ")
    ) {
      updateActiveTab({
        status: "FAILED",
        errorMessage: "Dangerous DDL statement blocked by security policy."
      });
      return;
    }

    // Tab Pinning Decision: If current tab is pinned or runInNewTab requested, spawn new tab
    let targetTabId = activeTabId;
    if (runInNewTab || activeTab.isPinned) {
      const generatedTitle =
        rawSql.length > 20 ? rawSql.slice(0, 20) + "..." : rawSql;
      targetTabId = handleCreateTab(rawSql, generatedTitle);
    }

    // Set target tab loading state
    setTabs((prev) =>
      prev.map((t) =>
        t.id === targetTabId
          ? {
              ...t,
              status: "LOADING",
              query: rawSql,
              environment,
              errorMessage: undefined
            }
          : t
      )
    );

    const startTime = performance.now();

    try {
      const response = await fetch("/api/postman/execute-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: rawSql,
          maxRow: 100,
          environment,
          role
        })
      });

      const data = await response.json();
      const endTime = performance.now();
      const calcDuration = ((endTime - startTime) / 1000).toFixed(3);

      if (!response.ok || data.status === "FAILED" || data.success === false) {
        throw new Error(
          data.errorMessage || data.error || "Query execution failed."
        );
      }

      const rows: Record<string, any>[] = Array.isArray(data.rows)
        ? data.rows
        : [];
      const columns =
        rows.length > 0 ? Object.keys(rows[0]) : [];

      setTabs((prev) =>
        prev.map((t) =>
          t.id === targetTabId
            ? {
                ...t,
                status: "SUCCESS",
                rows,
                columns,
                rowCount: data.metadata?.rowCount ?? rows.length,
                executionTime: data.metadata?.executionTime ?? calcDuration,
                rawResponse: data
              }
            : t
        )
      );
    } catch (err: any) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === targetTabId
            ? {
                ...t,
                status: "FAILED",
                errorMessage: err.message || "Failed to execute query.",
                rows: [],
                columns: []
              }
            : t
        )
      );
    }
  };

  // ── Filtered Catalog Categories ──────────────────────────────────────

  const categories = useMemo(() => {
    const cats = Array.from(new Set(PRESET_QUERIES.map((p) => p.category)));
    return ["ALL", ...cats];
  }, []);

  const filteredPresets = useMemo(() => {
    return PRESET_QUERIES.filter((p) => {
      const matchesCat =
        activeCategory === "ALL" || p.category === activeCategory;
      const matchesSearch =
        catalogSearch === "" ||
        p.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.sql.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, catalogSearch]);

  // ── Filtered Table Rows ──────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return activeTab.rows;
    const term = searchTerm.toLowerCase();
    return activeTab.rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(term)
      )
    );
  }, [activeTab.rows, searchTerm]);

  return (
    <div className="flex h-screen w-full flex-col bg-[#070b16] font-sans text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* ── Top Header Bar ──────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#1e2a47] bg-[#0c1222] px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 shadow-lg shadow-indigo-600/20">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">
                DV & SQL Workbench
              </span>
              <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                PROD-READY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive Enterprise Query Engine &amp; Middleware Inspector
            </p>
          </div>
        </div>

        {/* Global Controls: Environment & Role Selectors */}
        <div className="flex items-center gap-3">
          {/* Environment Selector */}
          <div className="flex items-center rounded-xl border border-[#1e2a47] bg-[#090e1c] p-1">
            {(["DEV", "SIT", "UAT"] as Environment[]).map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  environment === env
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Server className="h-3 w-3" />
                {env}
              </button>
            ))}
          </div>

          {/* Role Switcher */}
          <div className="flex items-center rounded-xl border border-[#1e2a47] bg-[#090e1c] p-1">
            <button
              onClick={() => setRole("USER")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                role === "USER"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Standard User
            </button>
            <button
              onClick={() => setRole("MASTER_ADMIN")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                role === "MASTER_ADMIN"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Master Admin
            </button>
          </div>

          {/* Catalog Drawer Trigger */}
          <button
            onClick={() => setCatalogOpen(!catalogOpen)}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/40 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 hover:text-white transition-all shadow-sm"
          >
            <BookOpen className="h-4 w-4 text-indigo-400" />
            <span>Preset Catalog ({PRESET_QUERIES.length})</span>
          </button>
        </div>
      </header>

      {/* ── Main Workbench Workspace ───────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left / Primary Workspace: Editor + Pinned Results Grid */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Query Editor & Controls Bar */}
          <div className="border-b border-[#1e2a47] bg-[#0c1222] p-4">
            <div className="relative mb-3">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  <span>SQL Query Editor</span>
                  <span className="text-slate-500 font-normal">
                    (Auto-suggest enabled, press Ctrl + Enter to run)
                  </span>
                </div>
                {role === "MASTER_ADMIN" ? (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                    DML (INSERT/UPDATE/DELETE) UNLOCKED
                  </span>
                ) : (
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                    READ-ONLY (SELECT/WITH ONLY)
                  </span>
                )}
              </div>

              {/* Textarea with intelligent autocomplete */}
              <div className="relative">
                <textarea
                  ref={editorRef}
                  value={activeTab.query}
                  onChange={handleEditorChange}
                  onKeyDown={handleEditorKeyDown}
                  placeholder="Type your SQL query here (e.g. SELECT * FROM API_LOG WHERE...)"
                  rows={4}
                  className="w-full resize-y rounded-xl border border-[#1e2a47] bg-[#070b16] p-3 font-mono text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />

                {/* Autocomplete Popup */}
                {showSuggestions && (
                  <div className="absolute left-4 top-full z-50 mt-1 max-h-60 w-96 overflow-y-auto rounded-xl border border-[#1e2a47] bg-[#0f172a] p-1.5 shadow-2xl backdrop-blur-md">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Suggestions (↑↓ to navigate, Enter/Tab to select)
                    </div>
                    {suggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => applySuggestion(s)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
                          idx === selectedSuggestionIndex
                            ? "bg-indigo-600 text-white"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Sparkles className="h-3 w-3 shrink-0 text-indigo-400" />
                          <span className="font-mono font-medium truncate">
                            {s.title || s.text}
                          </span>
                        </div>
                        <span className="rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-400">
                          {s.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExecuteQuery(undefined, false)}
                  disabled={activeTab.status === "LOADING"}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>
                    {activeTab.status === "LOADING"
                      ? "Executing..."
                      : "Execute Query"}
                  </span>
                </button>

                <button
                  onClick={() => handleExecuteQuery(undefined, true)}
                  disabled={activeTab.status === "LOADING"}
                  className="flex items-center gap-2 rounded-xl border border-[#1e2a47] bg-[#090e1c] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Run in New Tab</span>
                </button>

                <CopyButton
                  text={activeTab.query}
                  label="Copy SQL"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#1e2a47] bg-[#090e1c] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                />
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                {activeTab.executionTime !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{activeTab.executionTime}s</span>
                  </span>
                )}
                {activeTab.rowCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{activeTab.rowCount} rows</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Multi-Tab Results Header ───────────────────────────── */}
          <div className="flex items-center justify-between border-b border-[#1e2a47] bg-[#090e1c] px-4 py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "border-indigo-500/50 bg-[#111a2e] text-white shadow-sm"
                        : "border-transparent bg-transparent text-slate-400 hover:bg-[#0c1222] hover:text-slate-200"
                    }`}
                  >
                    {/* Pin status icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(tab.id);
                      }}
                      title={
                        tab.isPinned
                          ? "Pinned: New queries will open in a new tab"
                          : "Pin tab to protect results"
                      }
                      className="text-slate-400 hover:text-indigo-400 transition-colors"
                    >
                      {tab.isPinned ? (
                        <Pin className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      ) : (
                        <PinOff className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                      )}
                    </button>

                    <span className="max-w-[120px] truncate">{tab.title}</span>

                    {tab.rowCount > 0 && (
                      <span className="rounded bg-[#1e2a47] px-1.5 py-0.2 text-[10px] text-slate-300">
                        {tab.rowCount}
                      </span>
                    )}

                    {tabs.length > 1 && (
                      <button
                        onClick={(e) => handleCloseTab(tab.id, e)}
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => handleCreateTab()}
                title="Create empty query tab"
                className="flex items-center rounded-lg border border-dashed border-[#1e2a47] p-1.5 text-slate-400 hover:border-slate-500 hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick table search & export */}
            {activeTab.rows.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search visible results..."
                    className="w-48 rounded-lg border border-[#1e2a47] bg-[#070b16] py-1 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => {
                    const csvContent =
                      "data:text/csv;charset=utf-8," +
                      [
                        activeTab.columns.join(","),
                        ...activeTab.rows.map((r) =>
                          activeTab.columns
                            .map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`)
                            .join(",")
                        )
                      ].join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `query_results_${Date.now()}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  title="Export results to CSV"
                  className="flex items-center gap-1 rounded-lg border border-[#1e2a47] bg-[#070b16] px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Download className="h-3 w-3" />
                  <span>CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Active Tab Content / Dynamic Table View ─────────────── */}
          <div className="flex-1 overflow-auto bg-[#070b16] p-4">
            {activeTab.status === "LOADING" ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium">
                  Dispatching query across {activeTab.environment} broker...
                </p>
              </div>
            ) : activeTab.status === "FAILED" ? (
              <div className="m-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
                <h3 className="text-base font-bold text-red-200">
                  Execution Error
                </h3>
                <p className="mt-2 text-xs font-mono text-red-300 whitespace-pre-wrap">
                  {activeTab.errorMessage}
                </p>
              </div>
            ) : filteredRows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[#1e2a47] bg-[#0c1222]">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#090e1c] text-slate-400 border-b border-[#1e2a47]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold text-slate-500 w-12 text-center">
                        #
                      </th>
                      {activeTab.columns.map((col) => (
                        <th
                          key={col}
                          className="py-2.5 px-3 font-mono font-semibold text-slate-300 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a47]/50 font-mono">
                    {filteredRows.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRow(row)}
                        className="group hover:bg-[#111a2e]/60 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-3 text-slate-600 text-center select-none font-sans">
                          {idx + 1}
                        </td>
                        {activeTab.columns.map((col) => {
                          const val = row[col];
                          const strVal =
                            val === null || val === undefined
                              ? "NULL"
                              : typeof val === "object"
                              ? JSON.stringify(val)
                              : String(val);

                          return (
                            <td
                              key={col}
                              className="relative py-2 px-3 whitespace-nowrap max-w-xs truncate group/cell"
                            >
                              <span
                                className={
                                  val === null
                                    ? "text-slate-600 italic"
                                    : "text-slate-200"
                                }
                              >
                                {strVal}
                              </span>

                              {/* On-hover instant cell copy button */}
                              {val !== null && (
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity bg-[#0c1222]/90 rounded pl-1">
                                  <CopyButton
                                    text={strVal}
                                    label=""
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                                  />
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRow(row);
                            }}
                            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                <FileCode className="h-10 w-10 text-slate-600" />
                <p className="text-sm font-medium">No results to display.</p>
                <p className="text-xs text-slate-600">
                  Select a query from the preset catalog or type a query and click Execute.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Preset Queries Catalog Drawer ────────────── */}
        {catalogOpen && (
          <aside className="flex w-96 shrink-0 flex-col border-l border-[#1e2a47] bg-[#0c1222] transition-all">
            <div className="flex items-center justify-between border-b border-[#1e2a47] p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Preset SQL Library</h2>
              </div>
              <button
                onClick={() => setCatalogOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Catalog Filter Controls */}
            <div className="border-b border-[#1e2a47] p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Filter presets..."
                  className="w-full rounded-lg border border-[#1e2a47] bg-[#070b16] py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      activeCategory === cat
                        ? "bg-indigo-600 text-white"
                        : "bg-[#090e1c] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="group rounded-xl border border-[#1e2a47] bg-[#0f172a] p-3 hover:border-indigo-500/50 hover:bg-[#111a2e] transition-all"
                >
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="font-semibold text-slate-200 text-xs">
                      {preset.title}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        preset.type === "SELECT"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : preset.type === "INSERT"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {preset.type}
                    </span>
                  </div>

                  <p className="font-mono text-[11px] text-slate-400 line-clamp-2 bg-[#070b16] p-2 rounded-lg border border-[#1e2a47]/50 mb-2">
                    {preset.sql}
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    <CopyButton
                      text={preset.sql}
                      label=""
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    />

                    <button
                      onClick={() => updateActiveTab({ query: preset.sql })}
                      className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      Load
                    </button>

                    <button
                      onClick={() => handleExecuteQuery(preset.sql, true)}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 shadow-sm"
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                      <span>Run</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* ── Row Details Modal Drawer ───────────────────────────────── */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-2xl flex-col border-l border-[#1e2a47] bg-[#0c1222] shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#1e2a47] p-5">
              <div>
                <h3 className="text-base font-bold text-white">Record Inspector</h3>
                <p className="text-xs text-slate-400">
                  Full column-by-column key-value breakdown
                </p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 font-mono text-xs">
              {Object.entries(selectedRow).map(([key, value]) => {
                const str =
                  value === null || value === undefined
                    ? "NULL"
                    : typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : String(value);

                return (
                  <div
                    key={key}
                    className="flex flex-col gap-1 rounded-xl border border-[#1e2a47] bg-[#070b16] p-3"
                  >
                    <div className="flex items-center justify-between text-slate-400 font-sans font-semibold">
                      <span>{key}</span>
                      <CopyButton text={str} label="Copy" />
                    </div>
                    <div className="mt-1 max-h-40 overflow-y-auto rounded bg-[#090e1c] p-2 text-slate-200 break-all whitespace-pre-wrap">
                      {str}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
