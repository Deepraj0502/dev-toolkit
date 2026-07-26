import JSZip from "jszip";
import { TEMPLATE_BYTES } from "../../../assets/template";

export default class ZipEngine {
  private zip: JSZip | null = null;

  /**
   * Loads the project template into JSZip.
   * @param customBlob Optional File/Blob from user upload. If null/undefined, loads the embedded fallback.
   */
  async loadTemplate(customBlob?: Blob | File | null): Promise<JSZip> {
    if (customBlob) {
      // 1. Load from User Uploaded ZIP File
      const arrayBuffer = await customBlob.arrayBuffer();
      this.zip = await JSZip.loadAsync(arrayBuffer);
    } else {
      // 2. Fallback to Embedded Generic Routing Template
      this.zip = await JSZip.loadAsync(TEMPLATE_BYTES);
    }
    
    return this.zip;
  }

  getZip(): JSZip | null {
    return this.zip;
  }
}