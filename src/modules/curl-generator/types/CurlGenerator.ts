export type CurlMode = "GEN5" | "GEN6";

export type AesMode =
    | "AES-CBC"
    | "AES-GCM";

export type RsaMode =
    | "RSA-OAEP";

export type DigiSignMode =
    | "RSASSA-PKCS1-V1_5"
    | "RSA-PSS";

export interface CurlHeader {
    name: string;
    value: string;
}

export interface CurlRequest {
  mode: "GEN5" | "GEN6";
  endpoint: string;
  requestReferenceNumber: string;
  requestPayload: string;

  headers: CurlHeader[];

  aesAlgo: "AES-GCM" | "AES-CBC";
  rsaAlgo: "RSA-OAEP";
  digiSignAlgo: "RSASSA-PKCS1-V1_5";
}

export interface CurlResult {
  curlCommand: string;

  requestValue: string;

  accessToken: string;

  digiSign: string;

  aesKey?: string;

  encryptedPayload?: string;
}