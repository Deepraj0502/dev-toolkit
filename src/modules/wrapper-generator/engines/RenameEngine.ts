import { TEMPLATE_CONFIG } from "../config/templateConfig";
import type { ProjectNode } from "../types/ProjectNode";

export default class RenameEngine {
  renameNodes(nodes: ProjectNode[], apiName: string): ProjectNode[] {
    const projectName = `${apiName}${TEMPLATE_CONFIG.suffix}`;
    const serviceName = apiName;

    return nodes.map((node) => {
      const updatedPath = node.path
        .replaceAll(TEMPLATE_CONFIG.templateProject, projectName)
        .replaceAll(TEMPLATE_CONFIG.templateService, serviceName);

      const updatedName = node.name
        .replaceAll(TEMPLATE_CONFIG.templateProject, projectName)
        .replaceAll(TEMPLATE_CONFIG.templateService, serviceName);

      return {
        ...node,
        path: updatedPath,
        name: updatedName
      };
    });
  }
}
