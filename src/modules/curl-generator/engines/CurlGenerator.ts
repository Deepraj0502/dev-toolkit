import type { GeneratorEngine } from "../../common/GeneratorEngine";
import type {
  CurlRequest,
  CurlResult,
  FieldSource,
  StructureField,
} from "../types/CurlGenerator";
import {
  DEFAULT_STRUCTURE,
  getAlgorithmsForMode,
} from "../types/CurlGenerator";
import {
  aesEncrypt,
  normalizeJson,
  rsaEncryptWithMode,
  signDataWithMode,
  STATIC_AES_KEY,
} from "../utils/crypto";

function resolveStructure(request: CurlRequest): StructureField[] {
  if (request.structureMode === "CUSTOM" && request.structure?.length) {
    return request.structure;
  }

  return DEFAULT_STRUCTURE;
}

function resolveFieldValue(
  field: StructureField,
  values: Record<FieldSource, string>,
): string {
  if (field.source === "static") {
    return field.staticValue ?? "";
  }

  return values[field.source] ?? "";
}

export default class CurlGenerator implements GeneratorEngine<
  CurlRequest,
  CurlResult
> {
  async generate(
    request: CurlRequest,
    options?: Record<string, unknown>,
  ): Promise<CurlResult> {
    const certificate = String(options?.certificateText ?? "");

    if (!certificate.trim()) {
      throw new Error("Certificate not selected.");
    }

    const structure = resolveStructure(request);
    const enabledFields = structure.filter(
      (field) => field.enabled && field.name.trim(),
    );

    if (enabledFields.length === 0) {
      throw new Error("At least one enabled field is required in the request layout.");
    }

    const neededSources = new Set(
      enabledFields
        .map((field) => field.source)
        .filter((source): source is Exclude<FieldSource, "static"> => source !== "static"),
    );

    const algorithms =
      request.mode === "CUSTOM"
        ? {
            aesAlgo: request.aesAlgo,
            rsaAlgo: request.rsaAlgo,
            digiSignAlgo: request.digiSignAlgo,
            keyBytes: request.keyBytes,
          }
        : {
            ...getAlgorithmsForMode(request.mode),
            keyBytes:
              request.mode === "GEN5" ? 16 : request.keyBytes,
          };

    const payload = normalizeJson(request.requestPayload);

    let requestValue = "";
    if (neededSources.has("requestValue")) {
      requestValue = await aesEncrypt(
        algorithms.aesAlgo,
        payload,
        algorithms.keyBytes,
      );
    }

    let accessToken = "";
    if (neededSources.has("accessToken")) {
      accessToken = await rsaEncryptWithMode(
        certificate,
        STATIC_AES_KEY,
        algorithms.rsaAlgo,
      );
    }

    let digiSign = "";
    if (neededSources.has("digiSign")) {
      digiSign = await signDataWithMode(payload, algorithms.digiSignAlgo);
    }

    const computedValues: Record<FieldSource, string> = {
      accessToken,
      digiSign,
      requestValue,
      requestReferenceNumber: request.requestReferenceNumber,
      static: "",
    };

    const bodyFields: Record<string, string> = {};
    const structureHeaders: string[] = [];

    for (const field of enabledFields) {
      const value = resolveFieldValue(field, computedValues);

      if (field.location === "header") {
        structureHeaders.push(`-H "${field.name}: ${value}"`);
      } else {
        bodyFields[field.name] = value;
      }
    }

    const staticHeaders = request.headers
      .filter((header) => header.name.trim())
      .map((header) => `-H "${header.name}: ${header.value}"`);

    const headers = [...staticHeaders, ...structureHeaders].join(" ");
    const body = JSON.stringify(bodyFields);

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
