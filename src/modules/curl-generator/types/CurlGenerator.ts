export type CurlMode = "GEN5" | "GEN6" | "CUSTOM";

export type AesMode =
  | "AES-CBC"
  | "AES-CFB"
  | "AES-OFB"
  | "AES-CTR"
  | "AES-GCM"
  | "AES-ECB";

export type RsaMode =
  | "RSA-OAEP-SHA1"
  | "RSA-OAEP-SHA256"
  | "RSA-OAEP-SHA384"
  | "RSA-OAEP-SHA512"
  | "RSAES-PKCS1-V1_5";

export type DigiSignMode =
  | "RSASSA-PKCS1-V1_5"
  | "RSA-PSS";

export const AES_MODE_OPTIONS: AesMode[] = ["AES-CBC", "AES-CFB", "AES-OFB", "AES-CTR", "AES-GCM", "AES-ECB"];
export const RSA_MODE_OPTIONS: RsaMode[] = ["RSA-OAEP-SHA1", "RSA-OAEP-SHA256", "RSA-OAEP-SHA384", "RSA-OAEP-SHA512", "RSAES-PKCS1-V1_5"];
export const DIGI_SIGN_MODE_OPTIONS: DigiSignMode[] = ["RSASSA-PKCS1-V1_5", "RSA-PSS"];

export const FIELD_SOURCE_OPTIONS: { value: FieldSource; label: string }[] = [
  { value: "accessToken", label: "Access Token (RSA encrypted key)" },
  { value: "digiSign", label: "Digital Signature" },
  { value: "requestValue", label: "Encrypted Request" },
  { value: "requestReferenceNumber", label: "Request Reference Number" },
  { value: "static", label: "Static Value" },
];

export function getAlgorithmsForMode(mode: CurlMode): {
  aesAlgo: AesMode;
  rsaAlgo: RsaMode;
  digiSignAlgo: DigiSignMode;
  keyBytes: 12 | 16;
} {
  if (mode === "GEN6") {
    return {
      aesAlgo: "AES-GCM",
      rsaAlgo: "RSA-OAEP-SHA256",
      digiSignAlgo: "RSASSA-PKCS1-V1_5",
      keyBytes: 12,
    };
  }

  if (mode === "GEN5") {
    return {
      aesAlgo: "AES-CBC",
      rsaAlgo: "RSA-OAEP-SHA256",
      digiSignAlgo: "RSASSA-PKCS1-V1_5",
      keyBytes: 16,
    };
  }

  return {
    aesAlgo: "AES-CBC",
    rsaAlgo: "RSA-OAEP-SHA256",
    digiSignAlgo: "RSASSA-PKCS1-V1_5",
    keyBytes: 16,
  };
}

export interface CurlHeader {
  name: string;
  value: string;
}

/* ==========================================================
   Field layout (structure) config
   Lets header/body placement and naming vary independently of
   the fixed GEN5/GEN6 layout - e.g. AccessToken in body instead
   of headers, renamed to SecretKey, DigiSign in headers, or no
   access token field at all.
========================================================== */

export type FieldSource =
  | "accessToken"      // RSA-encrypted static key
  | "digiSign"          // signature over the normalized payload
  | "requestValue"      // AES-encrypted payload
  | "requestReferenceNumber"
  | "static";           // literal value the user types in

export type FieldLocation = "header" | "body";

export interface StructureField {
  id: string;
  source: FieldSource;
  location: FieldLocation;
  name: string;          // header name, or JSON key name
  enabled: boolean;      // false = omit entirely (e.g. "no access token")
  staticValue?: string;  // only used when source === "static"
}

// The layout GEN5/GEN6 use today, expressed in StructureField shape -
// used as the seed when a user first turns on custom layout, and as the
// fallback whenever structureMode isn't "CUSTOM".
export const DEFAULT_STRUCTURE: StructureField[] = [
  { id: "1", source: "accessToken", location: "header", name: "AccessToken", enabled: true },
  { id: "2", source: "requestReferenceNumber", location: "body", name: "REQUEST_REFERENCE_NUMBER", enabled: true },
  { id: "3", source: "requestValue", location: "body", name: "REQUEST", enabled: true },
  { id: "4", source: "digiSign", location: "body", name: "DIGI_SIGN", enabled: true },
];

export interface CurlRequest {
  mode: CurlMode;
  endpoint: string;
  requestReferenceNumber: string;
  requestPayload: string;
  keyBytes: 12 | 16;
  headers: CurlHeader[];

  // GEN5/GEN6 fix these to constants when generating; CUSTOM lets the
  // user choose any value from the *_MODE_OPTIONS lists above.
  aesAlgo: AesMode;
  rsaAlgo: RsaMode;
  digiSignAlgo: DigiSignMode;

  // when absent or "FIXED": engine uses DEFAULT_STRUCTURE (today's
  // AccessToken-in-header / REQUEST_REFERENCE_NUMBER+REQUEST+DIGI_SIGN-in-body
  // layout) regardless of mode.
  structureMode?: "FIXED" | "CUSTOM";
  structure?: StructureField[];
}

export interface CurlResult {
  curlCommand: string;

  requestValue: string;

  accessToken: string;

  digiSign: string;

  aesKey?: string;

  encryptedPayload?: string;
}