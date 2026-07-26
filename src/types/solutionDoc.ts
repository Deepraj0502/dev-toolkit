export interface ApiDocumentRow {
  id: string;
  description: string;
  fileName?: string;
}

export interface ReferenceRow {
  id: string;
  description: string;
  fileName?: string;
}

export type ExistingFunctionalityStatus = "New" | "Existing";

export interface SolutionDocFormState {
  // Step 1 — Header
  crNumber: string;
  functionality: string;
  date: string;
  tcsAssociateName: string;
  sbiOfficialName: string;
  apiNameFileBase64?: string;

  // Step 2 — CR Details
  crDescription: string;
  apiName: string;
  apiNameFileName?: string;
  apiDocuments: ApiDocumentRow[];
  existingFunctionalityStatus: ExistingFunctionalityStatus;
  existingFunctionalityDetails: string;

  // Step 3 — Solution Details
  destinationTypeSubtypeText: string;

  // Step 4 — Other Details
  endpointName: string;

  // Step 5 — References
  references: ReferenceRow[];

  documentType: "ThirdParty" | "Bank";
  solutionDetailsDescription: string;
  plainRequestFields: SchemaFieldRow[];
  plainResponseFields: SchemaFieldRow[];
  bankServices: BankServiceSchema[];
}

export interface ApiDocumentRow {
  id: string;
  description: string;
  fileName?: string;
  fileBase64?: string;
}

export interface ReferenceRow {
  id: string;
  description: string;
  fileName?: string;
  fileBase64?: string;
}

export const DEFAULT_SOLUTION_DOC_FORM: SolutionDocFormState = {
  crNumber: "",
  functionality: "",
  date: "",
  tcsAssociateName: "",
  sbiOfficialName: "",

  crDescription: "",
  apiName: "",
  apiNameFileName: undefined,
  apiDocuments: [],
  existingFunctionalityStatus: "New",
  existingFunctionalityDetails: "",

  destinationTypeSubtypeText: "",

  endpointName: "SBI LIFE",

  references: [],

  documentType: "ThirdParty",
  solutionDetailsDescription: "",
  plainRequestFields: [],
  plainResponseFields: [],
  bankServices: []
};

export const WIZARD_STEPS = [
  "Header",
  "CR Details",
  "Solution Details",
  "Other Details",
  "References",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export interface SchemaFieldRow {
  id: string;
  name: string;
  description: string;
  length: string;
  mandatory: "Mandatory" | "Non-Mandatory";
  dataType: "String/Numeric" | "String/Alphanumeric";
}

export interface SchemaFieldRow {
  id: string;
  name: string;
  description: string;
  length: string;
  mandatory: "Mandatory" | "Non-Mandatory";
  dataType: "String/Numeric" | "String/Alphanumeric";
}

export interface BankServiceSchema {
  id: string;
  serviceName: string;
  requestFields: SchemaFieldRow[];
  responseFields: SchemaFieldRow[];
}

// --- Pre-filled Default Generators for Bank Integrations ---
export const getDefaultBankRequestFields = (): SchemaFieldRow[] => [
  {
    id: `req-${Date.now()}-1`,
    name: "SOURCE_ID",
    description: "Unique code assigned to identify from which channel the request is initiated",
    length: "2",
    mandatory: "Mandatory",
    dataType: "String/Alphanumeric",
  },
  {
    id: `req-${Date.now()}-2`,
    name: "BRANCH_CODE",
    description: "Unique code assigned to individual branch (physical/virtual) from where the request is initiated. Not required for bth version.",
    length: "5",
    mandatory: "Mandatory",
    dataType: "String/Numeric",
  },
  {
    id: `req-${Date.now()}-3`,
    name: "REQUEST_TELLER_ID",
    description: "Maker ID for the given transaction – Not required for th and bth version",
    length: "7",
    mandatory: "Mandatory",
    dataType: "String/Numeric",
  },
  {
    id: `req-${Date.now()}-4`,
    name: "REQUEST_AUTH_ID",
    description: "Checker ID for the given transaction – Not required for th and bth version",
    length: "7",
    mandatory: "Mandatory",
    dataType: "String/Numeric",
  },
];

export const getDefaultBankResponseFields = (): SchemaFieldRow[] => [
  {
    id: `res-${Date.now()}-1`,
    name: "RESPONSE_STATUS",
    description: "Response status either 0(success) or other(failure)",
    length: "01",
    mandatory: "Mandatory",
    dataType: "String/Numeric",
  },
  {
    id: `res-${Date.now()}-2`,
    name: "ERROR_CODE",
    description: "Please refer the table titled ‘Error Code and Error Description in Details’ for EIS Codes and Description.",
    length: "05",
    mandatory: "Mandatory",
    dataType: "String/Alphanumeric",
  },
  {
    id: `res-${Date.now()}-3`,
    name: "ERROR_DESCRIPTION",
    description: "",
    length: "100",
    mandatory: "Mandatory",
    dataType: "String/Alphanumeric",
  },
];