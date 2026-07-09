import JSZip from "jszip";
import { TEMPLATE_BYTES } from "../../../assets/template";

export default class ZipEngine {
  private zip: JSZip | null = null;

  async loadTemplate(): Promise<JSZip> {
    this.zip = await JSZip.loadAsync(TEMPLATE_BYTES);
    return this.zip;
  }

  getZip(): JSZip | null {
    return this.zip;
  }
}
