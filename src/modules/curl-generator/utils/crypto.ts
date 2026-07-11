import forge from "node-forge";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/*
 * Same as Java sample
 */
export const STATIC_AES_KEY =
  "11111111111111111111111111111111";

/*
 * Paste base64 private key later
 */
export const PRIVATE_KEY_BASE64 = "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCf0Og+dmHtDPprHcqtpHQgBa2ujJFZf6yr7QGUhDMCxin8n+EejUqLOQ8CK3HaBcKE8WPc0Z/g66X11oYLfT5dRclWN0tP052fBXGZ3S+vnUwpSMGvFncu5ab6Tz31JORKLUZpV04EZHp6nhGD/A15M4yxHwiMfebyIhMhkgX/9dsuDAYim3glLduHOmGocrx812qUcnXpCicJX53CmRdEbhsj7/nnqTPyyZFv0KGNevXmUKdmdLXjnbFhdda1cgG9p0qNBPpzwCNqXymKwfXx5T7nU3V24c3+lMOuXBiUDbuIBQUvuTSvcfwetS/SqLWREJG0okshpBgBF/sprcKFAgMBAAECggEAWr3IECcxZOI4kXdh7APzN3dh7Ti9Ep8OkLPKcOQ6/nk7v8ebj7hTugcUwXufclZQ4yEYPXn8mD3UhmhexclADr+gGMbeiR2zYmY54U4YVFMwukQoTNypoUQd8gPqPvXKdV+NmiRLFO1kKZj0gwcrM0UUvkDLntGhvpugVzBNHc459rkhGmTcnr74DDgb98lI9eQf+FOp5iuBXW0e+wb6dbrB0FgUczjvk565GOtpql6tA5DiMEAKmBoLegsDkDXR23EHZGiXivWNJQi6tlFbFBSHB5hD2jS2To1NnCVEPXl0yHtulAR5lpACOv9WkYbtCzCYK9gLsCkA87SgPO56JQKBgQDPfld2OQhHoFGQ3B9YcdJa5ChOEOVJMbhNJFg1MD4BdmGyx+dt5kDkDOGPGhJWOx7cu2rvxeyCO5yA69HUsc2EpBaLFp5Z5cl7AWoFJZZIrZe59xw05O57MwzwaWWg9M6irUKU56YTqmrsgzbPnDGO1tqz935YP2XKhoH/68OLgwKBgQDFLUJKsTlD2oW2VYx7EOdHNGl55UepKDEkNaDEhIclbj9SCoYKaShIxFMQ3EPkydK6nk4Fm36ZS7dU9mlHWJ4m6o6r3369pRsq6eI+053bMxClpoE9fBqFNSLtOvCd7E0RZbpK6jU6ODxhROwzAdwl5Oa/TpUWotXeRU47ykTzVwKBgQCwIKCBO9wpYI6cFh2NZ+CVQoJr8a+PN+MnqCgvzel0OFap+UIbaY2/hqeYXxsdk0WZPIWDTlB6I7uvO317vAmmA9sW6XY0/PbPsN2bzNIKkz/tnTKWO5WrgiQDlpOr0uHr+IJB/3hbzRbB+Id4Jy9x/jLa/MSEiBwRk6eZ4ziznQKBgQCeBPl9tq44DObgC4t8DT3suLpXMELP9B/97uSa2cMdYk9oxnpJ2aCpQH15o6zdrEkvujK5F7bLz/xrINeakBCfC5evcnu2LJ2rNKlWxG1cAH604s3soor2enE1QekYBwp0iNxVsYFa2Tq6kWviLPlrfRjX9HhTHcjcSxq5nA7KHQKBgQCjpXyfAui+YFV9z2ECICrfRd3vvR3RS6C6GCBo2YoumZbTRA3a/vmV8d5LAkvvwbCQkTZBuFXs7CgjlDvivxcgt8XLpeDjUnQbzSQ3hlEapUyydOyzo1fjlVcmGjrgr52e1uKGp3Lo2nO1s7FZ2ZCdzOr/yZeisy/F3oVfUVtRQw==";



/* ==========================================================
   Type-normalizing helper
   TS 5.7+ types ArrayBufferView as generic over ArrayBuffer
   specifically, but Uint8Arrays from .slice(), TextEncoder.encode(),
   etc. often carry the wider Uint8Array<ArrayBufferLike> generic
   (which includes SharedArrayBuffer), so crypto.subtle rejects them
   at compile time even though they're valid at runtime. Copying into
   a fresh Uint8Array forces the concrete ArrayBuffer-backed type.
========================================================== */

