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

import type { CurlRequest, CurlHeader, CurlMode } from "../types/CurlGenerator";

interface Props {
  request: CurlRequest;
  setRequest: (request: CurlRequest) => void;
  certificateText: string | null;
  setCertificateText: (text: string | null) => void;
  onGenerate: () => Promise<void>;
  loading: boolean;
}

const modeOptions = [
  {
    label: "GEN5",
    value: "GEN5",
  },
  {
    label: "GEN6",
    value: "GEN6",
  },
] satisfies {
  label: string;
  value: CurlMode;
}[];

// Headers the app manages internally and never exposes for editing/removal
// in the UI, even though they must always be present (and non-empty) in
// the final curl output.
const HIDDEN_HEADER_NAMES = ["AccessToken"];

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

  const update = <K extends keyof CurlRequest>(
    field: K,
    value: CurlRequest[K],
  ) => {
    setRequest({
      ...request,
      [field]: value,
    });
  };

  // const changeMode = (mode: CurlMode) => {
  //   setRequest({
  //     ...request,
  //     mode,
  //     aesAlgo: mode === "GEN6" ? "AES-GCM" : "AES-CBC",
  //     rsaAlgo: "RSA-OAEP",
  //     digiSignAlgo: "RSASSA-PKCS1-V1_5",
  //   });
  // };

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
    // AccessToken is a required header the app manages internally — hidden
    // from the UI, but must never be edited (e.g. renamed away or blanked)
    // through this path, even if a caller passes a stale/incorrect index.
    if (HIDDEN_HEADER_NAMES.includes(request.headers[index]?.name)) {
      return;
    }

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
    // Same guard as updateHeader — the hidden required header can't be
    // removed through this path.
    if (HIDDEN_HEADER_NAMES.includes(request.headers[index]?.name)) {
      return;
    }

    setRequest({
      ...request,
      headers: request.headers.filter((_, idx) => idx !== index),
    });
  };

  // Real array index is carried alongside each header *before* filtering,
  // so update/remove always act on the header's true position in
  // request.headers — filtering first and reusing the filtered map's index
  // (the original bug) silently mismatches once a hidden header isn't at
  // the start of the array or headers are added/removed around it.
  const visibleHeaders = request.headers
    .map((header, originalIndex) => ({ header, originalIndex }))
    .filter(({ header }) => !HIDDEN_HEADER_NAMES.includes(header.name));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl shadow-black/30">
        <div className="mb-5 flex items-center gap-2 uppercase tracking-[0.2em] text-xs font-bold text-black dark:!text-slate-200">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          CURL Generator
        </div>

        <div className="grid gap-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm text-black dark:!text-slate-300">
              Request Mode
              <select
                value={request.mode}
                onChange={(e) => {
                  // changeMode(e.target.value as CurlMode);
                  setRequest({
                    ...request,
                    mode: e.target.value as CurlMode,
                    keyBytes: e.target.value === "GEN5" ? 16 : 12,
                  });
                }}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white px-3.5 py-2.5"
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
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white px-3.5 py-2.5"
              >
                {request.mode == "GEN6" && (
                  <option key={12} value={12}>
                    12 Bytes
                  </option>
                )}

                <option key={16} value={16}>
                  16 Bytes
                </option>
              </select>
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
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white p-3">
              <FileInput className="h-4 w-4 text-indigo-400" />

              <span className="truncate">{certificateLabel}</span>

              <input
                id="cert-upload"
                type="file"
                accept=".cer,.pem"
                className="hidden"
                onChange={handleFileChange}
              />

              <label
                htmlFor="cert-upload"
                className="ml-auto cursor-pointer rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 ring-indigo-500 dark:text-white px-3 py-2 text-xs dark:hover:bg-slate-700"
              >
                Browse
              </label>
            </div>
          </label>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-black dark:!text-slate-400 mb-2">
                AES
              </p>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 text-black dark:!text-white px-4 py-3">
                {request.mode === "GEN6" ? "AES-GCM" : "AES-CBC"}
              </div>
            </div>

            <div>
              <p className="text-xs text-black dark:!text-slate-400 mb-2">
                RSA
              </p>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 text-black dark:!text-white px-4 py-3">
                RSA-OAEP
              </div>
            </div>

            <div>
              <p className="text-xs text-black dark:!text-slate-400 mb-2">
                Signature
              </p>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 text-black dark:!text-white px-4 py-3">
                SHA256withRSA
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 ring-indigo-500 dark:text-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-black dark:!text-slate-300">
                Headers
              </span>

              <button
                type="button"
                onClick={addHeader}
                className="inline-flex items-center gap-2 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 ring-indigo-500 text-black dark:text-white px-3 py-2 text-xs dark:hover:bg-slate-700 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-black dark:text-white" />
                Add Header
              </button>
            </div>

            <div className="space-y-3">
              {visibleHeaders.map(({ header, originalIndex }) => (
                <div
                  key={originalIndex}
                  className="grid gap-3 sm:grid-cols-[1fr_auto]"
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      value={header.name}
                      onChange={(e) =>
                        updateHeader(originalIndex, "name", e.target.value)
                      }
                      placeholder="Header Name"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 text-black dark:text-white px-3.5 py-2.5"
                    />

                    <input
                      value={header.value}
                      onChange={(e) =>
                        updateHeader(originalIndex, "value", e.target.value)
                      }
                      placeholder="Header Value"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 text-black dark:text-white px-3.5 py-2.5"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeHeader(originalIndex)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-600 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-black dark:!text-slate-300">
            <div className="flex items-center justify-between">
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
              rows={12}
              value={request.requestPayload}
              onChange={(e) => update("requestPayload", e.target.value)}
              spellCheck={false}
              placeholder={`{
  "SOURCE_ID":"SBI01",
  "CUSTOMER_ID":"1234567890"
}`}
              className="resize-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white px-4 py-3 font-mono text-sm text-black dark:!text-slate-100"
            />
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white p-4">
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-black dark:!text-slate-400">
                  Encryption
                </span>

                <p className="mt-1 font-medium text-emerald-400">
                  {request.mode === "GEN6"
                    ? "AES-GCM + RSA-OAEP"
                    : "AES-CBC + RSA-OAEP"}
                </p>
              </div>

              <div>
                <span className="text-black dark:!text-slate-400">
                  Digital Signature
                </span>

                <p className="mt-1 font-medium text-indigo-400">
                  SHA256withRSA
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
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

                const accessTokenHeader = request.headers.find(
                  (h) => h.name === "AccessToken",
                );

                if (!accessTokenHeader) {
                  alert(
                    "AccessToken header is missing from the request. This shouldn't happen — please reload the page.",
                  );

                  return;
                }

                await onGenerate();
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
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
