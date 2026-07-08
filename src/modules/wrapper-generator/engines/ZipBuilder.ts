import JSZip from "jszip";
import type { ProjectNode } from "../types/ProjectNode";

export default class ZipBuilder {
  async buildArchive(nodes: ProjectNode[]): Promise<Blob> {
    const zip = new JSZip();

    nodes.forEach((node) => {
      if (node.isDirectory) {
        zip.folder(node.path);
        return;
      }

      if (node.binaryContent) {
        zip.file(node.path, node.binaryContent);
      } else if (node.textContent) {
        zip.file(node.path, node.textContent);
      }
    });

    const blob = await zip.generateAsync({ type: "blob" });
    return new Blob([blob], { type: "application/zip" });
  }
}
