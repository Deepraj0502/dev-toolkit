import { aesDecryptGCMwithKey, aesEncryptGCMwithKey } from "../modules/curl-generator/utils/crypto";

export async function getAccessToken(key: string): Promise<string | null> {
  const stored = sessionStorage.getItem("accessToken");
  if (!stored) return null;
  return aesDecryptGCMwithKey(stored, key); // mirror of aesEncryptGCMwithKey
}

export async function setAccessToken(
  accessToken: string,
  key: string
): Promise<void> {
  const encrypted = await aesEncryptGCMwithKey(accessToken, key);
  sessionStorage.setItem("accessToken", encrypted);
}

export function getUsername(): string | null {
    let username = sessionStorage.getItem("username");
    return username;
}

export function setUsername(username: string): void {
  sessionStorage.setItem("username", username);
}