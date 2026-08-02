import { isTextExtension, replaceTemplateTokens } from "../utils/helper";
import type { TemplateProfile } from "../config/templateProfiles";
import type { ProjectNode } from "../types/ProjectNode";

export default class ReplaceEngine {
  replaceContent(
    nodes: ProjectNode[],
    request: {
      apiName: string;
      swaggerTitle?: string;
      swaggerDescription?: string;
      basePath?: string;
    },
    profile: TemplateProfile
  ): ProjectNode[] {
    const projectName = `${request.apiName}${profile.suffix}`;
    const serviceName = request.apiName;

    return nodes.map((node) => {
      if (node.isDirectory || !node.textContent) {
        return node;
      }

      if (!isTextExtension(node.extension.toLowerCase())) {
        return node;
      }

      const content = replaceTemplateTokens(node.textContent, profile, projectName, serviceName);

      return {
        ...node,
        textContent: content
      };
    });
  }
}
