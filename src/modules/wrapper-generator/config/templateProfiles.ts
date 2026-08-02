import {
  THIRDPARTY_STANDARD_BASE64,
  THIRDPARTY_CCSID_BASE64,
  BANK_NORMAL_BASE64,
  BANK_TH_BASE64,
  BANK_BTH_BASE64
} from "../assets/templateData";

export type ThirdPartyVariant = "standard" | "ccsid";
export type BankVariant = "normal" | "th" | "bth";

export interface TemplateProfile {
  /** Stable machine key, e.g. "thirdparty-standard" */
  key: string;
  /** Human readable name shown in the UI */
  label: string;
  /**
   * The placeholder PROJECT name baked into the template zip
   * (folder name, .project, restapi.descriptor, etc). Replaced wholesale
   * with `${apiName}` for every generated wrapper.
   */
  templateProject: string;
  /**
   * The placeholder SERVICE name baked into the template zip (the base
   * name without any _th/_bth/_expDS suffix). Replaced wholesale with
   * `apiName` for every generated wrapper.
   */
  templateService: string;
  /** Optional suffix appended to apiName to build the project name. */
  suffix: string;
  /** Base64-encoded ZIP bytes for this template. Empty until provided. */
  base64: string;
  /**
   * Bank wrapper templates skip the swagger-field auto-fill step and
   * instead have the user's drag-and-dropped swagger file inserted as-is.
   */
  isBank: boolean;
}

// ---------------------------------------------------------------------------
// Third-party wrapper templates
// ---------------------------------------------------------------------------
export const THIRDPARTY_PROFILES: Record<ThirdPartyVariant, TemplateProfile> = {
  standard: {
    key: "thirdparty-standard",
    label: "Third-Party Generic Routing",
    templateProject: "thirdPartyGenericRouting_expDS",
    templateService: "thirdPartyGenericRouting",
    suffix: "",
    base64: THIRDPARTY_STANDARD_BASE64,
    isBank: false
  },
  ccsid: {
    key: "thirdparty-ccsid",
    label: "Third-Party Generic Routing (CCSID)",
    templateProject: "thirdPartyGenericRouting_CCSID_expDS",
    templateService: "thirdPartyGenericRouting_CCSID",
    suffix: "",
    base64: THIRDPARTY_CCSID_BASE64,
    isBank: false
  }
};

// ---------------------------------------------------------------------------
// Bank wrapper templates
//
// templateProject / templateService below are set to match the sample
// reference project you shared (TransferClosureDepositAmend...). When you
// paste the real base64 for a bank variant in assets/templateData.ts, update
// templateProject / templateService here to match whatever placeholder
// project/service name is actually baked into that zip, e.g.:
//   normal -> project: "<Name>_expDS",     service: "<Name>"
//   th     -> project: "<Name>_th_expDS",  service: "<Name>"
//   bth    -> project: "<Name>_bth_expDS", service: "<Name>"
// ---------------------------------------------------------------------------
export const BANK_PROFILES: Record<BankVariant, TemplateProfile> = {
  normal: {
    key: "bank-normal",
    label: "Bank Wrapper (Normal)",
    templateProject: "TransferClosureDepositAmend_expDS",
    templateService: "TransferClosureDepositAmend",
    suffix: "",
    base64: BANK_NORMAL_BASE64,
    isBank: true
  },
  th: {
    key: "bank-th",
    label: "Bank Wrapper (TH)",
    templateProject: "TransferClosureDepositAmend_th_expDS",
    templateService: "TransferClosureDepositAmend",
    suffix: "",
    base64: BANK_TH_BASE64,
    isBank: true
  },
  bth: {
    key: "bank-bth",
    label: "Bank Wrapper (BTH)",
    templateProject: "TransferClosureDepositAmend_bth_expDS",
    templateService: "TransferClosureDepositAmend",
    suffix: "",
    base64: BANK_BTH_BASE64,
    isBank: true
  }
};
