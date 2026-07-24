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
};

export const WIZARD_STEPS = [
  "Header",
  "CR Details",
  "Solution Details",
  "Other Details",
  "References",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];
