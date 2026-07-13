import type { GeneratorEngine } from "../../common/GeneratorEngine";
import type { CurlRequest, CurlResult } from "../types/CurlGenerator";
import {
  aesEncryptCBC,
  aesEncryptGCM,
  normalizeJson,
  rsaEncrypt,
  signData,
} from "../utils/crypto";

export default class CurlGenerator implements GeneratorEngine<
  CurlRequest,
  CurlResult
> {
  async generate(
    request: CurlRequest,
    options?: Record<string, unknown>,
  ): Promise<CurlResult> {
    var requestValue = "";
    const certificate = String(options?.certificateText ?? "");

    if (!certificate.trim()) {
      throw new Error("Certificate not selected.");
    }

    /*
     * STEP 1
     * Serialize JSON exactly like Java
     */

    const payload = normalizeJson(request.requestPayload);

    /*
     * STEP 2
     * REQUEST
     * AES/GCM Encrypt Payload
     */
    if (request.aesAlgo === "AES-GCM") {
      requestValue = await aesEncryptGCM(payload);
    } else {
      requestValue = await aesEncryptCBC(payload);
    }

    /*
     * STEP 3
     * ACCESS TOKEN
     * RSA Encrypt Static AES Key
     */

    const accessToken = await rsaEncrypt(
      certificate,
      "11111111111111111111111111111111",
    );

    /*
     * STEP 4
     * Digital Signature
     */

    const digiSign = await signData(payload);

    /*
     * STEP 5
     */

    const body = JSON.stringify({
      REQUEST_REFERENCE_NUMBER: request.requestReferenceNumber,

      REQUEST: requestValue,

      DIGI_SIGN: digiSign,
    });

    /*
     * STEP 6
     */

    const headers = request.headers
      .filter((h) => h.name.trim())
      .map((h) => {
        let value = h.value;

        if (h.name.toLowerCase() === "accesstoken") {
          value = accessToken;
        }

        return `-H "${h.name}: ${value}"`;
      })
      .join(" ");

    /*
     * STEP 7
     */

    const curl = `curl -k -X POST "${request.endpoint}" \
${headers} \
-d '${body}'`;

    return {
      curlCommand: curl,

      accessToken,

      requestValue,

      digiSign,
    };
  }
}
