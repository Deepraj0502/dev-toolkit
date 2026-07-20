import forge from "node-forge";
import type { AesMode, DigiSignMode, RsaMode } from "../types/CurlGenerator";

/*
 * Same as Java sample
 *
 * NOTE: AES requires a 16, 24, or 32 byte key. This placeholder is 34
 * characters. crypto.subtle would throw immediately on it (confirmed via
 * testing); forge will NOT throw and will silently derive output from
 * whatever bytes are here. Verify the real production key's exact byte
 * length before relying on this in production - see compare.mjs.
 */
export const STATIC_AES_KEY =
  "11111111111111111111111111111111";

/*
 * Paste base64 private key later
 */
export const PRIVATE_KEY_BASE64 = "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCf0Og+dmHtDPprHcqtpHQgBa2ujJFZf6yr7QGUhDMCxin8n+EejUqLOQ8CK3HaBcKE8WPc0Z/g66X11oYLfT5dRclWN0tP052fBXGZ3S+vnUwpSMGvFncu5ab6Tz31JORKLUZpV04EZHp6nhGD/A15M4yxHwiMfebyIhMhkgX/9dsuDAYim3glLduHOmGocrx812qUcnXpCicJX53CmRdEbhsj7/nnqTPyyZFv0KGNevXmUKdmdLXjnbFhdda1cgG9p0qNBPpzwCNqXymKwfXx5T7nU3V24c3+lMOuXBiUDbuIBQUvuTSvcfwetS/SqLWREJG0okshpBgBF/sprcKFAgMBAAECggEAWr3IECcxZOI4kXdh7APzN3dh7Ti9Ep8OkLPKcOQ6/nk7v8ebj7hTugcUwXufclZQ4yEYPXn8mD3UhmhexclADr+gGMbeiR2zYmY54U4YVFMwukQoTNypoUQd8gPqPvXKdV+NmiRLFO1kKZj0gwcrM0UUvkDLntGhvpugVzBNHc459rkhGmTcnr74DDgb98lI9eQf+FOp5iuBXW0e+wb6dbrB0FgUczjvk565GOtpql6tA5DiMEAKmBoLegsDkDXR23EHZGiXivWNJQi6tlFbFBSHB5hD2jS2To1NnCVEPXl0yHtulAR5lpACOv9WkYbtCzCYK9gLsCkA87SgPO56JQKBgQDPfld2OQhHoFGQ3B9YcdJa5ChOEOVJMbhNJFg1MD4BdmGyx+dt5kDkDOGPGhJWOx7cu2rvxeyCO5yA69HUsc2EpBaLFp5Z5cl7AWoFJZZIrZe59xw05O57MwzwaWWg9M6irUKU56YTqmrsgzbPnDGO1tqz935YP2XKhoH/68OLgwKBgQDFLUJKsTlD2oW2VYx7EOdHNGl55UepKDEkNaDEhIclbj9SCoYKaShIxFMQ3EPkydK6nk4Fm36ZS7dU9mlHWJ4m6o6r3369pRsq6eI+053bMxClpoE9fBqFNSLtOvCd7E0RZbpK6jU6ODxhROwzAdwl5Oa/TpUWotXeRU47ykTzVwKBgQCwIKCBO9wpYI6cFh2NZ+CVQoJr8a+PN+MnqCgvzel0OFap+UIbaY2/hqeYXxsdk0WZPIWDTlB6I7uvO317vAmmA9sW6XY0/PbPsN2bzNIKkz/tnTKWO5WrgiQDlpOr0uHr+IJB/3hbzRbB+Id4Jy9x/jLa/MSEiBwRk6eZ4ziznQKBgQCeBPl9tq44DObgC4t8DT3suLpXMELP9B/97uSa2cMdYk9oxnpJ2aCpQH15o6zdrEkvujK5F7bLz/xrINeakBCfC5evcnu2LJ2rNKlWxG1cAH604s3soor2enE1QekYBwp0iNxVsYFa2Tq6kWviLPlrfRjX9HhTHcjcSxq5nA7KHQKBgQCjpXyfAui+YFV9z2ECICrfRd3vvR3RS6C6GCBo2YoumZbTRA3a/vmV8d5LAkvvwbCQkTZBuFXs7CgjlDvivxcgt8XLpeDjUnQbzSQ3hlEapUyydOyzo1fjlVcmGjrgr52e1uKGp3Lo2nO1s7FZ2ZCdzOr/yZeisy/F3oVfUVtRQw==";

/* ==========================================================
   Base64 Helpers
   Kept with the same names/signatures as the Web Crypto version
   so any other file importing them doesn't need to change, but
   they're now trivial wrappers - forge works with binary strings
   internally, not ArrayBuffers.
========================================================== */

