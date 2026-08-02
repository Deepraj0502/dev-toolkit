import { replaceTemplateTokens } from "../utils/helper";
import type { TemplateProfile } from "../config/templateProfiles";
import type { ProjectNode } from "../types/ProjectNode";

export default class RenameEngine {
  renameNodes(nodes: ProjectNode[], apiName: string, profile: TemplateProfile): ProjectNode[] {
    const projectName = `${apiName}${profile.suffix}`;
    const serviceName = apiName;

    return nodes.map((node) => {
      const updatedPath = replaceTemplateTokens(node.path, profile, projectName, serviceName);
      const updatedName = replaceTemplateTokens(node.name, profile, projectName, serviceName);

      return {
        ...node,
        path: updatedPath,
        name: updatedName
      };
    });
  }
}
