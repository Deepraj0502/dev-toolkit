import type { TemplateProfile } from "../config/templateProfiles";
import type { ProjectNode } from "../types/ProjectNode";

/**
 * Used by the Bank Wrapper flow only.
 *
 * Unlike the third-party flow (SwaggerEngine), bank wrappers do not have
 * their swagger auto-filled from form fields. Instead the user drags and
 * drops their own swagger JSON file, and that file's raw content replaces
 * the template's placeholder swagger JSON file, verbatim, byte for byte.
 * Run this AFTER renaming/content-replacement so the user's swagger content
 * is never touched by the generic token-replace passes.
 *
 * IMPORTANT: the swagger placeholder's filename in the template zip is not
 * guaranteed to contain the template's project/service token (e.g. a bank
 * template's placeholder json can be named completely unrelated to its own
 * project folder, such as "collateralRevampEnquiry_expDS.json" inside a
 * "TransferClosureDepositAmend_expDS" project). RenameEngine's token
 * substitution therefore can't be relied on to rename it. So we explicitly
 * rename the file (and its path entry) to match the given API name here,
 * instead of assuming the generic rename pass already handled it.
 */
export default class SwaggerInsertEngine {
  insertSwagger(
    nodes: ProjectNode[],
    swaggerRawText: string,
    apiName: string,
    profile: TemplateProfile
  ): ProjectNode[] {
    let inserted = false;
    const newFileName = `${apiName}${profile.suffix}.json`;

    const updated = nodes.map((node) => {
      if (inserted || node.isDirectory) {
        return node;
      }

      if (node.extension.toLowerCase() !== "json") {
        return node;
      }

      inserted = true;

      const lastSlash = node.path.lastIndexOf("/");
      const newPath = lastSlash >= 0 ? `${node.path.slice(0, lastSlash + 1)}${newFileName}` : newFileName;

      return {
        ...node,
        name: newFileName,
        path: newPath,
        textContent: swaggerRawText
      };
    });

    if (!inserted) {
      throw new Error(
        "No swagger placeholder (.json) file was found in the bank template to insert the uploaded swagger into."
      );
    }

    return updated;
  }
}
