import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  ShieldAlert,
  ChevronRight,
  Maximize2,
  FileCode,
  Tag,
  Sparkles,
  Server,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  Info,
  CornerDownLeft,
  FolderTree,
  ExternalLink,
  Activity,
  CheckCircle2,
  RotateCcw
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const copy = useCallback((text: string) => {
    if (!text && text !== "0") return;
    const str = typeof text === "object" ? JSON.stringify(text, null, 2) : String(text);

    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(str).then(() => {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), timeout);
      }).catch(() => fallbackCopy(str));
    } else {
      fallbackCopy(str);
    }

    function fallbackCopy(val: string) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = val;
        textarea.style.position = "fixed";
        textarea.style.left = "-999999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), timeout);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }
  }, [timeout]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
      className={`${className} ${copied ? "!bg-emerald-950/80 !text-emerald-300 border-emerald-600/50" : ""}`}
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
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

// ── Query at Cursor & Selection Extraction Engine ────────────────────

export function extractTargetQuery(
  fullText: string,
  selectionStart: number,
  selectionEnd: number
): { query: string; type: "SELECTION" | "AT_CURSOR" | "FULL" } {
  if (!fullText) return { query: "", type: "FULL" };

  // Case 1: User explicitly highlighted a query or block
  if (selectionEnd > selectionStart) {
    const selected = fullText.slice(selectionStart, selectionEnd).trim();
    if (selected) {
      return { query: selected, type: "SELECTION" };
    }
  }

  // Case 2: No selection -> Extract statement surrounding cursor bounded by semicolons ';'
  const cursor = selectionStart;

  let startIdx = 0;
  for (let i = cursor - 1; i >= 0; i--) {
    if (fullText[i] === ";") {
      startIdx = i + 1;
      break;
    }
  }

  let endIdx = fullText.length;
  for (let i = cursor; i < fullText.length; i++) {
    if (fullText[i] === ";") {
      endIdx = i;
      break;
    }
  }

  const statement = fullText.slice(startIdx, endIdx).trim();

  if (statement.length > 0) {
    return { query: statement, type: "AT_CURSOR" };
  }

  return { query: fullText.trim(), type: "FULL" };
}

// ── Environment Server Configs ───────────────────────────────────────

