import AceEngine from "./AceEngine";
import DownloadEngine from "./DownloadEngine";
import ProjectTree from "./ProjectTree";
import RenameEngine from "./RenameEngine";
import ReplaceEngine from "./ReplaceEngine";
import SwaggerEngine from "./SwaggerEngine";
import SwaggerInsertEngine from "./SwaggerInsertEngine";
import ValidationEngine from "./ValidationEngine";
import ZipBuilder from "./ZipBuilder";
import ZipEngine from "./ZipEngine";
import { BANK_PROFILES, THIRDPARTY_PROFILES } from "../config/templateProfiles";
import type { BankWrapperRequest, WrapperRequest } from "../types/Generator";
import type { LogLevel } from "../types/Logger";
import type { ProjectNode } from "../types/ProjectNode";

export interface GenerationResult {
  archiveName: string;
  nodes: ProjectNode[];
  validationPassed: boolean;
  remainingFiles: string[];
  blob: Blob;
}

type ProgressStep = "template" | "extract" | "rename" | "swagger" | "ace" | "validation" | "zip" | "download";

export default class Generator {
  private zipEngine = new ZipEngine();
  private tree = new ProjectTree();
  private renameEngine = new RenameEngine();
  private replaceEngine = new ReplaceEngine();
  private swaggerEngine = new SwaggerEngine();
  private swaggerInsertEngine = new SwaggerInsertEngine();
  private aceEngine = new AceEngine();
  private validationEngine = new ValidationEngine();
  private zipBuilder = new ZipBuilder();
  private downloadEngine = new DownloadEngine();

  /**
   * Third-party generic routing wrapper generation.
   * `variant` selects between the standard template and the (future)
   * CCSID template — both are embedded, there is no zip upload anymore.
   */
  async generate(
    request: WrapperRequest,
    onLog: (level: LogLevel, message: string) => void,
    onProgress: (step: ProgressStep) => void,
    variant: "standard" | "ccsid" = "standard"
  ): Promise<GenerationResult> {
    const profile = THIRDPARTY_PROFILES[variant];

    onLog("info", `Loading embedded template: ${profile.label} (${profile.templateProject})...`);
    const zip = await this.zipEngine.loadTemplate(profile);
    onProgress("template");

    const nodes = await this.tree.build(zip);
    onLog("success", `${nodes.length} files loaded from template.`);
    onProgress("extract");

    onLog("info", "Renaming folders and files...");
    const renamedNodes = this.renameEngine.renameNodes(nodes, request.apiName, profile);
    onProgress("rename");
    onLog("success", "Folders and files renamed.");

    onLog("info", "Applying content replacements...");
    const replacedNodes = this.replaceEngine.replaceContent(renamedNodes, request, profile);
    const swaggerNodes = this.swaggerEngine.updateSwagger(replacedNodes, request);
    onProgress("swagger");
    onLog("success", "Swagger and wrapper references updated.");

    onLog("info", "Updating IBM ACE artifacts...");
    const aceNodes = this.aceEngine.updateAce(swaggerNodes, request.apiName, profile);
    onProgress("ace");
    onLog("success", "IBM ACE artifacts updated.");

    const validation = this.validationEngine.validate(aceNodes, profile);
    onProgress("validation");
    onLog(
      validation.passed ? "success" : "error",
      validation.passed ? "Validation passed." : `Validation failed: ${validation.remainingFiles.join(", ")}`
    );

    const archiveName = `${request.apiName}.zip`;
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

  /**
   * Bank wrapper generation (Normal / TH / BTH).
   * Swagger is NOT auto-filled from form fields here — the user's own
   * drag-and-dropped swagger file is inserted verbatim after renaming and
   * content-replacement, so it's never touched by the token-replace passes.
   * The three variants only differ in which embedded template (and its
   * baked-in IBM ACE validation file) gets loaded; the rename/replace flow
   * is identical to the third-party flow.
   */
  async generateBank(
    request: BankWrapperRequest,
    onLog: (level: LogLevel, message: string) => void,
    onProgress: (step: ProgressStep) => void
  ): Promise<GenerationResult> {
    const profile = BANK_PROFILES[request.variant];

    onLog("info", `Loading embedded bank template: ${profile.label} (${profile.templateProject})...`);
    const zip = await this.zipEngine.loadTemplate(profile);
    onProgress("template");

    const nodes = await this.tree.build(zip);
    onLog("success", `${nodes.length} files loaded from template.`);
    onProgress("extract");

    onLog("info", "Renaming folders and files...");
    const renamedNodes = this.renameEngine.renameNodes(nodes, request.apiName, profile);
    onProgress("rename");
    onLog("success", "Folders and files renamed.");

    onLog("info", "Applying content replacements...");
    const replacedNodes = this.replaceEngine.replaceContent(
      renamedNodes,
      { apiName: request.apiName },
      profile
    );
    onProgress("swagger");
    onLog("success", "Wrapper references updated.");

    onLog("info", "Updating IBM ACE artifacts...");
    const aceNodes = this.aceEngine.updateAce(replacedNodes, request.apiName, profile);
    onProgress("ace");
    onLog("success", "IBM ACE artifacts updated (including validation file for this variant).");

    onLog("info", `Inserting uploaded swagger: ${request.swaggerFileName}...`);
    const finalNodes = this.swaggerInsertEngine.insertSwagger(aceNodes, request.swaggerText, request.apiName, profile);
    onLog("success", "Uploaded swagger inserted as-is.");

    const validation = this.validationEngine.validate(finalNodes, profile);
    onProgress("validation");
    onLog(
      validation.passed ? "success" : "error",
      validation.passed ? "Validation passed." : `Validation failed: ${validation.remainingFiles.join(", ")}`
    );

    const archiveName = `${request.apiName}.zip`;
    const blob = await this.zipBuilder.buildArchive(finalNodes);
    onProgress("zip");
    onLog("success", `${archiveName} generated.`);

    this.downloadEngine.triggerDownload(blob, archiveName);
    onProgress("download");

    return {
      archiveName,
      nodes: finalNodes,
      validationPassed: validation.passed,
      remainingFiles: validation.remainingFiles,
      blob
    };
  }
}
