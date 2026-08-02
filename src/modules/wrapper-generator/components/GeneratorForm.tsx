import { type Dispatch, type SetStateAction } from "react";
import { FileArchive, Rocket, Settings2 } from "lucide-react";
import FormField from "./FormField";
import SectionCard from "./SectionCard";
import type { ThirdPartyVariant, WrapperRequest } from "../types/Generator";

interface Props {
  request: WrapperRequest;
  setRequest: Dispatch<SetStateAction<WrapperRequest>>;
  variant: ThirdPartyVariant;
  onVariantChange: (variant: ThirdPartyVariant) => void;
  generate: () => void;
  loading: boolean;
}

const VARIANT_OPTIONS: { value: ThirdPartyVariant; label: string; template: string }[] = [
  { value: "standard", label: "Standard", template: "thirdPartyGenericRouting_expDS" },
  { value: "ccsid", label: "CCSID", template: "thirdPartyGenericRouting_CCSID_expDS" }
];

export default function GeneratorForm({
  request,
  setRequest,
  variant,
  onVariantChange,
  generate,
  loading
}: Props) {
  function update(field: keyof WrapperRequest, value: string) {
    setRequest((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Template" icon={FileArchive}>
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-slate-300">Third-Party Wrapper Template</span>

          <div className="grid grid-cols-2 gap-2.5">
            {VARIANT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={loading}
                onClick={() => onVariantChange(option.value)}
                className={`rounded-xl border px-3.5 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  variant === option.value
                    ? "border-indigo-500 bg-indigo-500/10 text-slate-100"
                    : "border-slate-800 bg-[#0f1424] text-slate-400 hover:border-slate-700"
                }`}
              >
                <p className="font-medium">{option.label}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{option.template}</p>
              </button>
            ))}
          </div>

          <p className="px-1 pt-0.5 text-xs text-slate-500">
            Uses the embedded template — no zip upload needed.
          </p>
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
