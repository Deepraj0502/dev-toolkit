export type CurlMode = "GEN5" | "GEN6";
export type AesMode = "AES-GCM" | "AES-CBC";
export type RsaMode = "RSA-OAEP" | "RSAES-PKCS1-V1_5";
export type DigiSignMode = "RSASSA-PKCS1-V1_5" | "RSA-PSS";

export interface CurlHeader {
  name: string;
  value: string;
}

export interface CurlRequest {
  mode: CurlMode;
  endpoint: string;
  requestReferenceNumber: string;
  requestPayload: string;
  headers: CurlHeader[];
  aesAlgo: AesMode;
  rsaAlgo: RsaMode;
  digiSignAlgo: DigiSignMode;
}

export interface CurlResult {
  curlCommand: string;
  accessToken: string;
  requestValue: string;
  digiSign: string;
}
