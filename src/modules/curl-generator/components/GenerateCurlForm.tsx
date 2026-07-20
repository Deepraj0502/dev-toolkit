import { useMemo, useState } from "react";
import {
  ArrowRight,
  FileInput,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import { generateRequestReferenceNumber } from "../utils/referenceGenerator";
import StructureEditor from "./StructureEditor";

import type { CurlRequest, CurlHeader, CurlMode } from "../types/CurlGenerator";
import {
  AES_MODE_OPTIONS,
  DIGI_SIGN_MODE_OPTIONS,
  getAlgorithmsForMode,
  RSA_MODE_OPTIONS,
} from "../types/CurlGenerator";

interface Props {
  request: CurlRequest;
  setRequest: (request: CurlRequest) => void;
  certificateText: string | null;
  setCertificateText: (text: string | null) => void;
  onGenerate: () => Promise<void>;
  loading: boolean;
}

const modeOptions = [
  { label: "GEN6", value: "GEN6" },
  { label: "GEN5", value: "GEN5" },
  { label: "Custom", value: "CUSTOM" },
] satisfies {
  label: string;
  value: CurlMode;
}[];

export default function GenerateCurlForm({
  request,
  setRequest,
  certificateText,
  setCertificateText,
  onGenerate,
  loading,
}: Props) {
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  const certificateLabel = useMemo(() => {
    return certificateFile?.name ?? "Upload Endpoint Certificate (.cer/.pem)";
  }, [certificateFile]);

  const activeAlgorithms =
    request.mode === "CUSTOM"
      ? {
          aesAlgo: request.aesAlgo,
          rsaAlgo: request.rsaAlgo,
          digiSignAlgo: request.digiSignAlgo,
          keyBytes: request.keyBytes,
        }
      : {
          ...getAlgorithmsForMode(request.mode),
          keyBytes: request.mode === "GEN5" ? 16 : request.keyBytes,
        };

  const keyBytesEditable =
    request.mode === "GEN6" || request.mode === "CUSTOM";

  const update = <K extends keyof CurlRequest>(
    field: K,
    value: CurlRequest[K],
  ) => {
    setRequest({
      ...request,
      [field]: value,
    });
  };

  const changeMode = (mode: CurlMode) => {
    if (mode === "CUSTOM") {
      setRequest({
        ...request,
        mode,
      });
      return;
    }

    const algorithms = getAlgorithmsForMode(mode);
    const keyBytes =
      mode === "GEN5"
        ? 16
        : request.mode === "GEN6"
          ? request.keyBytes
          : 12;

    setRequest({
      ...request,
      mode,
      aesAlgo: algorithms.aesAlgo,
      rsaAlgo: algorithms.rsaAlgo,
      digiSignAlgo: algorithms.digiSignAlgo,
      keyBytes,
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setCertificateFile(file);

    if (!file) {
      setCertificateText(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setCertificateText(reader.result as string);
    };

    reader.onerror = () => {
      setCertificateText(null);
    };

    reader.readAsText(file);
  };

  const updateHeader = (
    index: number,
    field: keyof CurlHeader,
    value: string,
  ) => {
    const headers = request.headers.map((header, idx) =>
      idx === index
        ? {
            ...header,
            [field]: value,
          }
        : header,
    );

    setRequest({
      ...request,
      headers,
    });
  };

  const addHeader = () => {
    setRequest({
      ...request,
      headers: [
        ...request.headers,
        {
          name: "",
          value: "",
        },
      ],
    });
  };

  const removeHeader = (index: number) => {
    setRequest({
      ...request,
      headers: request.headers.filter((_, idx) => idx !== index),
    });
  };

  const validateStructure = (): string | null => {
    if (request.structureMode !== "CUSTOM" || !request.structure?.length) {
      return null;
    }

    const enabledFields = request.structure.filter((field) => field.enabled);

    if (enabledFields.length === 0) {
      return "Enable at least one field in the custom request layout.";
    }

    const missingName = enabledFields.find((field) => !field.name.trim());
    if (missingName) {
      return "Every enabled custom layout field needs a name.";
    }

    const missingStatic = enabledFields.find(
      (field) => field.source === "static" && !field.staticValue?.trim(),
    );
    if (missingStatic) {
      return "Static layout fields must include a value.";
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="rounded-2xl border border-slate-200 p-4 shadow-xl shadow-black/30 dark:border-slate-800 sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-center gap-2 uppercase tracking-[0.2em] text-xs font-bold text-black dark:!text-slate-200">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          CURL Generator
        </div>

        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-black dark:!text-slate-300">
              Request Mode
              <select
                value={request.mode}
                onChange={(e) => changeMode(e.target.value as CurlMode)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                {modeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-black dark:!text-slate-300">
              Key Bytes
              <select
                value={request.keyBytes}
                onChange={(e) =>
                  setRequest({
                    ...request,
                    keyBytes: parseInt(e.target.value) as 12 | 16,
                  })
                }
                disabled={!keyBytesEditable}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none ring-indigo-500 focus:ring-2 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                {(request.mode === "GEN6" || request.mode === "CUSTOM") && (
                  <option value={12}>12 Bytes</option>
                )}
                <option value={16}>16 Bytes</option>
              </select>
              {request.mode === "GEN5" ? (
                <span className="text-xs text-black dark:!text-slate-500">
                  Fixed at 16 bytes for GEN5.
                </span>
              ) : request.mode === "GEN6" ? (
                <span className="text-xs text-black dark:!text-slate-500">
                  Choose 12 or 16 bytes for the AES IV/nonce.
                </span>
              ) : null}
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm text-black dark:!text-slate-300">
            Endpoint
            <input
              value={request.endpoint}
              onChange={(e) => update("endpoint", e.target.value)}
              placeholder="https://host/api"
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white px-3.5 py-2.5 text-black dark:!text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-black dark:!text-slate-300">
            Request Reference Number
            <div className="flex gap-2">
              <input
                readOnly
                value={request.requestReferenceNumber}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white px-3.5 py-2.5"
              />

              <button
                type="button"
                onClick={() =>
                  update(
                    "requestReferenceNumber",
                    generateRequestReferenceNumber(),
                  )
                }
                className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white p-3 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 text-black dark:!text-white" />
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm text-black dark:!text-slate-300">
            Public Certificate
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-indigo-500 focus-within:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <FileInput className="h-4 w-4 shrink-0 text-indigo-400" />
                <span className="truncate">{certificateLabel}</span>
              </div>

              <input
                id="cert-upload"
                type="file"
                accept=".cer,.pem"
                className="hidden"
                onChange={handleFileChange}
              />

              <label
                htmlFor="cert-upload"
                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs outline-none ring-indigo-500 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-700 sm:ml-auto"
              >
                Browse
              </label>
            </div>
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-xs text-black dark:!text-slate-400">
              AES
              {request.mode === "CUSTOM" ? (
                <select
                  value={request.aesAlgo}
                  onChange={(e) =>
                    update("aesAlgo", e.target.value as CurlRequest["aesAlgo"])
                  }
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-black dark:!text-white"
                >
                  {AES_MODE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-black dark:!text-white">
                  {activeAlgorithms.aesAlgo}
                </div>
              )}
            </label>

            <label className="flex flex-col gap-2 text-xs text-black dark:!text-slate-400">
              RSA
              {request.mode === "CUSTOM" ? (
                <select
                  value={request.rsaAlgo}
                  onChange={(e) =>
                    update("rsaAlgo", e.target.value as CurlRequest["rsaAlgo"])
                  }
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-black dark:!text-white"
                >
                  {RSA_MODE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-black dark:!text-white">
                  {activeAlgorithms.rsaAlgo}
                </div>
              )}
            </label>

            <label className="flex flex-col gap-2 text-xs text-black dark:!text-slate-400">
              Signature
              {request.mode === "CUSTOM" ? (
                <select
                  value={request.digiSignAlgo}
                  onChange={(e) =>
                    update(
                      "digiSignAlgo",
                      e.target.value as CurlRequest["digiSignAlgo"],
                    )
                  }
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-black dark:!text-white"
                >
                  {DIGI_SIGN_MODE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-black dark:!text-white">
                  {activeAlgorithms.digiSignAlgo}
                </div>
              )}
            </label>
          </div>

          <StructureEditor request={request} setRequest={setRequest} />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none ring-indigo-500 focus-within:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:rounded-3xl sm:p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className="font-semibold text-black dark:!text-slate-300">
                  Static Headers
                </span>
                <p className="mt-1 text-xs text-black dark:!text-slate-400">
                  Always included in the curl command. Computed fields like
                  AccessToken are configured in Request Layout above.
                </p>
              </div>

              <button
                type="button"
                onClick={addHeader}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-black outline-none ring-indigo-500 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-700 sm:w-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Header
              </button>
            </div>

            <div className="space-y-3">
              {request.headers.map((header, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 sm:flex-row sm:items-start"
                >
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      value={header.name}
                      onChange={(e) =>
                        updateHeader(index, "name", e.target.value)
                      }
                      placeholder="Header Name"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 text-black dark:text-white px-3.5 py-2.5"
                    />

                    <input
                      value={header.value}
                      onChange={(e) =>
                        updateHeader(index, "value", e.target.value)
                      }
                      placeholder="Header Value"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 text-black dark:text-white px-3.5 py-2.5"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeHeader(index)}
                    className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-full bg-red-600 dark:bg-slate-800 dark:hover:bg-slate-700 sm:w-11"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-black dark:!text-slate-300">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="request-payload">Request Payload</label>

              <button
                type="button"
                onClick={() => {
                  try {
                    const formatted = JSON.stringify(
                      JSON.parse(request.requestPayload),
                      null,
                      2,
                    );

                    update("requestPayload", formatted);
                  } catch {
                    alert(
                      "Request Payload is not valid JSON — fix the syntax before beautifying.",
                    );
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 ring-indigo-500 text-black dark:text-white px-3 py-1.5 text-xs text-black dark:!text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Beautify
              </button>
            </div>

            <textarea
              id="request-payload"
              rows={8}
              value={request.requestPayload}
              onChange={(e) => update("requestPayload", e.target.value)}
              spellCheck={false}
              placeholder={`{
  "SOURCE_ID":"SBI01",
  "CUSTOMER_ID":"1234567890"
}`}
              className="min-h-[180px] resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-black outline-none ring-indigo-500 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:!text-slate-100 sm:min-h-[240px]"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none ring-indigo-500 focus-within:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-black dark:!text-slate-400">
                  Encryption
                </span>

                <p className="mt-1 break-words font-medium text-emerald-400">
                  {activeAlgorithms.aesAlgo} + {activeAlgorithms.rsaAlgo}
                </p>
              </div>

              <div>
                <span className="text-black dark:!text-slate-400">
                  Digital Signature
                </span>

                <p className="mt-1 break-words font-medium text-indigo-400">
                  {activeAlgorithms.digiSignAlgo}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-black dark:!text-slate-400">
                  Key Bytes
                </span>
                <p className="mt-1 font-medium text-slate-300">
                  {activeAlgorithms.keyBytes} bytes
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-stretch sm:justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                try {
                  JSON.parse(request.requestPayload);
                } catch {
                  alert("Request Payload is not valid JSON.");
                  return;
                }

                const structureError = validateStructure();
                if (structureError) {
                  alert(structureError);
                  return;
                }

                await onGenerate();
              }}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Generating..." : "Generate CURL"}

              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white p-3 text-xs text-black dark:!text-slate-400">
            {certificateText
              ? `Loaded certificate : ${certificateFile?.name}`
              : "No certificate uploaded. Sample public certificate will be used."}
          </div>
        </div>
      </div>
    </div>
  );
}
