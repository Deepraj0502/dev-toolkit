import { REPLACE_EXTENSIONS } from "../config/fileTypes";
import type { TemplateProfile } from "../config/templateProfiles";

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

export function getExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex < 0) {
    return "";
  }

  return name.slice(dotIndex + 1).toLowerCase();
}

export function buildProjectName(apiName: string, profile: TemplateProfile): string {
  return `${apiName}${profile.suffix}`;
}

export function isTextExtension(extension: string): boolean {
  const normalized = extension.toLowerCase();
  return (REPLACE_EXTENSIONS as readonly string[]).some((value) => value === normalized);
}

export function decodeText(buffer: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces both templateProject and templateService tokens in a single pass
 * over the ORIGINAL text (longest token first). Doing this as two chained
 * replaceAll calls is unsafe: templateService is always a substring of
 * templateProject, so if the new project/service names also share that
 * prefix relationship (e.g. apiName starts with the same word as the
 * service token), the second replace re-matches inside what the first
 * replace just wrote, duplicating the suffix
 * (e.g. "..._test_expDS" -> "..._test_expDS_test_expDS").
 */
export function replaceTemplateTokens(
  text: string,
  profile: TemplateProfile,
  projectName: string,
  serviceName: string
): string {
  const tokens = [
    { token: profile.templateProject, value: projectName },
    { token: profile.templateService, value: serviceName }
  ].sort((a, b) => b.token.length - a.token.length);

  const pattern = new RegExp(tokens.map((t) => escapeRegExp(t.token)).join("|"), "g");

  return text.replace(pattern, (match) => {
    const hit = tokens.find((t) => t.token === match);
    return hit ? hit.value : match;
  });
}
