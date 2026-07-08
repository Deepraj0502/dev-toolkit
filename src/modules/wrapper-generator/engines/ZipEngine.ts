import JSZip from "jszip";
import templateZip from "../../../assets/template/thirdPartyTestWrapper_expDS.zip?url";

export default class ZipEngine {
  private zip: JSZip | null = null;

  async loadTemplate(): Promise<JSZip> {
    const response = await fetch(templateZip);

    // if (!response.ok) {
    //   throw new Error(`Unable to load template from ${templatePath}.`);
    // }

    const buffer = await response.arrayBuffer();
    this.zip = await JSZip.loadAsync(buffer);
    return this.zip;
  }

  getZip(): JSZip | null {
    return this.zip;
  }
}
