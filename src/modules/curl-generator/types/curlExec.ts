export interface ExecuteCurlRequest {
  command: string;
  targetHost: string;
  verbose?: boolean;
  prettyJson?: boolean;
}

export interface ExecuteCurlResponse {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  prettyOutput: string | null;
  targetHost?: string;
  error?: string;
}

export const ALLOWED_CURL_HOSTS = [
  "10.177.44.21",
  "10.177.44.22",
  "10.177.44.23",
  "10.177.44.25",
  "10.177.44.26",
  "10.177.44.27",
] as const;

export type AllowedCurlHost = (typeof ALLOWED_CURL_HOSTS)[number];