export function arrayBufferToBase64(buffer: ArrayBufferLike | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/* ==========================================================
   Certificate Helpers
========================================================== */

export function pemToBase64(pem: string): string {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .trim();
}

/**
 * Resolves a PEM public key OR certificate into a forge public key object.
 * Replaces the old importPublicKey() which returned a CryptoKey.
 */
export function importPublicKey(pem: string): forge.pki.rsa.PublicKey {
  if (pem.includes("BEGIN CERTIFICATE")) {
    const cert = forge.pki.certificateFromPem(pem);
    return cert.publicKey as forge.pki.rsa.PublicKey;
  }

  if (pem.includes("BEGIN PUBLIC KEY")) {
    return forge.pki.publicKeyFromPem(pem);
  }

  throw new Error("Unsupported certificate format");
}

/* ==========================================================
   Private Key Import
========================================================== */

/**
 * Wraps the raw base64 PKCS8 key into PEM form and parses it with forge.
 * Replaces the old importPrivateKey() which returned a CryptoKey usable
 * only for "sign".
 */
export function importPrivateKey(): forge.pki.rsa.PrivateKey {
  const pem =
    "-----BEGIN PRIVATE KEY-----\n" +
    (PRIVATE_KEY_BASE64.match(/.{1,64}/g) ?? []).join("\n") +
    "\n-----END PRIVATE KEY-----";

  return forge.pki.privateKeyFromPem(pem);
}

/* ==========================================================
   AES CBC / PKCS5Padding
   forge applies PKCS#7 padding automatically for AES-CBC, which
   is equivalent to PKCS5 padding at AES's 16-byte block size -
   no manual padding step required, same as the old subtle version.
========================================================== */

export async function aesEncryptCBC(
  plainText: string,
  bytes = 16
): Promise<string> {
  const keyBytes = forge.util.createBuffer(STATIC_AES_KEY).getBytes();
  const iv = keyBytes.slice(0, bytes);

  const cipher = forge.cipher.createCipher("AES-CBC", keyBytes);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(plainText, "utf8"));
  cipher.finish();

  return forge.util.encode64(cipher.output.getBytes());
}

/* ==========================================================
   AES CBC Decrypt / PKCS5Padding
========================================================== */

export async function aesDecryptCBC(
  cipherText: string,
  bytes = 16
): Promise<string> {
  const keyBytes = forge.util.createBuffer(STATIC_AES_KEY).getBytes();
  const iv = keyBytes.slice(0, bytes);

  const decipher = forge.cipher.createDecipher("AES-CBC", keyBytes);
  decipher.start({ iv });
  decipher.update(forge.util.createBuffer(forge.util.decode64(cipherText)));

  const success = decipher.finish();
  if (!success) {
    throw new Error("AES-CBC decryption failed (bad key, IV, or padding)");
  }

  return decipher.output.toString();
}

/* ==========================================================
   AES GCM
   Web Crypto concatenates ciphertext+tag in its output; this
   mirrors that so anything reading the base64 output (e.g. a
   Java backend expecting that format) doesn't need to change.
========================================================== */

export async function aesEncryptGCM(
  plainText: string,
  bytes = 12
): Promise<string> {
  return aesEncryptGCMwithKey(plainText, STATIC_AES_KEY, bytes);
}

export async function aesEncryptGCMwithKey(
  plainText: string,
  key: string,
  bytes = 12
): Promise<string> {
  const keyBytes = forge.util.createBuffer(key).getBytes();
  const iv = keyBytes.slice(0, bytes);

  const cipher = forge.cipher.createCipher("AES-GCM", keyBytes);
  cipher.start({ iv, tagLength: 128 });
  cipher.update(forge.util.createBuffer(plainText, "utf8"));
  cipher.finish();

  const tag = cipher.mode.tag.getBytes();
  return forge.util.encode64(cipher.output.getBytes() + tag);
}

/* ==========================================================
   AES GCM Decrypt
========================================================== */

export async function aesDecryptGCM(
  cipherText: string,
  bytes = 12
): Promise<string> {
  return aesDecryptGCMwithKey(cipherText, STATIC_AES_KEY, bytes);
}

export async function aesDecryptGCMwithKey(
  cipherText: string,
  key: string,
  bytes = 12
): Promise<string> {
  const keyBytes = forge.util.createBuffer(key).getBytes();
  const iv = keyBytes.slice(0, bytes);

  const raw = forge.util.decode64(cipherText);
  const tag = raw.slice(raw.length - 16); // 128-bit tag = 16 bytes
  const data = raw.slice(0, raw.length - 16);

  const decipher = forge.cipher.createDecipher("AES-GCM", keyBytes);
  decipher.start({ iv, tagLength: 128, tag: forge.util.createBuffer(tag) });
  decipher.update(forge.util.createBuffer(data));

  const pass = decipher.finish();
  if (!pass) {
    throw new Error("AES-GCM authentication failed (bad key, IV, or tampered ciphertext)");
  }

  return decipher.output.toString();
}

