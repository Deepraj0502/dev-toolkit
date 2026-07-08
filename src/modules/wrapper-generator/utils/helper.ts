import { TEMPLATE_CONFIG } from "../config/templateConfig";

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

export function buildProjectName(apiName: string): string {
  return `${apiName}${TEMPLATE_CONFIG.suffix}`;
}

export function isTextExtension(extension: string): boolean {
  const normalized = extension.toLowerCase();
  return TEMPLATE_CONFIG.replaceExtensions.some((value) => value === normalized);
}

export function decodeText(buffer: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}
