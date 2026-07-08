import { TEMPLATE_CONFIG } from "./templateConfig";

export const SUPPORTED_TEXT_EXTENSIONS = new Set(TEMPLATE_CONFIG.replaceExtensions);

export const ACE_FILE_EXTENSIONS = [
  ".project",
  ".application",
  ".library",
  ".descriptor",
  ".msgflow",
  ".subflow",
  ".esql",
  ".properties"
];
