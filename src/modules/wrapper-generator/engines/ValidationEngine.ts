import { TEMPLATE_CONFIG } from "../config/templateConfig";
import type { ProjectNode } from "../types/ProjectNode";

export interface ValidationResult {
  passed: boolean;
  remainingFiles: string[];
}

export default class ValidationEngine {
  validate(nodes: ProjectNode[]): ValidationResult {
    const remainingFiles = nodes
      .filter((node) => !node.isDirectory)
      .map((node) => node.path)
      .filter((path) => {
        const normalized = path.toLowerCase();
        return normalized.includes(TEMPLATE_CONFIG.templateService.toLowerCase()) || normalized.includes(TEMPLATE_CONFIG.templateProject.toLowerCase());
      });

    return {
      passed: remainingFiles.length === 0,
      remainingFiles
    };
  }
}
