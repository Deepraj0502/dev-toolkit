import { useState } from "react";
import {
  Plus,
  Trash2,
  FileDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Download,
  Layers,
} from "lucide-react";
import SolutionDocPreview from "./SolutionDocPreview";
import { generateSolutionDocx } from "../utils/generateSolutionDocx";
import {
  downloadStaticFile,
  STATIC_ENCRYPTION_DOC_BASE64,
} from "../utils/staticDownloads";
import {
  DEFAULT_SOLUTION_DOC_FORM,
  WIZARD_STEPS,
  getDefaultBankRequestFields,
  getDefaultBankResponseFields,
  type SolutionDocFormState,
  type ApiDocumentRow,
  type ReferenceRow,
  type SchemaFieldRow,
} from "../types/solutionDoc";

const inputClass =
  "w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500 dark:text-white";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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

export default function SolutionDocumentWizard({
  onBack,
}: {
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SolutionDocFormState>({
    ...DEFAULT_SOLUTION_DOC_FORM,
    documentType: "ThirdParty",
    solutionDetailsDescription: "",
    bankServices: [
      {
        id: newId(),
        serviceName: "TransferClosureDepositAmend_expDS",
        requestFields: getDefaultBankRequestFields(),
        responseFields: getDefaultBankResponseFields(),
      },
    ],
  });
  const [generating, setGenerating] = useState(false);

  const set = <K extends keyof SolutionDocFormState>(
    key: K,
    value: SolutionDocFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // --- Dynamic Array Handlers ---
  const addApiDocument = () =>
    setForm((prev) => ({
      ...prev,
      apiDocuments: [
        ...prev.apiDocuments,
        { id: newId(), description: "" } as ApiDocumentRow,
      ],
    }));

  const updateApiDocument = (id: string, patch: Partial<ApiDocumentRow>) =>
    setForm((prev) => ({
      ...prev,
      apiDocuments: prev.apiDocuments.map((d) =>
        d.id === id ? { ...d, ...patch } : d,
      ),
    }));

  const removeApiDocument = (id: string) =>
    setForm((prev) => ({
      ...prev,
      apiDocuments: prev.apiDocuments.filter((d) => d.id !== id),
    }));

  const addReference = () =>
    setForm((prev) => ({
      ...prev,
      references: [
        ...prev.references,
        { id: newId(), description: "" } as ReferenceRow,
      ],
    }));

  const updateReference = (id: string, patch: Partial<ReferenceRow>) =>
    setForm((prev) => ({
      ...prev,
      references: prev.references.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    }));

  const removeReference = (id: string) =>
    setForm((prev) => ({
      ...prev,
      references: prev.references.filter((r) => r.id !== id),
    }));

  // --- Bank Multi-Service Handlers ---
  const addBankService = () => {
    setForm((prev) => ({
      ...prev,
      bankServices: [
        ...prev.bankServices,
        {
          id: newId(),
          serviceName: `NewService_${prev.bankServices.length + 1}`,
          requestFields: getDefaultBankRequestFields(),
          responseFields: getDefaultBankResponseFields(),
        },
      ],
    }));
  };

  const removeBankService = (serviceId: string) => {
    setForm((prev) => ({
      ...prev,
      bankServices: prev.bankServices.filter((s) => s.id !== serviceId),
    }));
  };

  const updateBankServiceName = (serviceId: string, name: string) => {
    setForm((prev) => ({
      ...prev,
      bankServices: prev.bankServices.map((s) =>
        s.id === serviceId ? { ...s, serviceName: name } : s,
      ),
    }));
  };

  const addSchemaField = (serviceId: string, type: "request" | "response") => {
    setForm((prev) => ({
      ...prev,
      bankServices: prev.bankServices.map((s) => {
        if (s.id !== serviceId) return s;
        const fieldKey =
          type === "request" ? "requestFields" : "responseFields";
        return {
          ...s,
          [fieldKey]: [
            ...s[fieldKey],
            {
              id: newId(),
              name: "",
              description: "",
              length: "",
              mandatory: "Mandatory",
              dataType: "String/Numeric",
            },
          ],
        };
      }),
    }));
  };

  const updateSchemaField = (
    serviceId: string,
    type: "request" | "response",
    fieldId: string,
    patch: Partial<SchemaFieldRow>,
  ) => {
    setForm((prev) => ({
      ...prev,
      bankServices: prev.bankServices.map((s) => {
        if (s.id !== serviceId) return s;
        const fieldKey =
          type === "request" ? "requestFields" : "responseFields";
        return {
          ...s,
          [fieldKey]: s[fieldKey].map((f) =>
            f.id === fieldId ? { ...f, ...patch } : f,
          ),
        };
      }),
    }));
  };

  const removeSchemaField = (
    serviceId: string,
    type: "request" | "response",
    fieldId: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      bankServices: prev.bankServices.map((s) => {
        if (s.id !== serviceId) return s;
        const fieldKey =
          type === "request" ? "requestFields" : "responseFields";
        return {
          ...s,
          [fieldKey]: s[fieldKey].filter((f) => f.id !== fieldId),
        };
      }),
    }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateSolutionDocx(form);
    } finally {
      setGenerating(false);
    }
  };

  const isLastStep = step === WIZARD_STEPS.length - 1;

  // --- Schema Field Builder UI Component ---
  const renderSchemaFields = (
    serviceId: string,
    title: string,
    type: "request" | "response",
    fields: SchemaFieldRow[],
  ) => {
    return (
      <div className="mt-3 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/70 dark:bg-slate-900/50">
        {/* Header without the Add button */}
        <div className="mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            {title}
          </span>
        </div>

        {/* Fields List */}
        <div className="flex flex-col gap-2">
          {fields?.map((f) => (
            <div
              key={f.id}
              className="flex flex-col gap-2 p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg relative shadow-2xs"
            >
              <button
                onClick={() => removeSchemaField(serviceId, type, f.id)}
                className="absolute top-2.5 right-2.5 text-red-500 hover:opacity-75"
                title="Remove Field"
              >
                <Trash2 size={15} />
              </button>
              <div className="grid grid-cols-2 gap-2 pr-7">
                <input
                  value={f.name}
                  placeholder="Field Name"
                  className={`${inputClass} !p-1.5 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-300`}
                  onChange={(e) => {
                    updateSchemaField(serviceId, type, f.id, {
                      name: e.target.value,
                    });
                    updateSchemaField(serviceId, type, f.id, {
                      description: e.target.value
                        .split("_")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() +
                            word.slice(1).toLowerCase(),
                        )
                        .join(" "),
                    });
                  }}
                />
                <input
                  value={f.length}
                  placeholder="Length (e.g. 25 or -)"
                  className={`${inputClass} !p-1.5 text-xs font-semibold`}
                  onChange={(e) =>
                    updateSchemaField(serviceId, type, f.id, {
                      length: e.target.value,
                    })
                  }
                />
              </div>
              <input
                value={f.description}
                placeholder="Field Description"
                className={`${inputClass} !p-1.5 text-xs`}
                onChange={(e) =>
                  updateSchemaField(serviceId, type, f.id, {
                    description: e.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={f.mandatory}
                  className={`${inputClass} !p-1.5 text-xs font-semibold`}
                  onChange={(e) =>
                    updateSchemaField(serviceId, type, f.id, {
                      mandatory: e.target.value as any,
                    })
                  }
                >
                  <option value="Mandatory">Mandatory</option>
                  <option value="Non-Mandatory">Non-Mandatory</option>
                </select>
                <select
                  value={f.dataType}
                  className={`${inputClass} !p-1.5 text-xs font-mono`}
                  onChange={(e) =>
                    updateSchemaField(serviceId, type, f.id, {
                      dataType: e.target.value as any,
                    })
                  }
                >
                  <option value="String">String</option>
                  <option value="String/Numeric">String/Numeric</option>
                  <option value="String/Alphanumeric">
                    String/Alphanumeric
                  </option>
                </select>
              </div>
            </div>
          ))}

          {(!fields || fields.length === 0) && (
            <p className="text-xs text-slate-400 italic text-center py-1">
              No fields added.
            </p>
          )}

          {/* Add Button positioned at the bottom */}
          <button
            onClick={() => addSchemaField(serviceId, type)}
            className="w-full mt-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-950 border border-dashed border-indigo-300 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all"
          >
            <Plus size={14} /> Add Field
          </button>
        </div>
      </div>
    );
  };

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
                <Field label="Document Integration Type">
                  <div className="flex gap-2">
                    {(["ThirdParty", "Bank"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => set("documentType", opt)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          form.documentType === opt
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {opt === "ThirdParty"
                          ? "Third-Party API"
                          : "Bank Integration"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="CR Number / TCS CR">
                  <input
                    value={form.crNumber}
                    className={inputClass}
                    onChange={(e) => set("crNumber", e.target.value)}
                    placeholder="e.g. 578"
                  />
                </Field>
                <Field label="Functionality / Demand No.">
                  <input
                    value={form.functionality}
                    className={inputClass}
                    onChange={(e) => set("functionality", e.target.value)}
                    placeholder="e.g. DM2026046294 - OPR Loan closure through YBP"
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
                    className={`${inputClass} min-h-[90px]`}
                    onChange={(e) => set("crDescription", e.target.value)}
                    placeholder="EIS wrapper API to consume new services from ..."
                  />
                </Field>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Scope of Change
                  </h4>

                  <Field label="API Name">
                    <input
                      value={form.apiName}
                      className={inputClass}
                      onChange={(e) => {
                        set("apiName", e.target.value);
                        updateBankServiceName(
                          form.bankServices[0].id,
                          e.target.value,
                        );
                      }}
                      placeholder="e.g. TransferClosureDepositAmend_expDS"
                    />
                  </Field>

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
                          onChange={(e) =>
                            updateApiDocument(d.id, {
                              description: e.target.value,
                            })
                          }
                        />
                        <button
                          onClick={() => removeApiDocument(d.id)}
                          className="text-red-500 hover:opacity-75"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* --- STATIC DOCUMENT DOWNLOAD SECTION --- */}
                  <div className="mt-4 rounded-xl bg-indigo-50/60 dark:bg-slate-950 border border-indigo-100 dark:border-slate-800 p-3 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-indigo-950 dark:text-indigo-300">
                        EIS Encryption Specification
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Static reference for Consuming Channel within SBI.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        downloadStaticFile(
                          STATIC_ENCRYPTION_DOC_BASE64,
                          "EIS_Encryption_Specification_for_gen.docx",
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-all shrink-0 shadow-2xs"
                    >
                      <Download size={13} /> Download Spec
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  <Field label="Existing Functionality">
                    <div className="flex gap-2">
                      {(["New", "Existing"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() =>
                            set("existingFunctionalityStatus", opt)
                          }
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
                      onChange={(e) =>
                        set("existingFunctionalityDetails", e.target.value)
                      }
                      placeholder="Describe what's changing in the existing functionality..."
                    />
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {form.documentType === "Bank" ? (
                  <>
                    <Field label="Bank Solution Details (Description)">
                      <textarea
                        value={form.solutionDetailsDescription}
                        className={`${inputClass} min-h-[100px]`}
                        onChange={(e) =>
                          set("solutionDetailsDescription", e.target.value)
                        }
                        placeholder="Provide specific solution details for this bank integration..."
                      />
                    </Field>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                          <Layers size={14} /> Services / APIs (
                          {form.bankServices.length})
                        </span>
                        <button
                          onClick={addBankService}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-75 shadow-2xs"
                        >
                          <Plus size={13} /> Add Service
                        </button>
                      </div>

                      <div className="flex flex-col gap-4">
                        {form.bankServices.map((service, index) => (
                          <div
                            key={service.id}
                            className="border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 bg-white dark:bg-slate-900 shadow-sm relative"
                          >
                            {form.bankServices.length > 1 && (
                              <button
                                onClick={() => removeBankService(service.id)}
                                className="absolute top-3.5 right-3.5 text-red-500 hover:opacity-75"
                                title="Remove Service"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <Field label={`Service #${index + 1} Name`}>
                              <input
                                value={service.serviceName}
                                onChange={(e) =>
                                  updateBankServiceName(
                                    service.id,
                                    e.target.value,
                                  )
                                }
                                className={`${inputClass} font-mono font-bold text-indigo-950 dark:text-indigo-300 !pr-10`}
                                placeholder="e.g. TransferClosureDepositAmend_expDS"
                              />
                            </Field>

                            {renderSchemaFields(
                              service.id,
                              "Plain Request",
                              "request",
                              service.requestFields,
                            )}
                            {renderSchemaFields(
                              service.id,
                              "Plain Response",
                              "response",
                              service.responseFields,
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 leading-5">
                      The Solution Details boilerplate text is fixed and shown
                      in the preview. Enter the destination / type / subtype
                      combinations for this CR's APIs below, freeform.
                    </p>
                    <Field label="Destination / Type / Subtype Combinations">
                      <textarea
                        value={form.destinationTypeSubtypeText}
                        className={`${inputClass} min-h-[260px] font-mono`}
                        onChange={(e) =>
                          set("destinationTypeSubtypeText", e.target.value)
                        }
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
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Endpoint Name">
                  <input
                    value={
                      form.documentType === "Bank"
                        ? "CBS bancs port"
                        : form.endpointName
                    }
                    disabled={form.documentType === "Bank"}
                    className={`${inputClass} ${form.documentType === "Bank" ? "opacity-60 cursor-not-allowed bg-slate-200 dark:bg-slate-800 font-bold" : ""}`}
                    onChange={(e) => set("endpointName", e.target.value)}
                    placeholder="e.g. SBI LIFE"
                  />
                </Field>
                <p className="text-xs text-slate-500 leading-5">
                  Only this feeds into the first assumption ("All APIs will have{" "}
                  <span className="font-semibold">
                    {form.documentType === "Bank"
                      ? "CBS bancs port"
                      : form.endpointName || "SBI LIFE"}
                  </span>{" "}
                  as end point.") — the rest of the Other Details section is
                  fixed boilerplate.
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
                        onChange={(e) =>
                          updateReference(r.id, { description: e.target.value })
                        }
                      />
                      <button
                        onClick={() => removeReference(r.id)}
                        className="text-red-500 hover:opacity-75"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {form.references.length === 0 && (
                    <p className="text-xs text-slate-500 italic">
                      No references added — this section will read "None."
                    </p>
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
                onClick={() =>
                  setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))
                }
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
                <FileDown size={16} />{" "}
                {generating ? "Generating..." : "Generate .docx"}
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
