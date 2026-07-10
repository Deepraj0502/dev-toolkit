import { useMemo, useState } from "react";
import { ArrowRight, FileInput, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import type { AesMode, CurlHeader, CurlMode, CurlRequest, DigiSignMode, RsaMode } from "../types/CurlGenerator";
import { generateRequestReferenceNumber } from "../utils/referenceGenerator";

interface Props {
    request: CurlRequest;
    setRequest: (request: CurlRequest) => void;
    certificateText: string | null;
    setCertificateText: (text: string | null) => void;
    onGenerate: () => Promise<void>;
    loading: boolean;
}

const modeOptions: { label: string; value: CurlMode }[] = [
    { label: "GEN5", value: "GEN5" },
    { label: "GEN6", value: "GEN6" }
];

const aesOptions: { label: string; value: AesMode }[] = [
    { label: "AES-CBC", value: "AES-CBC" },
    { label: "AES-GCM", value: "AES-GCM" }
];

const rsaOptions: { label: string; value: RsaMode }[] = [
    { label: "RSA/ECB/OAEPPadding", value: "RSA-OAEP" }
];

const digiSignOptions: { label: string; value: DigiSignMode }[] = [
    { label: "SHA256withRSA", value: "RSASSA-PKCS1-V1_5" },
    { label: "RSA-PSS", value: "RSA-PSS" }
];

export default function GenerateCurlForm({ request, setRequest, certificateText, setCertificateText, onGenerate, loading }: Props) {
    const [certificateFile, setCertificateFile] = useState<File | null>(null);

    const certificateLabel = useMemo(
        () => certificateFile?.name ?? "Upload endpoint public certificate (.pem/.cer)",
        [certificateFile]
    );

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setCertificateFile(file);

        if (!file) {
            setCertificateText(null);
            return;
        }

        const text = await file.text();
        setCertificateText(text);
    };

    const update = (field: keyof CurlRequest, value: string) => {
        setRequest({ ...request, [field]: value });
    };

    const updateHeader = (index: number, field: keyof CurlHeader, value: string) => {
        const headers = request.headers.map((header, idx) => idx === index ? { ...header, [field]: value } : header);
        setRequest({ ...request, headers });
    };

    const addHeader = () => {
        setRequest({ ...request, headers: [...request.headers, { name: "", value: "" }] });
    };

    const removeHeader = (index: number) => {
        setRequest({ ...request, headers: request.headers.filter((_, idx) => idx !== index) });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-xl shadow-black/30">
                <div className="mb-5 flex items-center gap-2 text-slate-200 uppercase tracking-[0.2em] text-xs font-bold">
                    <ShieldCheck className="h-4 w-4 text-indigo-400" />
                    CURL Generator
                </div>

                <div className="grid gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2 text-sm text-slate-300">
                            Request Mode
                            <select
                                value={request.mode}
                                onChange={(event) => update("mode", event.target.value)}
                                className="rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 outline-none"
                            >
                                {modeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-2 text-sm text-slate-300">
                            Endpoint
                            <input
                                value={request.endpoint}
                                onChange={(event) => update("endpoint", event.target.value)}
                                placeholder="https://host:port/api/path"
                                className="rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 outline-none"
                            />
                        </label>
                    </div>

                    <div className="grid sm:grid-cols-1 gap-4">
                        <label className="flex flex-col gap-2 text-sm text-slate-300">
                            Request Reference Number

                            <div className="flex items-center gap-2">

                                <input
                                    readOnly
                                    value={request.requestReferenceNumber ?? ""}
                                    className="flex-1 rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 outline-none"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        update(
                                            "requestReferenceNumber",
                                            generateRequestReferenceNumber()
                                        )
                                    }
                                    className="rounded-xl bg-slate-800 p-3 hover:bg-slate-700 transition"
                                >
                                    <RefreshCw className="h-4 w-4 text-slate-300" />
                                </button>

                            </div>

                            <span className="text-xs text-slate-500">
                                Generated automatically.
                            </span>

                        </label>
                        <label className="flex flex-col gap-2 text-sm text-slate-300">
                            Public Certificate
                            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0f1424] p-3 text-sm text-slate-100">
                                <FileInput className="h-4 w-4 text-indigo-400" />
                                <span className="truncate">{certificateLabel}</span>
                                <input type="file" accept=".pem,.cer" onChange={handleFileChange} className="hidden" id="cert-upload" />
                                <label htmlFor="cert-upload" className="ml-auto cursor-pointer rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">
                                    Browse
                                </label>
                            </div>
                        </label>
                    </div>

                    <div className="grid gap-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <label className="flex flex-col gap-2 text-sm text-slate-300">
                                AES Algorithm
                                <select
                                    value={request.aesAlgo}
                                    onChange={(event) => update("aesAlgo", event.target.value)}
                                    className="rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 outline-none"
                                >
                                    {aesOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-2 text-sm text-slate-300">
                                RSA Algorithm
                                <select
                                    value={request.rsaAlgo}
                                    onChange={(event) => update("rsaAlgo", event.target.value)}
                                    className="rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 outline-none"
                                >
                                    {rsaOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label className="flex flex-col gap-2 text-sm text-slate-300">
                            Signature Algorithm
                            <select
                                value={request.digiSignAlgo}
                                onChange={(event) => update("digiSignAlgo", event.target.value)}
                                className="rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 outline-none"
                            >
                                {digiSignOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-[#12182e] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-slate-300 font-semibold">
                            <span>Headers</span>
                            <button
                                type="button"
                                onClick={addHeader}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add header
                            </button>
                        </div>
                        <div className="space-y-3">
                            {request.headers.map((header, index) => (
                                <div key={index} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <input
                                            value={header.name}
                                            onChange={(event) => updateHeader(index, "name", event.target.value)}
                                            placeholder="Header name"
                                            className="rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 outline-none"
                                        />
                                        <input
                                            value={header.value}
                                            onChange={(event) => updateHeader(index, "value", event.target.value)}
                                            placeholder="Header value"
                                            className="rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 outline-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeHeader(index)}
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <label className="flex flex-col gap-2 text-sm text-slate-300">
                        Request Payload
                        <textarea
                            value={request.requestPayload}
                            onChange={(event) => update("requestPayload", event.target.value)}
                            placeholder='{"REQUEST_REFERENCE_NUMBER":"...","REQUEST":"..."}'
                            rows={10}
                            className="rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-sm text-slate-100 outline-none resize-none"
                        />
                    </label>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onGenerate}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Generate CURL
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    {certificateText ? (
                        <p className="text-xs text-slate-500">Certificate loaded from: {certificateFile?.name ?? "uploaded file"}</p>
                    ) : (
                        <p className="text-xs text-slate-500">If you do not upload a certificate, a sample public key will be used.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
