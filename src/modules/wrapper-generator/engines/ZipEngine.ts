import JSZip from "jszip";
import templateZip from "../../../assets/template/thirdPartyTestWrapper_expDS.zip?url";

export default class ZipEngine {
  private zip: JSZip | null = null;

  async loadTemplate(): Promise<JSZip> {
    const response = await fetch(templateZip);

    console.log("URL:", templateZip);
    console.log("Status:", response.status);

    const firstBytes = await response.clone().text();
    console.log("TEXT:", firstBytes.substring(0,200));
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
