import type { ProjectNode } from "../types/ProjectNode";

export default class SwaggerEngine {
  updateSwagger(nodes: ProjectNode[], request: {
    apiName: string;
    swaggerTitle: string;
    swaggerDescription: string;
    basePath: string;
  }): ProjectNode[] {
    const title = request.swaggerTitle || request.apiName;
    const description = request.swaggerDescription || title;
    const basePath = ("/" + request.basePath) || `/${request.apiName.toLowerCase()}`;

    return nodes.map((node) => {
      if (node.isDirectory || !node.textContent) {
        return node;
      }

      const normalized = node.textContent;
      const updated = normalized
        .replace(/"title"\s*:\s*"[^"]*"/, `"title": "${title}"`)
        .replace(/"description"\s*:\s*"[^"]*"/, `"description": "${description}"`)
        .replace(/"version"\s*:\s*"[^"]*"/, `"version": "1.0.0"`)
        .replace(/"basePath"\s*:\s*"[^"]*"/, `"basePath": "${basePath}"`)
        .replace(/"servers"\s*:\s*\[[^\]]*\]/, `"servers": [{ "url": "${basePath}" }]`)
        .replace(/"operationId"\s*:\s*"[^"]*"/, `"operationId": "${request.apiName}Operation"`)
        .replace(/"tags"\s*:\s*\[[^\]]*\]/, `"tags": [{"name" : "${request.apiName}","description" : "${description}"}]`);

      return {
        ...node,
        textContent: updated
      };
    });
  }
}
