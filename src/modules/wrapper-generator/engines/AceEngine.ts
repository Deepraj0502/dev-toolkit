import { replaceTemplateTokens } from "../utils/helper";
import type { TemplateProfile } from "../config/templateProfiles";
import type { ProjectNode } from "../types/ProjectNode";

export default class AceEngine {
  updateAce(nodes: ProjectNode[], apiName: string, profile: TemplateProfile): ProjectNode[] {
    const projectName = `${apiName}${profile.suffix}`;
    const serviceName = apiName;

    return nodes.map((node) => {
      if (node.isDirectory || !node.textContent) {
        return node;
      }

      const updated = replaceTemplateTokens(node.textContent, profile, projectName, serviceName);

      return {
        ...node,
        textContent: updated
      };
    });
  }
}
