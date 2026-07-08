import AceEngine from "./AceEngine";
import DownloadEngine from "./DownloadEngine";
import ProjectTree from "./ProjectTree";
import RenameEngine from "./RenameEngine";
import ReplaceEngine from "./ReplaceEngine";
import SwaggerEngine from "./SwaggerEngine";
import ValidationEngine from "./ValidationEngine";
import ZipBuilder from "./ZipBuilder";
import ZipEngine from "./ZipEngine";
import { TEMPLATE_CONFIG } from "../config/templateConfig";
import type { WrapperRequest } from "../types/Generator";
import type { LogLevel } from "../types/Logger";
import type { ProjectNode } from "../types/ProjectNode";

export interface GenerationResult {
  archiveName: string;
  nodes: ProjectNode[];
  validationPassed: boolean;
  remainingFiles: string[];
  blob: Blob;
}

export default class Generator {
  private zipEngine = new ZipEngine();
  private tree = new ProjectTree();
  private renameEngine = new RenameEngine();
  private replaceEngine = new ReplaceEngine();
  private swaggerEngine = new SwaggerEngine();
  private aceEngine = new AceEngine();
  private validationEngine = new ValidationEngine();
  private zipBuilder = new ZipBuilder();
  private downloadEngine = new DownloadEngine();

  async generate(
    request: WrapperRequest,
    onLog: (level: LogLevel, message: string) => void,
    onProgress: (step: "template" | "extract" | "rename" | "swagger" | "ace" | "validation" | "zip" | "download") => void
  ): Promise<GenerationResult> {
    onLog("info", "Loading template...");
    const zip = await this.zipEngine.loadTemplate();
    onProgress("template");

    const nodes = await this.tree.build(zip);
    onLog("success", `${nodes.length} files loaded from the template.`);
    onProgress("extract");

    onLog("info", "Renaming folders and files...");
    const renamedNodes = this.renameEngine.renameNodes(nodes, request.apiName);
    onProgress("rename");
    onLog("success", "Folders and files renamed.");

    onLog("info", "Applying content replacements...");
    const replacedNodes = this.replaceEngine.replaceContent(renamedNodes, request);
    const swaggerNodes = this.swaggerEngine.updateSwagger(replacedNodes, request);
    onProgress("swagger");
    onLog("success", "Swagger and wrapper references updated.");

    onLog("info", "Updating IBM ACE artifacts...");
    const aceNodes = this.aceEngine.updateAce(swaggerNodes, request.apiName);
    onProgress("ace");
    onLog("success", "IBM ACE artifacts updated.");

    const validation = this.validationEngine.validate(aceNodes);
    onProgress("validation");
    onLog(
      validation.passed ? "success" : "error",
      validation.passed ? "Validation passed." : `Validation failed: ${validation.remainingFiles.join(", ")}`
    );

    const archiveName = `${request.apiName}${TEMPLATE_CONFIG.suffix}.zip`;
    const blob = await this.zipBuilder.buildArchive(aceNodes);
    onProgress("zip");
    onLog("success", `${archiveName} generated.`);

    this.downloadEngine.triggerDownload(blob, archiveName);
    onProgress("download");

    return {
      archiveName,
      nodes: aceNodes,
      validationPassed: validation.passed,
      remainingFiles: validation.remainingFiles,
      blob
    };
  }
}