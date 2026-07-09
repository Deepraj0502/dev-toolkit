import { TEMPLATE_CONFIG } from "../config/templateConfig";
import { isTextExtension } from "../utils/helper";
import type { ProjectNode } from "../types/ProjectNode";

export default class ReplaceEngine {
  replaceContent(
    nodes: ProjectNode[],
    request: {
      apiName: string;
      swaggerTitle: string;
      swaggerDescription: string;
      basePath: string;
    }
  ): ProjectNode[] {

    const projectName = `${request.apiName}${TEMPLATE_CONFIG.suffix}`;
    const serviceName = request.apiName;

    return nodes.map(node => {

      if (node.isDirectory || !node.textContent) {
        return node;
      }

      if (!isTextExtension(node.extension.toLowerCase())) {
        return node;
      }

      let content = node.textContent;

      content = content.replaceAll(
        TEMPLATE_CONFIG.templateProject,
        projectName
      );

      content = content.replaceAll(
        TEMPLATE_CONFIG.templateService,
        serviceName
      );

      return {
        ...node,
        textContent: content
      };
    });
  }
}
