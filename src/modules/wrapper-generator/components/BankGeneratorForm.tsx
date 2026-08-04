import { Banknote, Rocket } from "lucide-react";
import FormField from "./FormField";
import SectionCard from "./SectionCard";
import SwaggerInputPanel from "./SwaggerInputPanel";
import type { BankVariant } from "../types/Generator";

interface Props {
  apiName: string;
  onApiNameChange: (value: string) => void;
  variant: BankVariant;
  onVariantChange: (variant: BankVariant) => void;
  swaggerText: string;
  onSwaggerTextChange: (text: string) => void;
  swaggerFileName: string | null;
  onSwaggerFileNameChange: (name: string | null) => void;
  generate: () => void;
  loading: boolean;
}

const BANK_VARIANT_OPTIONS: { value: BankVariant; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "th", label: "TH" },
  { value: "bth", label: "BTH" }
];

export default function BankGeneratorForm({
  apiName,
  onApiNameChange,
  variant,
  onVariantChange,
  swaggerText,
  onSwaggerTextChange,
  swaggerFileName,
  onSwaggerFileNameChange,
  generate,
  loading
}: Props) {
  const canGenerate = apiName.trim().length > 0 && swaggerText.trim().length > 0 && !loading;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Bank Wrapper" icon={Banknote}>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium text-slate-300">Version</span>
            <div className="grid grid-cols-3 gap-2.5">
              {BANK_VARIANT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={loading}
                  onClick={() => onVariantChange(option.value)}
                  className={`rounded-xl border px-3.5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    variant === option.value
                      ? "border-indigo-500 bg-indigo-500/10 text-slate-100"
                      : "border-slate-800 bg-[#0f1424] text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="px-1 text-xs text-slate-500">
              Normal / TH / BTH only differ in the embedded IBM ACE validation file — everything
              else is renamed the same way as the third-party wrapper.
            </p>
          </div>

          <FormField
            label="API Name (Service Name)"
            required
            placeholder="e.g. TransferClosureDepositAmend"
            value={apiName}
            onChange={(event) => onApiNameChange(event.target.value)}
          />

          <SwaggerInputPanel
            value={swaggerText}
            onValueChange={onSwaggerTextChange}
            fileName={swaggerFileName}
            onFileNameChange={onSwaggerFileNameChange}
            disabled={loading}
          />

          <p className="px-1 text-xs text-slate-500">
            Bank wrappers don't auto-fill swagger fields from form inputs — drop a file or paste
            the swagger content directly above, and it's inserted as-is, then everything is
            renamed to match the API name.
          </p>

          <button
            onClick={generate}
            disabled={!canGenerate}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Rocket className="h-4 w-4" />
            {loading ? "Generating wrapper..." : "Generate Bank Wrapper"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