function toU8(data: Uint8Array | ArrayBuffer): Uint8Array<ArrayBuffer> {
  return new Uint8Array(data);
}



/* ==========================================================
   Base64 Helpers
========================================================== */

// Accepts ArrayBuffer | Uint8Array | ArrayBufferLike so callers can pass
// either a raw crypto.subtle result (ArrayBuffer) or a typed array
// (e.g. someUint8Array, someUint8Array.buffer) without hitting the
// "SharedArrayBuffer not assignable to ArrayBuffer" overload error.
export function arrayBufferToBase64(buffer: ArrayBufferLike | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

// Returns Uint8Array (a valid BufferSource) rather than unwrapping to
// .buffer, which avoids the ArrayBuffer/Uint8Array type mismatch at
// every call site below (crypto.subtle.importKey/encrypt/decrypt all
// accept Uint8Array directly).
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

export async function importPublicKey(pem: string): Promise<CryptoKey> {

    let spkiBytes: Uint8Array;

    if (pem.includes("BEGIN PUBLIC KEY")) {

        spkiBytes = base64ToArrayBuffer(pemToBase64(pem));

    } else if (pem.includes("BEGIN CERTIFICATE")) {

        const cert = forge.pki.certificateFromPem(pem);

        const publicKeyAsn1 = forge.pki.publicKeyToAsn1(cert.publicKey);

        const spkiDer = forge.asn1.toDer(publicKeyAsn1).getBytes();

        spkiBytes = Uint8Array.from(
            spkiDer,
            c => c.charCodeAt(0)
        );

    } else {
        throw new Error("Unsupported certificate format");
    }

    return crypto.subtle.importKey(
        "spki",
        toU8(spkiBytes),
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        false,
        ["encrypt"]
    );
}


/* ==========================================================
   Private Key Import
========================================================== */

export async function importPrivateKey(): Promise<CryptoKey> {

  const raw = base64ToArrayBuffer(PRIVATE_KEY_BASE64);

  return crypto.subtle.importKey(
    "pkcs8",
    toU8(raw),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

}



/* ==========================================================
   AES GCM
========================================================== */

export async function aesEncryptGCM(
  plainText: string
): Promise<string> {

  const keyBytes = encoder.encode(STATIC_AES_KEY);

  const iv = toU8(keyBytes.slice(0, 12));

  const cryptoKey =
    await crypto.subtle.importKey(
      "raw",
      toU8(keyBytes),
      "AES-GCM",
      false,
      ["encrypt"]
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128
      },
      cryptoKey,
      toU8(encoder.encode(plainText))
    );

  return arrayBufferToBase64(encrypted);

}



/* ==========================================================
   AES Decrypt
========================================================== */

export async function aesDecryptGCM(
  cipherText: string
): Promise<string> {

  const keyBytes = encoder.encode(STATIC_AES_KEY);

  const iv = toU8(keyBytes.slice(0, 12));

  const cryptoKey =
    await crypto.subtle.importKey(
      "raw",
      toU8(keyBytes),
      "AES-GCM",
      false,
      ["decrypt"]
    );

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128
      },
      cryptoKey,
      toU8(base64ToArrayBuffer(cipherText))
    );

  return decoder.decode(decrypted);

}



/* ==========================================================
   RSA Encrypt
========================================================== */

export async function rsaEncrypt(
  publicPem: string,
  value: string
): Promise<string> {

  const key =
    await importPublicKey(publicPem);

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      key,
      toU8(encoder.encode(value))
    );

  return arrayBufferToBase64(encrypted);

}



/* ==========================================================
   Digital Signature
========================================================== */

export async function signData(
  plainText: string
): Promise<string> {

  if (!PRIVATE_KEY_BASE64.length) {

    throw new Error(
      "PRIVATE_KEY_BASE64 not configured."
    );

  }

  const key =
    await importPrivateKey();

  const signature =
    await crypto.subtle.sign(
      {
        name: "RSASSA-PKCS1-v1_5"
      },
      key,
      toU8(encoder.encode(
        plainText
          .replace(/ "/g,'"')
          .replace(/" /g,'"')
          .replace(/: /g,":")
      ))
    );

  return arrayBufferToBase64(signature);

}



/* ==========================================================
   JSON Serialize
========================================================== */

export function normalizeJson(
  value: string
): string {

  try {

    return JSON.stringify(
      JSON.parse(value)
    );

  } catch {

    return value;

  }

}