export interface WrapperRequest {
  apiName: string;
  swaggerTitle: string;
  swaggerDescription: string;
  basePath: string;
  version: string;
  author: string;
  packageNamespace?: string;
}

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