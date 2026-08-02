// File extensions treated as editable text (content search/replace target),
// shared by every template profile regardless of naming.
export const REPLACE_EXTENSIONS = [
  "esql",
  "msgflow",
  "subflow",
  "project",
  "application",
  "descriptor",
  "properties",
  "xml",
  "json",
  "yaml",
  "yml",
  "txt"
] as const;

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
