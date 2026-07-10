import type { CurlRequest, CurlResult } from "../types/CurlGenerator";
import type { GeneratorEngine } from "../../common/GeneratorEngine";
import { KEYMAPPER_GCM_PROPERTIES, KEYMAPPER_PROPERTIES, PLACEHOLDER_PRIVATE_KEY_PEM } from "../config/constants";
import { aesDecrypt, normalizeJson, normalizeForSign, parseProperties, rsaEncryptBase64, signSha256Rsa } from "../../../utils/crypto";
import { loadTextAsset } from "../../../utils/assets";

export default class CurlGenerator implements GeneratorEngine<CurlRequest, CurlResult> {
  async generate(request: CurlRequest, options?: Record<string, unknown>): Promise<CurlResult> {
    const certificateText = options?.certificateText == null ? null : String(options.certificateText);

    try {
      if (request.rsaAlgo !== "RSA-OAEP") {
        throw new Error("RSAES-PKCS1-V1_5 is not supported by the browser Web Crypto API for encryption. Use RSA-OAEP.");
      }

      const publicKeyPem = certificateText?.trim() || (await loadTextAsset("/curl-assets/sample-public-key.pem"));
      const filePath = request.mode === "GEN6" ? KEYMAPPER_GCM_PROPERTIES : KEYMAPPER_PROPERTIES;
      const propertiesText = await loadTextAsset(filePath);
      const properties = parseProperties(propertiesText);
      const aesk = properties.aesk ?? "";
      const enpass = properties.enpass ?? "";

      if (!aesk || !enpass) {
        throw new Error("Unable to load keymapper properties.");
      }

      const jkspwd = await aesDecrypt(request.aesAlgo, enpass, aesk);
      if (!jkspwd || jkspwd.startsWith("X-JavaError")) {
        throw new Error("Unable to decrypt keystore password.");
      }

      const privateKeyPem = await loadTextAsset(PLACEHOLDER_PRIVATE_KEY_PEM);
      const normalizedPayload = normalizeJson(request.requestPayload);
      const requestValue = await rsaEncryptBase64(publicKeyPem, normalizedPayload, request.rsaAlgo);
      const tokenSource = request.requestReferenceNumber || normalizedPayload;
      const accessToken = await rsaEncryptBase64(publicKeyPem, tokenSource, request.rsaAlgo);
      const signatureBody = normalizeForSign(JSON.stringify({
        REQUEST_REFERENCE_NUMBER: request.requestReferenceNumber,
        REQUEST: requestValue
      }));
      const digiSign = await signSha256Rsa(privateKeyPem, signatureBody, request.digiSignAlgo);

      const body = JSON.stringify({
        REQUEST_REFERENCE_NUMBER: request.requestReferenceNumber,
        REQUEST: requestValue,
        DIGI_SIGN: digiSign
      });

      const headerString = request.headers
        .filter((header) => header.name.trim())
        .map((header) => `-H '${header.name.trim()}:${header.value.replace(/'/g, "\\'")}'`)
        .join(" ");

      const curlCommand = `curl -kX POST ${request.endpoint} ${headerString} -d '${body.replace(/'/g, "\\'")}'`;

      return {
        curlCommand,
        accessToken,
        requestValue,
        digiSign
      };
    } catch (error) {
      console.error("CurlGenerator.generate error:", error);
      if (error instanceof DOMException) {
        console.error("DOMException details:", {
          name: error.name,
          message: error.message,
          code: error.code
        });
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
