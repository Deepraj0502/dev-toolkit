import JSZip from "jszip";
import type { ProjectNode } from "../types/ProjectNode";
import { decodeText, getExtension } from "../utils/helper";

export default class ProjectTree {
  async build(zip: JSZip): Promise<ProjectNode[]> {
    const nodes: ProjectNode[] = [];
    const promises = Object.keys(zip.files).map(async (key) => {
      const item = zip.files[key];
      const normalizedPath = key.replace(/^\/+/, "").replace(/\\/g, "/");
      if (!normalizedPath) {
        return;
      }

      const name = normalizedPath.split("/").filter(Boolean).pop() ?? normalizedPath;
      const extension = getExtension(name);

      if (item.dir) {
        nodes.push({
          path: normalizedPath,
          name,
          extension,
          isDirectory: true
        });
        return;
      }

      const bytes = await item.async("uint8array");
      const textContent = decodeText(bytes);
      const isLikelyText = textContent.includes("\n") || textContent.includes("\r") || textContent.includes(" ") || textContent.length < 512;

      nodes.push({
        path: normalizedPath,
        name,
        extension,
        isDirectory: false,
        ...(isLikelyText ? { textContent } : { binaryContent: bytes })
      });
    });

    await Promise.all(promises);
    return nodes;
  }
}