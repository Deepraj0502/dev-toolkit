import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { CheckCircle2, FileArchive, Rocket, Settings2, UploadCloud } from "lucide-react";
import FormField from "./FormField";
import SectionCard from "./SectionCard";
import type { WrapperRequest } from "../types/Generator";

interface Props {
  request: WrapperRequest;
  setRequest: Dispatch<SetStateAction<WrapperRequest>>;
  generate: () => void;
  loading: boolean;
}

export default function GeneratorForm({ request, setRequest, generate, loading }: Props) {
  const [templateFile, setTemplateFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(field: keyof WrapperRequest, value: string) {
    setRequest((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setTemplateFile(file ? file.name : null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* <SectionCard title="Template" icon={FileArchive}>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">Master Template (ZIP)</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-2.5 text-left text-sm text-slate-100 transition hover:border-slate-700"
          >
            <span className="flex items-center gap-2 truncate">
              <UploadCloud className="h-4 w-4 shrink-0 text-slate-500" />
              <span className={templateFile ? "truncate text-slate-100" : "truncate text-slate-600"}>
                {templateFile ?? "Choose a template archive..."}
              </span>
            </span>
            {templateFile ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : null}
          </button>
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleFileSelect} />
          {templateFile ? (
            <p className="text-xs text-slate-500">
              Using template: <span className="text-slate-400">{templateFile.replace(/\.zip$/i, "")}</span>
            </p>
          ) : null}
        </div>
      </SectionCard> */}

      <SectionCard title="Wrapper Information" icon={Settings2}>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="API Name (Service Name)"
              required
              placeholder="e.g. CustomerValidation"
              value={request.apiName}
              onChange={(event) => update("apiName", event.target.value)}
            />
            <FormField
              label="Version"
              required
              placeholder="1.0.0"
              value={request.version}
              onChange={(event) => update("version", event.target.value)}
            />
          </div>
          <FormField
            label="Swagger Title"
            required
            placeholder="e.g. Customer Validation API"
            value={request.swaggerTitle}
            onChange={(event) => update("swaggerTitle", event.target.value)}
          />
          <FormField
            label="Description"
            multiline
            placeholder="Describe your API"
            value={request.swaggerDescription}
            onChange={(event) => update("swaggerDescription", event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Base Path"
              required
              prefix="/"
              placeholder="customerValidation"
              value={request.basePath}
              onChange={(event) => update("basePath", event.target.value)}
            />
            <FormField
              label="Author"
              placeholder="Your name or team"
              value={request.author}
              onChange={(event) => update("author", event.target.value)}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Rocket className="h-4 w-4" />
            {loading ? "Generating wrapper..." : "Generate Wrapper"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
