import { useState } from "react";
import { Plus, Trash2, FileDown, ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import SolutionDocPreview from "./SolutionDocPreview";
import { generateSolutionDocx } from "../utils/generateSolutionDocx";
import {
  DEFAULT_SOLUTION_DOC_FORM,
  WIZARD_STEPS,
  type SolutionDocFormState,
  type ApiDocumentRow,
  type ReferenceRow,
} from "../types/solutionDoc";

const inputClass =
  "w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SolutionDocumentWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SolutionDocFormState>(DEFAULT_SOLUTION_DOC_FORM);
  const [generating, setGenerating] = useState(false);

  const set = <K extends keyof SolutionDocFormState>(key: K, value: SolutionDocFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addApiDocument = () =>
    setForm((prev) => ({
      ...prev,
      apiDocuments: [...prev.apiDocuments, { id: newId(), description: "" } as ApiDocumentRow],
    }));

  const updateApiDocument = (id: string, patch: Partial<ApiDocumentRow>) =>
    setForm((prev) => ({
      ...prev,
      apiDocuments: prev.apiDocuments.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));

  const removeApiDocument = (id: string) =>
    setForm((prev) => ({ ...prev, apiDocuments: prev.apiDocuments.filter((d) => d.id !== id) }));

  const addReference = () =>
    setForm((prev) => ({
      ...prev,
      references: [...prev.references, { id: newId(), description: "" } as ReferenceRow],
    }));

  const updateReference = (id: string, patch: Partial<ReferenceRow>) =>
    setForm((prev) => ({
      ...prev,
      references: prev.references.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));

  const removeReference = (id: string) =>
    setForm((prev) => ({ ...prev, references: prev.references.filter((r) => r.id !== id) }));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateSolutionDocx(form);
    } finally {
      setGenerating(false);
    }
  };

  const isLastStep = step === WIZARD_STEPS.length - 1;

  return (
    <div className="min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] flex flex-col gap-4 sm:gap-6 font-sans">
      <div className="flex-none flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:opacity-75 transition-all"
        >
          <LayoutDashboard size={20} /> Back to Dashboard
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex-none flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {WIZARD_STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              i === step
                ? "bg-indigo-600 text-white shadow-lg"
                : i < step
                  ? "text-indigo-500 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-hidden min-h-0">
        {/* -------------------- Form column -------------------- */}
        <div className="flex-1 lg:max-w-lg flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            {step === 0 && (
              <>
                <Field label="CR Number">
                  <input
                    value={form.crNumber}
                    className={inputClass}
                    onChange={(e) => set("crNumber", e.target.value)}
                    placeholder="e.g. 135"
                  />
                </Field>
                <Field label="Functionality">
                  <input
                    value={form.functionality}
                    className={inputClass}
                    onChange={(e) => set("functionality", e.target.value)}
                    placeholder="e.g. DM2025092662 (PM2025126022) - SBI life Integration CRM for complaints"
                  />
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    value={form.date}
                    className={inputClass}
                    onChange={(e) => set("date", e.target.value)}
                  />
                </Field>
                <Field label="TCS Associate Name">
                  <input
                    value={form.tcsAssociateName}
                    className={inputClass}
                    onChange={(e) => set("tcsAssociateName", e.target.value)}
                  />
                </Field>
                <Field label="SBI Official Name">
                  <input
                    value={form.sbiOfficialName}
                    className={inputClass}
                    onChange={(e) => set("sbiOfficialName", e.target.value)}
                  />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="CR Details (Description)">
                  <textarea
                    value={form.crDescription}
                    className={`${inputClass} min-h-[100px]`}
                    onChange={(e) => set("crDescription", e.target.value)}
                    placeholder="EIS wrapper API to consume new services from ..."
                  />
                </Field>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Scope of Change</h4>

                  <Field label="API Name">
                    <input
                      value={form.apiName}
                      className={inputClass}
                      onChange={(e) => set("apiName", e.target.value)}
                      placeholder="e.g. thirdPartyGenericRouting_expDS"
                    />
                  </Field>
                  <label className="block text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-1.5 mt-2">
                    Attached Document (PDF / DOCX / JSON)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.json"
                    className="w-full text-xs text-slate-500"
                    onChange={(e) => set("apiNameFileName", e.target.files?.[0]?.name)}
                  />

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                      API Documents (optional)
                    </span>
                    <button
                      onClick={addApiDocument}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-75"
                    >
                      <Plus size={14} /> Add row
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    {form.apiDocuments.map((d) => (
                      <div key={d.id} className="flex items-center gap-2">
                        <input
                          value={d.description}
                          placeholder="Description"
                          className={`${inputClass} flex-1`}
                          onChange={(e) => updateApiDocument(d.id, { description: e.target.value })}
                        />
                        <input
                          type="file"
                          accept=".pdf,.docx,.json"
                          className="text-xs text-slate-500 w-32"
                          onChange={(e) => updateApiDocument(d.id, { fileName: e.target.files?.[0]?.name })}
                        />
                        <button onClick={() => removeApiDocument(d.id)} className="text-red-500 hover:opacity-75">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500">
                    <span className="font-semibold">Encryption Document</span> — static, reference already provided
                    (For Consuming Channel within SBI). No input needed.
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  <Field label="Existing Functionality">
                    <div className="flex gap-2">
                      {(["New", "Existing"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => set("existingFunctionalityStatus", opt)}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                            form.existingFunctionalityStatus === opt
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {form.existingFunctionalityStatus === "Existing" && (
                    <textarea
                      value={form.existingFunctionalityDetails}
                      className={`${inputClass} mt-2 min-h-[70px]`}
                      onChange={(e) => set("existingFunctionalityDetails", e.target.value)}
                      placeholder="Describe what's changing in the existing functionality..."
                    />
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-xs text-slate-500 leading-5">
                  The Solution Details boilerplate text is fixed and shown in the preview. Enter the
                  destination / type / subtype combinations for this CR's APIs below, freeform (matches the
                  "Sample Example" blocks in the reference document).
                </p>
                <Field label="Destination / Type / Subtype Combinations">
                  <textarea
                    value={form.destinationTypeSubtypeText}
                    className={`${inputClass} min-h-[260px] font-mono`}
                    onChange={(e) => set("destinationTypeSubtypeText", e.target.value)}
                    placeholder={
                      "1. Case Create API (CRM -> EIS -> SBI LIFE)\n" +
                      "   DESTINATION: SBI_LIFE\n" +
                      "   TXN_TYPE: CRM\n" +
                      "   TXN_SUB_TYPE: CASE_CREATE\n\n" +
                      "2. Case Update API (SBI LIFE -> EIS -> CRM)\n" +
                      "   DESTINATION: CRM\n" +
                      "   TXN_TYPE: LEAD_STATUS\n" +
                      "   TXN_SUB_TYPE: UPDATE"
                    }
                  />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Endpoint Name">
                  <input
                    value={form.endpointName}
                    className={inputClass}
                    onChange={(e) => set("endpointName", e.target.value)}
                    placeholder="e.g. SBI LIFE"
                  />
                </Field>
                <p className="text-xs text-slate-500 leading-5">
                  Only this feeds into the first assumption ("All APIs will have{" "}
                  <span className="font-semibold">{form.endpointName || "SBI LIFE"}</span> as end point.") — the
                  rest of the Other Details section (Enterprise Specs, Impact/Dependency, Business Acceptance) is
                  fixed boilerplate and shown in the preview.
                </p>
              </>
            )}

            {step === 4 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                    References (optional)
                  </span>
                  <button
                    onClick={addReference}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-75"
                  >
                    <Plus size={14} /> Add reference
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {form.references.map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <input
                        value={r.description}
                        placeholder="Description"
                        className={`${inputClass} flex-1`}
                        onChange={(e) => updateReference(r.id, { description: e.target.value })}
                      />
                      <input
                        type="file"
                        className="text-xs text-slate-500 w-32"
                        onChange={(e) => updateReference(r.id, { fileName: e.target.files?.[0]?.name })}
                      />
                      <button onClick={() => removeReference(r.id)} className="text-red-500 hover:opacity-75">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {form.references.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No references added — this section will read "None."</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Nav / generate */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} /> Back
            </button>
            {!isLastStep ? (
              <button
                onClick={() => setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
              >
                <FileDown size={16} /> {generating ? "Generating..." : "Generate .docx"}
              </button>
            )}
          </div>
        </div>

        {/* -------------------- Live preview -------------------- */}
        <div className="flex-1 min-w-0">
          <SolutionDocPreview form={form} />
        </div>
      </div>
    </div>
  );
}
