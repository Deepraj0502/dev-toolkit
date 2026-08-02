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
 */
export default class SwaggerInsertEngine {
  insertSwagger(nodes: ProjectNode[], swaggerRawText: string): ProjectNode[] {
    let inserted = false;

    const updated = nodes.map((node) => {
      if (inserted || node.isDirectory) {
        return node;
      }

      if (node.extension.toLowerCase() !== "json") {
        return node;
      }

      inserted = true;
      return {
        ...node,
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
