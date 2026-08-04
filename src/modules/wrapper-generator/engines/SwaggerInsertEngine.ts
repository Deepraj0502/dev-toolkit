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
 * IMPORTANT (filename): the swagger placeholder's filename in the template
 * zip is not guaranteed to contain the template's project/service token
 * (e.g. a bank template's placeholder json can be named completely
 * unrelated to its own project folder, such as
 * "collateralRevampEnquiry_expDS.json" inside a
 * "TransferClosureDepositAmend_expDS" project). RenameEngine's token
 * substitution therefore can't be relied on to rename it, so we explicitly
 * rename the file (and its path entry) to match the given API name here.
 *
 * IMPORTANT (references): other files reference the swagger by that same
 * literal filename — e.g. restapi.descriptor's `definitionFile` attribute
 * points to it by name. Since that filename also doesn't contain the
 * project/service token, ReplaceEngine's token substitution never catches
 * those references either, and they'd otherwise still point at the OLD
 * filename after we rename the swagger file itself. So after renaming, we
 * sweep every other text file and swap any literal occurrence of the old
 * swagger filename for the new one.
 */
export default class SwaggerInsertEngine {
  insertSwagger(
    nodes: ProjectNode[],
    swaggerRawText: string,
    apiName: string,
    profile: TemplateProfile
  ): ProjectNode[] {
    const targetIndex = nodes.findIndex((node) => !node.isDirectory && node.extension.toLowerCase() === "json");

    if (targetIndex === -1) {
      throw new Error(
        "No swagger placeholder (.json) file was found in the bank template to insert the uploaded swagger into."
      );
    }

    const targetNode = nodes[targetIndex];
    const oldFileName = targetNode.name;
    const newFileName = `${apiName}${profile.suffix}.json`;

    const lastSlash = targetNode.path.lastIndexOf("/");
    const newPath = lastSlash >= 0 ? `${targetNode.path.slice(0, lastSlash + 1)}${newFileName}` : newFileName;

    return nodes.map((node, index) => {
      if (index === targetIndex) {
        return {
          ...node,
          name: newFileName,
          path: newPath,
          textContent: swaggerRawText
        };
      }

      // Sweep other text files for literal references to the old swagger
      // filename (e.g. restapi.descriptor's definitionFile attribute) and
      // point them at the new filename instead.
      if (
        !node.isDirectory &&
        node.textContent &&
        oldFileName !== newFileName &&
        node.textContent.includes(oldFileName)
      ) {
        return {
          ...node,
          textContent: node.textContent.split(oldFileName).join(newFileName)
        };
      }

      return node;
    });
  }
}
