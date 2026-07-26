import { type ChangeEvent, type Dispatch, type SetStateAction, useRef } from "react";
import { CheckCircle2, FileArchive, Rocket, Settings2, UploadCloud } from "lucide-react";
import FormField from "./FormField";
import SectionCard from "./SectionCard";
import type { WrapperRequest } from "../types/Generator";

interface Props {
  request: WrapperRequest;
  setRequest: Dispatch<SetStateAction<WrapperRequest>>;
  generate: () => void;
  loading: boolean;
  customTemplate: File | null;
  onTemplateChange: (file: File | null) => void;
}

export default function GeneratorForm({
  request,
  setRequest,
  generate,
  loading,
  customTemplate,
  onTemplateChange
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(field: keyof WrapperRequest, value: string) {
    setRequest((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    onTemplateChange(file);
  }

  function handleResetTemplate() {
    onTemplateChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Template Configuration" icon={FileArchive}>
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-slate-300">Master Template (ZIP Archive)</span>
          
          <button
            type="button"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#0f1424] px-3.5 py-3 text-left text-sm text-slate-100 transition hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center gap-2.5 truncate">
              <UploadCloud className="h-4 w-4 shrink-0 text-indigo-400" />
              <span className={customTemplate ? "truncate font-medium text-slate-100" : "truncate text-slate-500"}>
                {customTemplate ? customTemplate.name : "Upload custom ZIP archive..."}
              </span>
            </span>
            {customTemplate ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : null}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileSelect}
            disabled={loading}
          />

          <div className="flex items-center justify-between px-1 pt-0.5">
            {customTemplate ? (
              <p className="text-xs text-slate-400">
                Active: <span className="font-semibold text-indigo-400">{customTemplate.name.replace(/\.zip$/i, "")}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Default: <span className="font-mono text-slate-400">thirdPartyGenericRouting_expDS</span>
              </p>
            )}

            {customTemplate && !loading && (
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-xs font-medium text-rose-400 underline transition hover:text-rose-300"
              >
                Reset to Default
              </button>
            )}
          </div>
        </div>
      </SectionCard>

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