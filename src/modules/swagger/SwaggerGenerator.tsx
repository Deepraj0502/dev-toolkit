// src/components/swagger/SwaggerGenerator.tsx
import React, { useState } from "react";
import {
  Settings2,
  Play,
  LayoutTemplate,
  ShieldCheck,
  Plus,
  Trash2,
  RotateCw,
  Lock,
} from "lucide-react";
import OutputConsole from "./OutputConsole";

interface GeneratorMeta {
  title: string;
  description: string;
  version: string;
  termsOfService: string;
  contactEmail: string;
  ibmName: string;
  basePath: string;
  path: string;
  pathTags: string;
  summary: string;
  pathDesc: string;
  operationId: string;
  paramHeaderName: string;
  paramHeaderDesc: string;
  paramBodyName: string;
  paramBodyDesc: string;
}

interface CustomField {
  id: string;
  name: string;
  maxLength: string;
  required: boolean;
  description: string;
}

// Default reference values used for placeholders and fallback generation
const DEFAULTS = {
  basePath: "/SuryaGharSubsidy/create_Amend",
  path: "/accounts",
  operationId: "SuryaGharSubsidyCreateAmend_expDS",
  pathTags: "accountsDetail",
  summary: "Surya Ghar Subsidy create amend Service",
  pathDesc: "This operation will be used for Surya Ghar Subsidy service.",
  paramBodyName: "Surya Ghar Subsidy create amend service",
  paramBodyDesc: "Surya Ghar Subsidy create amend Service",
};

// Standard Enterprise Definitions
const STD_REQ_DEFINITIONS: Record<
  string,
  { description: string; maxLength?: number; required: boolean }
> = {
  SOURCE_ID: {
    description:
      "Unique code assigned to identify from which channel the request is initiated",
    maxLength: 5,
    required: true,
  },
  REQUEST_TELLER_ID: {
    description: "Request Teller ID(Maker ID)",
    maxLength: 9,
    required: true,
  },
  REQUEST_AUTH_ID: {
    description: "Request AUTH ID",
    maxLength: 7,
    required: true,
  },
  BRANCH_CODE: {
    description:
      "Unique code assigned to individual branch(physical/virtual) from where the request is initiated",
    maxLength: 5,
    required: true,
  },
};

const STD_RES_DEFINITIONS: Record<
  string,
  {
    description: string;
    maxLength?: number;
    required: boolean;
    enum?: string[];
  }
> = {
  ERROR_CODE: {
    description: "Error code in case of failure response",
    maxLength: 5,
    required: true,
    enum: [
      "SI002:SI510|EIS APPLICATION INACTIVE",
      "SI569:BRANCH/TELLER MISSING",
      "SI570:BIT MAPPING NOT CONFIGURED",
      "SI014:SI500|EIS APPLICATION TIMEOUT",
      "SI011:SI520|INCORRECT DATA IN <TAG_NAME>",
      "SI011:SI520|MISSING FIELD <TAG_NAME>",
      "SI011:SI520|EXCESS FIELD PROVIDED <TAG_NAME>",
      "SI011:SI520|PARSING EXCEPTION",
      "SI001:SI530|INCORRECT REQUEST FORMATION",
      "SI001:SI530|DATA PROCESSING FAILED",
      "SI001:SI599|UNABLE TO PROCESS DUE TO TECHNICAL ERROR",
      "SI007:SI550|INTERNAL ERROR",
      "SI017:SI551|DB INTERNAL ERROR",
      "SI094:REFERENCE NUMBER NOT UNIQUE",
      "SI095:REFERENCE NUMBER NOT OF 25 CHAR",
      "SI096:REFERENCE NUMBER AND SOURCE ID MISMATCH",
      "SI097:REFERENCE NUMBER IS NOT OF FORMAT SBIXXX",
      "SI001:SI699|Any other unhandled exception received by EIS during service call with downstream",
      "<>002:<> will contain 2 character destination indicator followed by 002,indicates error being received from downstream application",
      "<>014:<> will contain 2 character destination indicator followed by 014.indicates timeout",
    ],
  },
  ERROR_DESCRIPTION: {
    description: "Error Description - Not required for Public API",
    maxLength: 100,
    required: true,
  },
  RESPONSE_STATUS: {
    description: "Response Status [0: Success, 1: Failure]",
    maxLength: 1,
    required: true,
  },
};

