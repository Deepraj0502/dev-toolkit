import JSZip from "jszip";
// import { TEMPLATE_CONFIG } from "../config/templateConfig";
import templateZip from "../../assets/template/thirdPartyTestWrapper_expDS.zip";

export default class ZipEngine {
  private zip: JSZip | null = null;

  async loadTemplate(): Promise<JSZip> {
    // const templatePath = `/templates/${TEMPLATE_CONFIG.templateProject}.zip`;
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
