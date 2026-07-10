import { useMemo, useState } from "react";
import CurlResultPanel from "./components/CurlResultPanel";
import GenerateCurlForm from "./components/GenerateCurlForm";
import CurlGeneratorEngine from "./engines/CurlGenerator";
import type { CurlRequest, CurlResult } from "./types/CurlGenerator";
import { generateRequestReferenceNumber } from "./utils/referenceGenerator";

const engine = new CurlGeneratorEngine();

export default function CurlGenerator() {
  const [request, setRequest] = useState<CurlRequest>({
    mode: "GEN5",
    endpoint: "",
    requestReferenceNumber: generateRequestReferenceNumber(),
    requestPayload: "{}",
    headers: [
      { name: "Content-Type", value: "application/json" },
      { name: "AccessToken", value: "" }
    ],
    aesAlgo: "AES-CBC",
    rsaAlgo: "RSA-OAEP",
    digiSignAlgo: "RSASSA-PKCS1-V1_5"
  });
  const [result, setResult] = useState<CurlResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificateText, setCertificateText] = useState<string | null>(null);

  const title = useMemo(() => {
    return request.mode === "GEN6" ? "GEN6 CURL Generator" : "GEN5 CURL Generator";
  }, [request.mode]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const output = await engine.generate(request, { certificateText });
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-slate-400 mt-2">Generate encrypted IBM EIS CURL requests for GEN5 and GEN6.</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-700 bg-red-950/80 p-4 text-red-200">{error}</div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          <GenerateCurlForm
            request={request}
            setRequest={setRequest}
            certificateText={certificateText}
            setCertificateText={setCertificateText}
            onGenerate={generate}
            loading={loading}
          />
          <CurlResultPanel result={result} />
        </div>
      </div>
    </div>
  );
}
