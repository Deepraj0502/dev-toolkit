export type AesMode = "AES-GCM" | "AES-CBC";
export type RsaMode = "RSA-OAEP" | "RSAES-PKCS1-V1_5";
export type DigiSignMode = "RSASSA-PKCS1-V1_5" | "RSA-PSS";

const encoder = new TextEncoder();

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function normalizePem(pem: string): string {
  return pem.replace(/\r/g, "").trim();
}

export function extractBase64FromPem(pem: string): string {
  return normalizePem(pem)
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
}

export async function importPublicKeyFromPem(pem: string, algorithm: RsaMode): Promise<CryptoKey> {
  const normalized = normalizePem(pem);
  const base64 = extractBase64FromPem(normalized);
  const raw = base64ToArrayBuffer(base64);
  const algo = algorithm === "RSA-OAEP"
    ? { name: "RSA-OAEP", hash: "SHA-256" }
    : { name: "RSAES-PKCS1-v1_5" };

  return window.crypto.subtle.importKey(
    "spki",
    raw,
    algo,
    false,
    ["encrypt"]
  );
}

export async function importPrivateKeyFromPem(pem: string, algorithm: DigiSignMode): Promise<CryptoKey> {
  const base64 = extractBase64FromPem(pem);
  const raw = base64ToArrayBuffer(base64);
  const algo = algorithm === "RSA-PSS"
    ? { name: "RSA-PSS", hash: "SHA-256" }
    : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

  return window.crypto.subtle.importKey(
    "pkcs8",
    raw,
    algo,
    false,
    ["sign"]
  );
}

export async function rsaEncryptBase64(publicKeyPem: string, value: string, algorithm: RsaMode): Promise<string> {
  const key = await importPublicKeyFromPem(publicKeyPem, algorithm);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: algorithm === "RSA-OAEP" ? "RSA-OAEP" : "RSAES-PKCS1-v1_5"
    },
    key,
    encoder.encode(value)
  );
  return arrayBufferToBase64(encrypted);
}

export async function signSha256Rsa(privateKeyPem: string, value: string, algorithm: DigiSignMode): Promise<string> {
  const key = await importPrivateKeyFromPem(privateKeyPem, algorithm);
  const signature = await window.crypto.subtle.sign(
    {
      name: algorithm
    },
    key,
    encoder.encode(value)
  );
  return arrayBufferToBase64(signature);
}

const STATIC_AES_KEY = "11111111111111111111111111111111";

function getStaticAesKeyBytes(): Uint8Array {
  return new Uint8Array(Array.from(STATIC_AES_KEY, (char) => char.charCodeAt(0)));
}

function getAesIv(keyBytes: Uint8Array, length: number) {
  const iv = new Uint8Array(length);
  iv.set(keyBytes.slice(0, length));
  return iv;
}

export async function aesEncryptCbc(message: string, _keyString: string): Promise<string> {
  const keyBytes = getStaticAesKeyBytes();
  const iv = getAesIv(keyBytes, 16);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    encoder.encode(message)
  );
  return arrayBufferToBase64(encrypted);
}

export async function aesEncryptGcm(message: string, _keyString: string): Promise<string> {
  const keyBytes = getStaticAesKeyBytes();
  const iv = getAesIv(keyBytes, 12);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128
    },
    cryptoKey,
    encoder.encode(message)
  );
  return arrayBufferToBase64(encrypted);
}

export async function aesDecryptGcm(base64Message: string, _keyString: string): Promise<string> {
  const keyBytes = getStaticAesKeyBytes();
  const iv = getAesIv(keyBytes, 12);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const encrypted = base64ToArrayBuffer(base64Message);
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128
    },
    cryptoKey,
    encrypted
  );
  return new TextDecoder().decode(decrypted);
}

export async function aesDecryptCbc(base64Message: string, _keyString: string): Promise<string> {
  const keyBytes = getStaticAesKeyBytes();
  const iv = getAesIv(keyBytes, 16);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  const encrypted = base64ToArrayBuffer(base64Message);
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv
    },
    cryptoKey,
    encrypted
  );
  return new TextDecoder().decode(decrypted);
}

export async function aesDecrypt(mode: AesMode, base64Message: string, keyString: string): Promise<string> {
  if (mode === "AES-CBC") {
    return aesDecryptCbc(base64Message, keyString);
  }
  return aesDecryptGcm(base64Message, keyString);
}

export function normalizeJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed);
  } catch {
    return value.replace(/\s+/g, " ").trim();
  }
}

export function parseProperties(value: string): Record<string, string> {
  const lines = value.split(/\r?\n/);
  const result: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    result[key.trim()] = rest.join("=").trim();
  }
  return result;
}

export function normalizeForSign(value: string): string {
  return value.replace(/ \"/g, '"').replace(/\" /g, '"').replace(/: /g, ':');
}