/* ==========================================================
   RSA Encrypt (RSA-OAEP, SHA-256)
   forge's mgf1 hash defaults to match `md` when not set
   explicitly (verified against forge's pkcs1.js source), so
   this matches Web Crypto's RSA-OAEP/SHA-256 behavior without
   needing an explicit mgf1 override.
========================================================== */

export async function rsaEncrypt(
  publicPem: string,
  value: string
): Promise<string> {
  return rsaEncryptWithMode(publicPem, value, "RSA-OAEP-SHA256");
}

function getRsaDigest(mode: RsaMode): forge.md.MessageDigest {
  switch (mode) {
    case "RSA-OAEP-SHA1":
      return forge.md.sha1.create();
    case "RSA-OAEP-SHA384":
      return forge.md.sha384.create();
    case "RSA-OAEP-SHA512":
      return forge.md.sha512.create();
    case "RSA-OAEP-SHA256":
    default:
      return forge.md.sha256.create();
  }
}

export async function rsaEncryptWithMode(
  publicPem: string,
  value: string,
  mode: RsaMode
): Promise<string> {
  const publicKey = importPublicKey(publicPem);

  if (mode === "RSAES-PKCS1-V1_5") {
    const encrypted = publicKey.encrypt(value, "RSAES-PKCS1-V1_5");
    return forge.util.encode64(encrypted);
  }

  const encrypted = publicKey.encrypt(value, "RSA-OAEP", {
    md: getRsaDigest(mode),
  });

  return forge.util.encode64(encrypted);
}

/* ==========================================================
   Digital Signature (RSASSA-PKCS1-v1.5, SHA-256)
========================================================== */

export async function signData(
  plainText: string
): Promise<string> {
  return signDataWithMode(plainText, "RSASSA-PKCS1-V1_5");
}

function normalizeForSignature(plainText: string): string {
  return plainText
    .replace(/ "/g, '"')
    .replace(/" /g, '"')
    .replace(/: /g, ":");
}

export async function signDataWithMode(
  plainText: string,
  mode: DigiSignMode
): Promise<string> {
  if (!PRIVATE_KEY_BASE64.length) {
    throw new Error("PRIVATE_KEY_BASE64 not configured.");
  }

  const privateKey = importPrivateKey();
  const normalized = normalizeForSignature(plainText);
  const md = forge.md.sha256.create();
  md.update(normalized, "utf8");

  if (mode === "RSA-PSS") {
    const signWithOptions = privateKey.sign as (
      digest: forge.md.MessageDigest,
      scheme?: string,
      schemeOptions?: Record<string, unknown>,
    ) => string;
    const signature = signWithOptions(md, "RSA-PSS", {
      mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
      saltLength: 20,
    });
    return forge.util.encode64(signature);
  }

  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

async function aesEncryptBlockMode(
  algorithm: forge.cipher.Algorithm,
  plainText: string,
  bytes: number,
  useIv: boolean
): Promise<string> {
  const keyBytes = forge.util.createBuffer(STATIC_AES_KEY).getBytes();
  const cipher = forge.cipher.createCipher(algorithm, keyBytes);

  if (useIv) {
    cipher.start({ iv: keyBytes.slice(0, bytes) });
  } else {
    cipher.start();
  }

  cipher.update(forge.util.createBuffer(plainText, "utf8"));
  cipher.finish();

  return forge.util.encode64(cipher.output.getBytes());
}

export async function aesEncrypt(
  mode: AesMode,
  plainText: string,
  bytes: 12 | 16 = 16
): Promise<string> {
  switch (mode) {
    case "AES-GCM":
      return aesEncryptGCM(plainText, bytes);
    case "AES-CBC":
      return aesEncryptCBC(plainText, bytes);
    case "AES-CFB":
      return aesEncryptBlockMode("AES-CFB", plainText, bytes, true);
    case "AES-OFB":
      return aesEncryptBlockMode("AES-OFB", plainText, bytes, true);
    case "AES-CTR":
      return aesEncryptBlockMode("AES-CTR", plainText, bytes, true);
    case "AES-ECB":
      return aesEncryptBlockMode("AES-ECB", plainText, bytes, false);
    default:
      throw new Error(`Unsupported AES mode: ${mode}`);
  }
}

/* ==========================================================
   JSON Serialize
========================================================== */

export function normalizeJson(
  value: string
): string {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
}