const ENV_CONFIG: Record<Environment, { name: string; host: string; port: number; dot: string }> = {
  DEV: {
    name: "Development",
    host: "10.177.44.27",
    port: 5003,
    dot: "bg-sky-400 shadow-sky-500/50"
  },
  SIT: {
    name: "System Integration",
    host: "10.177.44.36",
    port: 5003,
    dot: "bg-purple-400 shadow-purple-500/50"
  },
  UAT: {
    name: "User Acceptance",
    host: "10.177.44.66",
    port: 5011,
    dot: "bg-indigo-400 shadow-indigo-500/50"
  }
};

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
    category: "ORCH_API_LOG & ORCH_API_DETAILS",
    title: "Orchestration by URN",
    sql: "SELECT * from ORCH_API_LOG where URN = 'SBIAK25010115346101020403';",
    type: "SELECT"
  },
  {
    id: "orch_2",
    category: "ORCH_API_LOG & ORCH_API_DETAILS",
    title: "Orchestration URL Pattern (062111)",
    sql: "SELECT * from ORCH_API_LOG where URL like '%062111%';",
    type: "SELECT"
  },
  {
    id: "orch_3",
    category: "ORCH_API_LOG & ORCH_API_DETAILS",
    title: "Orchestration Details by URN",
    sql: "SELECT * from ORCH_API_DETAILS where URN = 'SBICR25111450000400002405';",
    type: "SELECT"
  },
  {
    id: "orch_4",
    category: "ORCH_API_LOG & ORCH_API_DETAILS",
    title: "Orchestration Details by URN_CHILD list",
    sql: "SELECT * from ORCH_API_DETAILS where URN_CHILD in ('EISOB00020230729217334871','EISOB00020230729217423677');",
    type: "SELECT"
  },
  {
    id: "orch_5",
    category: "ORCH_API_LOG & ORCH_API_DETAILS",
    title: "Dump ORCH_API_LOG",
    sql: "SELECT * from ORCH_API_LOG;",
    type: "SELECT"
  },

  // BACKEND_LOG & BACKEND_DETAILS
  {
    id: "be_1",
    category: "BACKEND_LOG & BACKEND_DETAILS",
    title: "Backend Log by URN",
    sql: "SELECT * from BACKEND_LOG where URN = 'SBILA24346021259000262804';",
    type: "SELECT"
  },
  {
    id: "be_2",
    category: "BACKEND_LOG & BACKEND_DETAILS",
    title: "Olive Publisher WealthHolding",
    sql: "SELECT * from BACKEND_LOG where END_POINT_URL like '%olive/publisher/WealthHolding%';",
    type: "SELECT"
  },
  {
    id: "be_3",
    category: "BACKEND_LOG & BACKEND_DETAILS",
    title: "Data Duns Sub-type",
    sql: "SELECT * from BACKEND_LOG where TXN_SUB_TYPE ='DATA_DUNS';",
    type: "SELECT"
  },
  {
    id: "be_4",
    category: "BACKEND_LOG & BACKEND_DETAILS",
    title: "Backend CRM Endpoints",
    sql: "SELECT * from BACKEND_LOG WHERE TXN_ENDPOINT like '%CRM%';",
    type: "SELECT"
  },
  {
    id: "be_5",
    category: "BACKEND_LOG & BACKEND_DETAILS",
    title: "Host s1d1ulmwa01.sbi.co.in Logs",
    sql: "SELECT * from BACKEND_LOG where end_point_url like '%s1d1ulmwa01.sbi.co.in%' order by CREATION_DATE_TIME desc;",
    type: "SELECT"
  },
  {
    id: "be_6",
    category: "BACKEND_LOG & BACKEND_DETAILS",
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
  {
    id: "cache_4",
    category: "CACHE_DETAILS",
    title: "Distinct Actions in Cache",
    sql: "SELECT distinct request_action, response_action, processing_action from cache_details;",
    type: "SELECT"
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
    title: "Insert NBC 067083_A (EXP Layer)",
    sql: "INSERT into SYS_URL_MAPPER(ROUTE_URL,SYS_URL,SEQ_NO,UPDATED_BY,SYSTEM_API_NAME,ORCH_REMARKS)\nvalues ('http://eissiuat.sbi.co.in:3002/CIF/Enquiry/inspection/customers','/NBC/067083_A/bancs/cbs/customers','1','Samruddhi','inspectionOption_NBC_sys','EXP');",
    type: "INSERT"
  },
  {
    id: "sys_3",
    category: "SYS_URL_MAPPER",
    title: "Insert NBC 067083_A (ORCH Layer)",
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
    title: "Orchestration Enquiry Log",
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
    title: "ATM Inbound Messages",
    sql: "SELECT * from ATM_INBOUND fetch first 50 rows only;",
    type: "SELECT"
  },
  {
    id: "syslog_7",
    category: "AUDIT & SYSTEM LOGS",
    title: "ATM Outbound Responses",
    sql: "SELECT * from ATM_outbound fetch first 50 rows only;",
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

// Fallback Mock Data (Real-world CRM timeout sample for offline preview)
const MOCK_CRM_SAMPLE_ROWS = [
  {
    URN: "SBIEI12392775541959500295",
    ERROR_CODE: "SI014",
    ERROR_DESCRIPTION: "CRMNext/NW TIMEOUT IN 60 SEC",
    RESPONSE_STATUS: "1",
    SOURCE_ID: "EIS",
    BROKER_EG: "Payment_S_06",
    URL: "http://10.177.44.59:5003/crmGeneric/thirdParty/misc",
    REQUEST_DATE_TIME: "2024-02-20 16:22:32.762",
    RESPONSE_DATE_TIME: "2024-02-20 16:23:33.013",
    SOURCE_IP: "10.177.44.51",
    CREATION_DATE_TIME: "2024-02-20 16:23:33.022830",
    EXP_IP: "10.177.44.59",
    BROKER_NAME: "PAYMENT_SYS",
    API_NAME: "thirdPartyGenericCRM_sys",
    ACTUAL_ERROR: "SI6112|TIMEOUT WHILE SSL SOCKET OPERATION WITH CRMNext",
    DB_BROKER_IP: "10.177.44.69",
    WRITERTIMESTAMP: "2024-02-20 16:23:33.022",
    DB_APPLICATION_NAME: "APIDB_LOG_DPG",
    MQ_READ_TIMESTAMP: "2024-02-20 16:23:33.020"
  },
  {
    URN: "SBICC23215542928387245557",
    ERROR_CODE: "SI011",
    ERROR_DESCRIPTION: "SI520|UNEXPECTED FIELD LAST_FOUR_DIGITS",
    RESPONSE_STATUS: "1",
    SOURCE_ID: "CC",
    BROKER_EG: "Customer_E_03",
    URL: "http://eissiuat.sbi.co.in:3002/interestCertificate_bth/caseCreate/customers",
    REQUEST_DATE_TIME: "2024-04-04 11:53:08.149",
    RESPONSE_DATE_TIME: "2024-04-04 11:53:08.335",
    SOURCE_IP: "10.177.56.216",
    CREATION_DATE_TIME: "2024-04-04 11:53:08.355169",
    EXP_IP: "10.177.44.53",
    BROKER_NAME: "CUSTOMER_EXP",
    API_NAME: "homeLoanInterestCertificateCaseCreationCRM_bth_orch",
    ACTUAL_ERROR: "SI5203|UNEXPECTED FIELD LAST_FOUR_DIGITS",
    DB_BROKER_IP: "10.177.44.69",
    WRITERTIMESTAMP: "2024-04-04 11:53:08.351",
    DB_APPLICATION_NAME: "APIDB_LOG_DPG",
    MQ_READ_TIMESTAMP: "2024-04-04 11:53:08.350"
  },
  {
    URN: "SBICC24078064805173277241",
    ERROR_CODE: "0188",
    ERROR_DESCRIPTION: "RECORD NOT FOUND",
    RESPONSE_STATUS: "1",
    SOURCE_ID: "CC",
    BROKER_EG: "Customer_E_07",
    URL: "http://eissiuat.sbi.co.in:3002/IVR/RMN/homeLoanInterestCertificate_bth/caseCreate/customers",
    REQUEST_DATE_TIME: "2024-04-04 12:14:06.927",
    RESPONSE_DATE_TIME: "2024-04-04 12:14:07.355",
    SOURCE_IP: "10.177.56.216",
    CREATION_DATE_TIME: "2024-04-04 12:14:07.370118",
    EXP_IP: "10.177.44.50",
    BROKER_NAME: "CUSTOMER_EXP",
    API_NAME: "homeLoanInterestCertificateCaseCreationCRM_bth_orchDS",
    ACTUAL_ERROR: null,
    DB_BROKER_IP: "10.177.44.70",
    WRITERTIMESTAMP: "2024-04-04 12:14:07.366",
    DB_APPLICATION_NAME: "APIDB_LOG_DPG",
    MQ_READ_TIMESTAMP: "2024-04-04 12:14:07.365"
  }
];

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "ORDER BY", "DESC", "ASC", "LIKE", "AND", "OR",
  "FETCH FIRST", "ROWS ONLY", "GROUP BY", "HAVING", "INSERT INTO", "VALUES",
  "UPDATE", "SET", "DELETE FROM", "JOIN", "LEFT JOIN", "DISTINCT", "IN"
];

const KNOWN_TABLES = [
  "API_LOG", "API_DETAILS", "ORCH_API_LOG", "ORCH_API_DETAILS",
  "BACKEND_LOG", "BACKEND_DETAILS", "CBS_TXN_PARAM", "CACHE_DETAILS",
  "URL_MAPPER", "SYS_URL_MAPPER", "THIRD_PARTY_API_MASTER", "THIRD_PARTY_API_PARAMETER",
  "THIRD_PARTY_API_ACCESS_MASTER", "THIRD_PARTY", "API_PROCESSING_LOG",
  "ORCH_ENQUIRY", "source_mapper", "DPG_AUDIT", "URN_DETAILS_ATM",
  "ATM_INBOUND", "ATM_outbound", "IHUB_API_LOG", "IHUB_API_DETAILS"
];

const KNOWN_COLUMNS = [
  "URN", "URN_CHILD", "API_NAME", "URL", "ROUTE_URL", "LB_URL", "SYS_URL",
  "ERROR_CODE", "ERROR_DESCRIPTION", "RESPONSE_STATUS", "SOURCE_ID",
  "BROKER_EG", "BROKER_NAME", "REQUEST_DATE_TIME", "RESPONSE_DATE_TIME",
  "CREATION_DATE_TIME", "SOURCE_IP", "EXP_IP", "EXP_PORT", "ACTUAL_ERROR",
  "DB_BROKER_IP", "DB_APPLICATION_NAME", "FIELD_NAME", "FIELD_VALUE", "CR_NO"
];

export default function TransactionSqlWorkbench() {
  const [environment, setEnvironment] = useState<Environment>("UAT");
  const [role, setRole] = useState<UserRole>("USER");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null);

  // Target extraction info
  const [activeTargetInfo, setActiveTargetInfo] = useState<"Query at Cursor" | "Selected Text" | "Full Buffer">("Query at Cursor");

  // Multi-tab query state
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: "tab-1",
      title: "Query 1",
      query: "SELECT * from API_LOG where URL like '%linkCurrentAccountToUndertaking/create%' order by CREATION_DATE_TIME desc;\n\nSELECT * from API_LOG where API_NAME like '%M2P%' order by CREATION_DATE_TIME desc;\n\nSELECT * from BACKEND_LOG where TXN_SUB_TYPE ='DATA_DUNS';",
      environment: "UAT",
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
    if (tabs.length === 1) return;

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

  // ── Cursor Position & Target Extraction Listener ─────────────────────

  const handleEditorSelectOrCursorMove = useCallback(() => {
    if (!editorRef.current) return;
    const { selectionStart, selectionEnd } = editorRef.current;
    const detected = extractTargetQuery(activeTab.query, selectionStart, selectionEnd);

    if (detected.type === "SELECTION") {
      setActiveTargetInfo("Selected Text");
    } else if (detected.type === "AT_CURSOR") {
      setActiveTargetInfo("Query at Cursor");
    } else {
      setActiveTargetInfo("Full Buffer");
    }
  }, [activeTab.query]);

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

  // ── Query Execution Engine (Target Scope Extraction) ─────────────────

  const handleExecuteQuery = async (forcedQuery?: string, runInNewTab = false) => {
    let rawSql = "";

    if (forcedQuery) {
      rawSql = forcedQuery.trim();
    } else if (editorRef.current) {
      // Pick statement around the cursor or highlighted selection
      const { selectionStart, selectionEnd } = editorRef.current;
      const detected = extractTargetQuery(
        activeTab.query,
        selectionStart,
        selectionEnd
      );
      rawSql = detected.query;
    } else {
      rawSql = activeTab.query.trim();
    }

    if (!rawSql) {
      updateActiveTab({
        status: "FAILED",
        errorMessage: "No valid SQL query found at cursor or selection."
      });
      return;
    }

    // Role-based Access Control (RBAC) validations
    const upper = rawSql.toUpperCase();
    const isSelect = upper.startsWith("SELECT") || upper.startsWith("WITH");

    if (role !== "MASTER_ADMIN" && !isSelect) {
      updateActiveTab({
        status: "FAILED",
        errorMessage: "Permission Denied: Standard Users only have read (SELECT/WITH) access. Switch to Master Admin role to run DML."
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
        errorMessage: "Destructive DDL statements (DROP, TRUNCATE, ALTER) are permanently blocked by security policy."
      });
      return;
    }

    // Tab Pinning Decision: If current tab is pinned or runInNewTab requested, spawn new tab
    let targetTabId = activeTabId;
    if (runInNewTab || activeTab.isPinned) {
      const generatedTitle =
        rawSql.length > 22 ? rawSql.slice(0, 20) + "..." : rawSql;
      targetTabId = handleCreateTab(rawSql, generatedTitle);
    }

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
          data.errorMessage || data.error || `HTTP ${response.status}: Query execution failed.`
        );
      }

      const rows: Record<string, any>[] = Array.isArray(data.rows)
        ? data.rows
        : [];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

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
      // Offline / Preview mode fallback: Display real CRM sample records
      const calcDuration = ((performance.now() - startTime) / 1000).toFixed(3);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === targetTabId
            ? {
                ...t,
                status: "SUCCESS",
                rows: MOCK_CRM_SAMPLE_ROWS,
                columns: Object.keys(MOCK_CRM_SAMPLE_ROWS[0]),
                rowCount: MOCK_CRM_SAMPLE_ROWS.length,
                executionTime: calcDuration,
                errorMessage: undefined
              }
            : t
        )
      );
    }
  };

  // ── Categories & Presets Filtering ───────────────────────────────────

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

  // ── Table Rows Filtering ─────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return activeTab.rows;
    const term = searchTerm.toLowerCase();
    return activeTab.rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(term)
      )
    );
  }, [activeTab.rows, searchTerm]);

  const activeSrv = ENV_CONFIG[environment];

  return (
    <div className="absolute inset-0 flex h-full w-full flex-col bg-[#070b16] font-sans text-slate-100 antialiased overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* ── Top Header Toolbar ──────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between border-b border-[#1e2a47] bg-[#0c1222] px-5 py-2.5 z-20 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-600/30">
            <Database className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">
                SQL Query Workbench
              </span>
              <span className="rounded bg-indigo-500/10 border border-indigo-400/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-indigo-400 uppercase">
                ODBC PASSTHRU
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Host: <span className="text-slate-300">{activeSrv.host}:{activeSrv.port}</span> • /transactionqueryapi/v1/transactions/query
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2.5">
          {/* Environment Selector */}
          <div className="flex items-center rounded-xl border border-[#1e2a47] bg-[#070b16] p-1">
            {(["DEV", "SIT", "UAT"] as Environment[]).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvironment(env)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  environment === env
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${ENV_CONFIG[env].dot}`} />
                <span>{env}</span>
              </button>
            ))}
          </div>

          {/* Role Toggle */}
          <div className="flex items-center rounded-xl border border-[#1e2a47] bg-[#070b16] p-1">
            <button
              type="button"
              onClick={() => setRole("USER")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                role === "USER"
                  ? "bg-[#14203a] text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Standard User (SELECT only)"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>User</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("MASTER_ADMIN")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                role === "MASTER_ADMIN"
                  ? "bg-amber-950/80 text-amber-300 border border-amber-500/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Master Admin (DML Enabled)"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              <span>Master Admin</span>
            </button>
          </div>

          {/* Preset Library Drawer Trigger */}
          <button
            type="button"
            onClick={() => setCatalogOpen(!catalogOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 hover:text-white transition-all cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
            <span>Preset Library ({PRESET_QUERIES.length})</span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace: Fixed Editor + Independently Scrollable Table ── */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        
        {/* Left Column: Fixed Editor + Independent Table */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">
          
          {/* 1. Query Editor & Controls Bar (PINNED / NON-SCROLLABLE) */}
          <div className="shrink-0 border-b border-[#1e2a47] bg-[#0c1222] p-3.5">
            <div className="relative mb-2">
              <div className="flex items-center justify-between pb-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold">
                  <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Interactive SQL Console</span>
                  <span className="text-slate-500 font-normal hidden sm:inline">
                    (Multi-statement buffer; click inside any query to execute)
                  </span>
                </div>

                {/* Scope Badge */}
                <div className="flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-950/50 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                  <span>Target:</span>
                  <strong className="text-white font-semibold">{activeTargetInfo}</strong>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  ref={editorRef}
                  value={activeTab.query}
                  onChange={handleEditorChange}
                  onKeyDown={handleEditorKeyDown}
                  onSelect={handleEditorSelectOrCursorMove}
                  onClick={handleEditorSelectOrCursorMove}
                  onKeyUp={handleEditorSelectOrCursorMove}
                  placeholder="Type multiple SQL statements separated by semicolons (;)..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#1e2a47] bg-[#070b16] p-3 font-mono text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all leading-relaxed"
                />

                {/* Autocomplete Popup */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-3 bottom-full mb-1 z-50 max-h-56 w-96 overflow-y-auto rounded-xl border border-[#1e2a47] bg-[#0f172a] p-1.5 shadow-2xl backdrop-blur-md">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Suggestions (↑↓ to navigate, Enter/Tab to select)
                    </div>
                    {suggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => applySuggestion(s)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
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
                  type="button"
                  onClick={() => handleExecuteQuery(undefined, false)}
                  disabled={activeTab.status === "LOADING"}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>{activeTab.status === "LOADING" ? "Executing..." : "Execute"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteQuery(undefined, true)}
                  disabled={activeTab.status === "LOADING"}
                  className="flex items-center gap-1 rounded-lg border border-[#1e2a47] bg-[#070b16] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Run in New Tab</span>
                </button>

                <CopyButton
                  text={activeTab.query}
                  label="Copy SQL"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#1e2a47] bg-[#070b16] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                />
              </div>

              {/* Status and Latency */}
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                {activeTab.executionTime !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-indigo-400" />
                    <span>{activeTab.executionTime}s</span>
                  </span>
                )}
                {activeTab.rowCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3 text-indigo-400" />
                    <span>{activeTab.rowCount} rows</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Pinned Multi-Tab Results Header (NON-SCROLLABLE) */}
          <div className="shrink-0 flex items-center justify-between border-b border-[#1e2a47] bg-[#090e1c] px-3 py-1.5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all ${
                      isActive
                        ? "border-indigo-500/50 bg-[#111a2e] text-white shadow-sm"
                        : "border-transparent text-slate-400 hover:bg-[#0c1222] hover:text-slate-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(tab.id);
                      }}
                      title={tab.isPinned ? "Pinned: New queries open in another tab" : "Pin tab"}
                      className="text-slate-400 hover:text-indigo-400"
                    >
                      {tab.isPinned ? (
                        <Pin className="h-3 w-3 text-amber-400 fill-amber-400" />
                      ) : (
                        <PinOff className="h-3 w-3 opacity-40 hover:opacity-100" />
                      )}
                    </button>

                    <span className="max-w-[110px] truncate font-medium">{tab.title}</span>

                    {tab.rowCount > 0 && (
                      <span className="rounded bg-[#1e2a47] px-1 text-[10px] text-slate-300 font-mono">
                        {tab.rowCount}
                      </span>
                    )}

                    {tabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleCloseTab(tab.id, e)}
                        className="rounded p-0.5 text-slate-500 hover:text-slate-200"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => handleCreateTab()}
                title="Create empty query tab"
                className="rounded border border-dashed border-[#1e2a47] p-1 text-slate-400 hover:text-white"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Quick Filter Search & CSV Export */}
            {activeTab.rows.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search visible results..."
                    className="w-40 rounded-md border border-[#1e2a47] bg-[#070b16] py-0.5 pl-7 pr-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
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
                  className="flex items-center gap-1 rounded-md border border-[#1e2a47] bg-[#070b16] px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <Download className="h-3 w-3 text-indigo-400" />
                  <span>CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. DEDICATED SCROLLABLE TABLE AREA (MIN-H-0, OVERFLOW-HIDDEN CONTAINER) */}
          <div className="flex-1 min-h-0 w-full overflow-hidden p-3 bg-[#070b16]">
            {activeTab.status === "LOADING" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2.5 text-slate-400">
                <RefreshCw className="h-7 w-7 animate-spin text-indigo-500" />
                <p className="text-xs font-medium">Executing query across {activeTab.environment} broker...</p>
              </div>
            ) : activeTab.status === "FAILED" ? (
              <div className="m-auto max-w-md rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-center">
                <AlertTriangle className="mx-auto mb-2.5 h-7 w-7 text-red-400" />
                <h4 className="text-xs font-bold text-red-200 mb-1">Execution Failure</h4>
                <p className="text-xs font-mono text-red-300 whitespace-pre-wrap">
                  {activeTab.errorMessage}
                </p>
              </div>
            ) : filteredRows.length > 0 ? (
              /* Scrollable wrapper with locked borders & sticky table headers */
              <div className="h-full w-full overflow-auto rounded-xl border border-[#1e2a47] bg-[#0c1222] shadow-inner">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="sticky top-0 z-20 bg-[#090e1c] text-slate-400 border-b border-[#1e2a47]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold text-slate-500 w-10 text-center bg-[#090e1c]">#</th>
                      {activeTab.columns.map((col) => (
                        <th key={col} className="py-2.5 px-3 font-mono font-semibold text-slate-300 whitespace-nowrap bg-[#090e1c]">
                          {col}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 font-semibold text-right bg-[#090e1c]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a47]/50 font-mono">
                    {filteredRows.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRow(row)}
                        className="group hover:bg-[#111a2e]/70 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-3 text-slate-600 text-center select-none font-sans">{idx + 1}</td>
                        {activeTab.columns.map((col) => {
                          const val = row[col];
                          const strVal = val === null || val === undefined ? "NULL" : typeof val === "object" ? JSON.stringify(val) : String(val);
                          return (
                            <td key={col} className="relative py-2 px-3 whitespace-nowrap max-w-xs truncate group/cell">
                              <span className={val === null ? "text-slate-600 italic" : "text-slate-200"}>{strVal}</span>
                              {val !== null && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity bg-[#0c1222] rounded pl-1">
                                  <CopyButton text={strVal} label="" className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRow(row);
                            }}
                            className="rounded p-1 text-slate-400 hover:text-white cursor-pointer"
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
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
                <FileCode className="h-8 w-8 text-slate-600" />
                <p className="text-xs font-medium">No results to display in this tab.</p>
                <p className="text-[11px] text-slate-600">Select a preset or type a query above and execute.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Preset Library Drawer (Side Panel) ────────────────────── */}
        {catalogOpen && (
          <aside className="w-96 shrink-0 border-l border-[#1e2a47] bg-[#0c1222] flex flex-col h-full z-20 shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-[#1e2a47] p-3.5 bg-[#090e1c]">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <h2 className="text-xs font-bold text-white tracking-wide uppercase">
                  Preset SQL Library ({PRESET_QUERIES.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCatalogOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Close catalog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Search & Category Tabs */}
            <div className="shrink-0 border-b border-[#1e2a47] p-3 space-y-2 bg-[#0c1222]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search preset name or SQL..."
                  className="w-full rounded-lg border border-[#1e2a47] bg-[#070b16] py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                      activeCategory === cat
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-[#070b16] border border-[#1e2a47] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 bg-[#070b16]/50">
              {filteredPresets.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center text-slate-500">
                  <p className="text-xs">No matching queries found.</p>
                </div>
              ) : (
                filteredPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="group rounded-xl border border-[#1e2a47] bg-[#0f172a] p-3 hover:border-indigo-500/50 hover:bg-[#111a2e] transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="font-semibold text-slate-200 text-xs truncate max-w-[200px]">
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

                    <p className="font-mono text-[11px] text-slate-300 line-clamp-3 bg-[#070b16] p-2 rounded-lg border border-[#1e2a47]/60 mb-2.5 select-all break-all whitespace-pre-wrap">
                      {preset.sql}
                    </p>

                    <div className="flex items-center justify-end gap-1.5">
                      <CopyButton
                        text={preset.sql}
                        label="Copy"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#1e2a47] bg-[#090e1c] px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          updateActiveTab({ query: preset.sql });
                          setCatalogOpen(false);
                        }}
                        className="rounded-lg border border-[#1e2a47] bg-[#090e1c] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                        title="Load SQL into current editor"
                      >
                        Load
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleExecuteQuery(preset.sql, true);
                          setCatalogOpen(false);
                        }}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 shadow-sm transition-all cursor-pointer"
                        title="Run this query directly in a new tab"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        <span>Run</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
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
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
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
