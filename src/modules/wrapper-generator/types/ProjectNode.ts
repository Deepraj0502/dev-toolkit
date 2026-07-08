export interface ProjectNode {
  path: string;
  name: string;
  extension: string;
  isDirectory: boolean;
  textContent?: string;
  binaryContent?: Uint8Array;
}