import type { BankVariant, ThirdPartyVariant } from "../config/templateProfiles";

export interface WrapperRequest {
  apiName: string;
  swaggerTitle: string;
  swaggerDescription: string;
  basePath: string;
  version: string;
  author: string;
  packageNamespace?: string;
}

export interface BankWrapperRequest {
  apiName: string;
  variant: BankVariant;
  /** Original filename of the dropped swagger, for logging only. */
  swaggerFileName: string;
  /**
   * Already-read text content of the dropped swagger file. Read this BEFORE
   * disabling/removing the file input — Chromium revokes read access to a
   * File once the <input> holding it becomes disabled, so passing the raw
   * File through several async engine steps and reading it late throws
   * "The requested file could not be read... after a reference to a file
   * was acquired."
   */
  swaggerText: string;
}

export type { ThirdPartyVariant, BankVariant };

export interface LogEntry {
    id: number;
    level: "info" | "success" | "error" | "warning";
    message: string;
    timestamp: string;
}

export interface ProgressState {
    template: boolean;
    extract: boolean;
    rename: boolean;
    swagger: boolean;
    ace: boolean;
    validation: boolean;
    zip: boolean;
    download: boolean;
}

export interface GeneratorState {
    loading: boolean;
    progress: ProgressState;
    logs: LogEntry[];
}