export default function SwaggerGenerator() {
  // Form State
  const [meta, setMeta] = useState<GeneratorMeta>({
    title: "Swagger Specification for Surya Ghar Subsidy service V1.0",
    description:
      "Developers may use this swagger specification for Surya Ghar Subsidy create amend service.",
    version: "1.0.0",
    termsOfService:
      "Please refer to SBI Lotus Project usage policy at developer.sbilotus.com/tos",
    contactEmail: "apisupport.eis@sbi.co.in",
    ibmName: "Surya Ghar Subsidy create amend Service",
    basePath: "",
    path: "",
    pathTags: "",
    summary: "",
    pathDesc: "",
    operationId: "",
    paramHeaderName: "AccessToken",
    paramHeaderDesc: "Access token generated through the Encryption process",
    paramBodyName: "",
    paramBodyDesc: "",
  });

  // Track Enabled/Disabled State for Individual Standard Fields
  const [activeReqStd, setActiveReqStd] = useState<Record<string, boolean>>({
    SOURCE_ID: true,
    REQUEST_TELLER_ID: true,
    REQUEST_AUTH_ID: true,
    BRANCH_CODE: true,
  });
  const [activeResStd, setActiveResStd] = useState<Record<string, boolean>>({
    ERROR_CODE: true,
    ERROR_DESCRIPTION: true,
    RESPONSE_STATUS: true,
  });

  // Separated Dynamic Custom Payload States (Empty by default)
  const [reqCustomFields, setReqCustomFields] = useState<CustomField[]>([]);
  const [resCustomFields, setResCustomFields] = useState<CustomField[]>([]);
  const [outputSpec, setOutputSpec] = useState("");

  const formatTitleCase = (str: string) => {
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const handleMetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "summary") {
      setMeta((prev) => ({
        ...prev,
        summary: value,
        pathTags: value,
        pathDesc: value,
        paramBodyName: value,
        paramBodyDesc: value,
      }));
    } else {
      setMeta((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Field Management Helpers
  const addField = (
    setFields: React.Dispatch<React.SetStateAction<CustomField[]>>,
  ) => {
    setFields((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: "",
        maxLength: "",
        required: false,
        description: "",
      },
    ]);
  };

  const updateField = (
    id: string,
    key: keyof CustomField,
    value: any,
    setFields: React.Dispatch<React.SetStateAction<CustomField[]>>,
  ) => {
    setFields((fields) =>
      fields.map((f) => {
        if (f.id === id) {
          const updated = { ...f, [key]: value };
          if (key === "name" && !f.description)
            updated.description = formatTitleCase(value);
          return updated;
        }
        return f;
      }),
    );
  };

  const removeField = (
    id: string,
    setFields: React.Dispatch<React.SetStateAction<CustomField[]>>,
  ) => {
    setFields((fields) => fields.filter((f) => f.id !== id));
  };

  const handleGenerate = () => {
    const effBasePath = meta.basePath.trim() || DEFAULTS.basePath;
    const effPath = meta.path.trim() || DEFAULTS.path;
    const effOperationId = meta.operationId.trim() || DEFAULTS.operationId;
    const effTagsStr = meta.pathTags.trim() || DEFAULTS.pathTags;
    const effSummary = meta.summary.trim() || DEFAULTS.summary;
    const effPathDesc = meta.pathDesc.trim() || DEFAULTS.pathDesc;
    const effBodyName = meta.paramBodyName.trim() || DEFAULTS.paramBodyName;
    const effBodyDesc = meta.paramBodyDesc.trim() || DEFAULTS.paramBodyDesc;

    const plainReqProps: Record<string, any> = {};
    const plainResProps: Record<string, any> = {};
    const plainReqRequired: string[] = [];
    const plainResRequired: string[] = [];

    // 1. Build Request Payload Properties
    Object.entries(STD_REQ_DEFINITIONS).forEach(([key, def]) => {
      if (!activeReqStd[key]) return;
      const prop: any = { type: "string", description: def.description };
      if (def.maxLength) prop.maxLength = def.maxLength;
      plainReqProps[key] = prop;
      if (def.required) plainReqRequired.push(key);
    });

    reqCustomFields.forEach((f) => {
      if (!f.name.trim()) return;
      const prop: any = {
        type: "string",
        description: f.description || formatTitleCase(f.name),
      };
      if (f.maxLength) prop.maxLength = parseInt(f.maxLength, 10);
      plainReqProps[f.name] = prop;
      if (f.required) plainReqRequired.push(f.name);
    });

    // 2. Build Response Payload Properties
    Object.entries(STD_RES_DEFINITIONS).forEach(([key, def]) => {
      if (!activeResStd[key]) return;
      const prop: any = { type: "string", description: def.description };
      if (def.maxLength) prop.maxLength = def.maxLength;
      if (def.enum) prop.enum = def.enum;
      plainResProps[key] = prop;
      if (def.required) plainResRequired.push(key);
    });

    resCustomFields.forEach((f) => {
      if (!f.name.trim()) return;
      const prop: any = {
        type: "string",
        description: f.description || formatTitleCase(f.name),
      };
      if (f.maxLength) prop.maxLength = parseInt(f.maxLength, 10);
      plainResProps[f.name] = prop;
      if (f.required) plainResRequired.push(f.name);
    });

    const tagsArray = effTagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const refNumProp = {
      type: "string",
      description:
        "Unique Request Reference Number should be of format SBIXXYYDDDHHmmssSSSNNNNNN First 3 alphabets will always be SBI, XX will signify Channel Identifier (eg: LT for YONO channel),YYDDD will signify the Julian Date (eg: 26-02-2020 will be represented as 20057),HHmmssSSS will signify the current time in hours, minutes, second and milisecond,NNNNNN will signify running sequence number.",
      maxLength: 25,
    };

    // 3. Build Complete Swagger 2.0 Document
    const swaggerDoc: any = {
      swagger: "2.0",
      info: {
        description: meta.description,
        version: meta.version,
        title: meta.title,
        termsOfService: meta.termsOfService,
        contact: { email: meta.contactEmail },
        "x-ibm-name": meta.ibmName,
      },
      basePath: effBasePath,
      schemes: ["https"],
      paths: {
        [effPath]: {
          post: {
            tags: tagsArray.length > 0 ? tagsArray : ["accountsDetail"],
            summary: effSummary,
            description: effPathDesc,
            operationId: effOperationId,
            produces: ["application/json"],
            consumes: ["application/json"],
            parameters: [
              {
                name: meta.paramHeaderName,
                type: "string",
                required: true,
                in: "header",
                description: meta.paramHeaderDesc,
              },
              {
                name: effBodyName,
                required: true,
                description: effBodyDesc,
                schema: { $ref: "#/definitions/RequestDetails" },
                in: "body",
              },
            ],
            responses: {
              "200": {
                description: "Success",
                schema: { $ref: "#/definitions/genericResponse" },
              },
              "401": {
                description: "Unauthorized",
                schema: { $ref: "#/definitions/genericResponse" },
              },
            },
          },
        },
      },
      definitions: {
        genericResponse: {
          properties: {
            REQUEST_REFERENCE_NUMBER: refNumProp,
            RESPONSE_STATUS: {
              type: "string",
              description:
                "Signifies status of the response [0:SUCCESS, Else FAILURE]",
              maxLength: 1,
            },
            ERROR_CODE: plainResProps["ERROR_CODE"] || {
              type: "string",
              maxLength: 5,
            },
            ERROR_DESCRIPTION: {
              type: "string",
              description: "Error Description",
              maxLength: 100,
            },
          },
          required: [
            "REQUEST_REFERENCE_NUMBER",
            "ERROR_CODE",
            "RESPONSE_STATUS",
            "ERROR_DESCRIPTION",
          ],
        },
        RequestDetails: {
          properties: {
            REQUEST_REFERENCE_NUMBER: refNumProp,
            REQUEST: {
              description:
                "Payload Encrypted Request. Please refer PlainJSONRequest for the formation of REQUEST",
              type: "string",
            },
            DIGI_SIGN: { description: "Digital signature", type: "string" },
          },
          required: ["REQUEST_REFERENCE_NUMBER", "REQUEST", "DIGI_SIGN"],
        },
        ResponseDetails: {
          properties: {
            REQUEST_REFERENCE_NUMBER: refNumProp,
            RESPONSE: {
              description:
                "Payload Encrypted Response. Please refer PlainJSONResponse for the formation of RESPONSE",
              type: "string",
            },
            RESPONSE_DATE: {
              type: "string",
              description:
                "Response date and time stamp in format dd-MM-yyyy hh:mm:ss in plain text",
              maxLength: 19,
            },
            DIGI_SIGN: { description: "Digital signature", type: "string" },
          },
          required: [
            "REQUEST_REFERENCE_NUMBER",
            "RESPONSE",
            "RESPONSE_DATE",
            "DIGI_SIGN",
          ],
        },
        PlainJSONRequest: {
          properties: plainReqProps,
          required: plainReqRequired.length > 0 ? plainReqRequired : undefined,
        },
        PlainJSONResponse: {
          properties: plainResProps,
          required: plainResRequired.length > 0 ? plainResRequired : undefined,
        },
      },
    };

    if (!swaggerDoc.definitions.PlainJSONRequest.required)
      delete swaggerDoc.definitions.PlainJSONRequest.required;
    if (!swaggerDoc.definitions.PlainJSONResponse.required)
      delete swaggerDoc.definitions.PlainJSONResponse.required;

    setOutputSpec(JSON.stringify(swaggerDoc, null, 2));
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <LayoutTemplate size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
              Swagger Generator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Build an enterprise OpenAPI/Swagger 2.0 specification with
              distinct Request/Response sections.
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play size={14} className="fill-current" />
          <span>Generate Swagger</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Payload Builders */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 1. API Metadata Card */}
          <div className="bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              <Settings2 size={16} className="text-teal-500" /> API Metadata
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="1. Info Title"
                name="title"
                value={meta.title}
                onChange={handleMetaChange}
              />
              <InputField
                label="Info Description"
                name="description"
                value={meta.description}
                onChange={handleMetaChange}
              />

              <InputField
                label="2. Base Path"
                name="basePath"
                value={meta.basePath}
                onChange={handleMetaChange}
                placeholder={DEFAULTS.basePath}
              />
              <InputField
                label="3. Path (Endpoint)"
                name="path"
                value={meta.path}
                onChange={handleMetaChange}
                placeholder={DEFAULTS.path}
              />

              <InputField
                label="4. Operation ID"
                name="operationId"
                value={meta.operationId}
                onChange={handleMetaChange}
                placeholder={DEFAULTS.operationId}
              />
              <InputField
                label="5. Path Summary"
                name="summary"
                value={meta.summary}
                onChange={handleMetaChange}
                placeholder={DEFAULTS.summary}
              />

              <InputField
                label="6. Path Tags (Comma-Separated)"
                name="pathTags"
                value={meta.pathTags}
                onChange={handleMetaChange}
                placeholder={DEFAULTS.pathTags}
              />
              <InputField
                label="Path Description"
                name="pathDesc"
                value={meta.pathDesc}
                onChange={handleMetaChange}
                placeholder={DEFAULTS.pathDesc}
              />

              <InputField
                label="7. Body Parameter Name"
                name="paramBodyName"
                value={meta.paramBodyName}
                onChange={handleMetaChange}
                placeholder={DEFAULTS.paramBodyName}
              />
              <InputField
                label="Body Parameter Description"
                name="paramBodyDesc"
                value={meta.paramBodyDesc}
                onChange={handleMetaChange}
                placeholder={DEFAULTS.paramBodyDesc}
              />
            </div>
          </div>

          {/* 2. PlainJSONRequest Payload Builder (TX) */}
          <div className="bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 dark:text-white">
                <ShieldCheck size={16} className="text-teal-500" />{" "}
                PlainJSONRequest Payload (TX)
              </h3>
              <button
                onClick={() => addField(setReqCustomFields)}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Request Field
              </button>
            </div>

            {/* Standard Request Fields List */}
            <div className="mb-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Standard Request Fields (Click trash to remove)
              </span>
              {Object.entries(STD_REQ_DEFINITIONS).map(([key, def]) => (
                <StandardFieldRow
                  key={key}
                  name={key}
                  maxLength={def.maxLength}
                  active={activeReqStd[key]}
                  onToggle={() =>
                    setActiveReqStd((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                />
              ))}
            </div>

            {/* Custom Request Fields */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Custom Request Fields
              </span>
              {reqCustomFields.length === 0 ? (
                <div className="text-center p-4 text-xs font-medium text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No custom request fields added.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {reqCustomFields.map((field) => (
                    <CustomFieldRow
                      key={field.id}
                      field={field}
                      onUpdate={(k, v) =>
                        updateField(field.id, k, v, setReqCustomFields)
                      }
                      onRemove={() => removeField(field.id, setReqCustomFields)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. PlainJSONResponse Payload Builder (RX) */}
          <div className="bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 dark:text-white">
                <ShieldCheck size={16} className="text-indigo-500" />{" "}
                PlainJSONResponse Payload (RX)
              </h3>
              <button
                onClick={() => addField(setResCustomFields)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Response Field
              </button>
            </div>

            {/* Standard Response Fields List */}
            <div className="mb-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Standard Response Fields (Click trash to remove)
              </span>
              {Object.entries(STD_RES_DEFINITIONS).map(([key, def]) => (
                <StandardFieldRow
                  key={key}
                  name={key}
                  maxLength={def.maxLength}
                  active={activeResStd[key]}
                  onToggle={() =>
                    setActiveResStd((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                />
              ))}
            </div>

            {/* Custom Response Fields */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Custom Response Fields
              </span>
              {resCustomFields.length === 0 ? (
                <div className="text-center p-4 text-xs font-medium text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No custom response fields added.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {resCustomFields.map((field) => (
                    <CustomFieldRow
                      key={field.id}
                      field={field}
                      onUpdate={(k, v) =>
                        updateField(field.id, k, v, setResCustomFields)
                      }
                      onRemove={() => removeField(field.id, setResCustomFields)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-5 flex flex-col h-[calc(100vh-140px)] sticky top-6">
          <OutputConsole outputYaml={outputSpec} fileName={meta.operationId}/>
        </div>
      </div>
    </div>
  );
}

// Reusable Sub-Components
function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: any;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 focus:ring-1 ring-teal-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
      />
    </div>
  );
}

function StandardFieldRow({
  name,
  maxLength,
  active,
  onToggle,
}: {
  name: string;
  maxLength?: number;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${active ? "bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800" : "bg-rose-500/5 border-rose-500/20 opacity-60"}`}
    >
      <div className="flex items-center gap-2">
        <Lock
          size={13}
          className={active ? "text-teal-500" : "text-slate-400"}
        />
        <span
          className={`text-xs font-mono font-bold ${active ? "text-slate-800 dark:text-slate-200" : "line-through text-slate-400"}`}
        >
          {name}
        </span>
        {maxLength && (
          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">
            Max: {maxLength}
          </span>
        )}
      </div>
      <button
        onClick={onToggle}
        className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${active ? "text-rose-500 hover:bg-rose-500/10" : "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"}`}
      >
        {active ? <Trash2 size={13} /> : <RotateCw size={13} />}
        <span>{active ? "Remove" : "Restore"}</span>
      </button>
    </div>
  );
}

function CustomFieldRow({
  field,
  onUpdate,
  onRemove,
}: {
  field: CustomField;
  onUpdate: (k: keyof CustomField, v: any) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="w-1/3 min-w-[120px]">
        <input
          type="text"
          placeholder="Field_Name"
          value={field.name}
          onChange={(e) => {
            onUpdate("name", e.target.value);
            onUpdate(
              "description",
              e.target.value
                .split("_")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
                )
                .join(" "),
            );
          }}
          className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 focus:ring-1 ring-teal-500"
        />
      </div>

      <div className="w-20">
        <input
          type="number"
          placeholder="Max Len"
          value={field.maxLength}
          onChange={(e) => onUpdate("maxLength", e.target.value)}
          className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 focus:ring-1 ring-teal-500"
        />
      </div>

      <div className="flex items-center gap-1 w-14 justify-center">
        <label className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer flex items-center gap-1">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate("required", e.target.checked)}
            className="accent-teal-500 w-3 h-3 cursor-pointer"
          />
          Req
        </label>
      </div>

      <div className="flex-1 min-w-[130px]">
        <input
          type="text"
          placeholder="Description..."
          value={field.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 focus:ring-1 ring-teal-500"
        />
      </div>

      <button
        onClick={onRemove}
        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
        title="Remove Field"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
