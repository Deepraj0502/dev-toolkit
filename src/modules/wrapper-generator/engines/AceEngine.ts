import { TEMPLATE_CONFIG } from "../config/templateConfig";
import type { ProjectNode } from "../types/ProjectNode";

export default class AceEngine {
  updateAce(nodes: ProjectNode[], apiName: string): ProjectNode[] {
    const projectName = `${apiName}${TEMPLATE_CONFIG.suffix}`;
    const serviceName = apiName;

    return nodes.map((node) => {
      if (node.isDirectory || !node.textContent) {
        return node;
      }

      const updated = node.textContent
        .replaceAll(TEMPLATE_CONFIG.templateProject, projectName)
        .replaceAll(TEMPLATE_CONFIG.templateService, serviceName)
        .replaceAll("thirdPartyTestWrapper_expDS", projectName)
        .replaceAll("thirdPartyTestWrapper", serviceName);

      return {
        ...node,
        textContent: updated
      };
    });
  }
}
