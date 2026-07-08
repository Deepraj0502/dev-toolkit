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
    const replacements = [
      { from: TEMPLATE_CONFIG.templateService, to: serviceName },
      { from: TEMPLATE_CONFIG.templateProject, to: projectName },
      { from: "thirdPartyTestWrapper_expDS", to: projectName },
      { from: "thirdPartyTestWrapper", to: serviceName },
      { from: "Swagger title", to: request.swaggerTitle || serviceName },
      { from: "Description", to: request.swaggerDescription || request.swaggerTitle || serviceName },
      { from: "BasePath", to: request.basePath || `/${serviceName.toLowerCase()}` },
      { from: "Operation IDs", to: `${serviceName}Operation` },
      { from: "Compute Names", to: `${serviceName}Compute` },
      { from: "Node Labels", to: `${serviceName}Node` },
      { from: "References", to: `${serviceName}Reference` }
    ];

    return nodes.map((node) => {
      if (node.isDirectory || !node.textContent) {
        return node;
      }

      const extension = node.extension.toLowerCase();
      if (!isTextExtension(extension)) {
        return node;
      }

      let content = node.textContent;
      replacements.forEach(({ from, to }) => {
        content = content.replaceAll(from, to);
      });

      return {
        ...node,
        textContent: content
      };
    });
  }
}
