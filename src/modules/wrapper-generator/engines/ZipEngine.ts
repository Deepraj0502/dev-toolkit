import JSZip from "jszip";
import type { TemplateProfile } from "../config/templateProfiles";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default class ZipEngine {
  private zip: JSZip | null = null;

  /**
   * Loads the embedded template for the given profile into JSZip.
   * Custom/uploaded ZIP templates are no longer supported — every wrapper is
   * generated from its embedded base64 template (see assets/templateData.ts).
   */
  async loadTemplate(profile: TemplateProfile): Promise<JSZip> {
    if (!profile.base64 || !profile.base64.trim()) {
      throw new Error(
        `No template has been configured yet for "${profile.label}". Add its base64 payload to assets/templateData.ts.`
      );
    }

    const bytes = base64ToBytes(profile.base64);
    this.zip = await JSZip.loadAsync(bytes);
    return this.zip;
  }

  getZip(): JSZip | null {
    return this.zip;
  }
}
