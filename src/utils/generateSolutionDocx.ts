import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ImageRun,
} from "docx";
import { saveAs } from "file-saver";
import type { SolutionDocFormState } from "../types/solutionDoc";

// --- Base64 Logo Placeholders ---
// Replace these with actual base64 strings of your TCS and SBI logos
const TCS_LOGO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; 
const SBI_LOGO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// --- Helper Functions ---
const createCell = (text: string, bold = false, colSpan = 1) => {
  return new TableCell({
    columnSpan: colSpan,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20 })] })], // size 20 = 10pt
  });
};

const createRow = (cells: { text: string; bold?: boolean; colSpan?: number }[]) => {
  return new TableRow({
    children: cells.map(c => createCell(c.text, c.bold, c.colSpan)),
  });
};

export async function generateSolutionDocx(form: SolutionDocFormState) {
  // 1. DYNAMIC SCOPE OF CHANGE TABLE GENERATION
  const scopeOfChangeRows = [
    createRow([
      { text: "Sl.", bold: true }, { text: "API Name", bold: true }, { text: "Type", bold: true },
      { text: "New/Existing", bold: true }, { text: "Swagger", bold: true }, { text: "Remarks", bold: true }
    ]),
    createRow([
      { text: "1." }, { text: form.apiName || "" }, { text: "" },
      { text: "New" }, { text: "-" }, { text: form.apiNameFileName ? `Attached: ${form.apiNameFileName}` : "" }
    ])
  ];

  if (form.apiDocuments && form.apiDocuments.length > 0) {
    form.apiDocuments.forEach((doc, index) => {
      scopeOfChangeRows.push(
        createRow([
          { text: `${index + 2}.` }, { text: doc.description || "API Document" }, { text: "" },
          { text: "" }, { text: "-" }, { text: doc.fileName ? `Attached: ${doc.fileName}` : "" }
        ])
      );
    });
  } else {
    scopeOfChangeRows.push(
      createRow([{ text: "2." }, { text: "API Specification/CR Documents" }, { text: "" }, { text: "" }, { text: "" }, { text: "" }])
    );
  }

  scopeOfChangeRows.push(
    createRow([{ text: `${scopeOfChangeRows.length}.` }, { text: "Encryption Document" }, { text: "" }, { text: "" }, { text: "" }, { text: "For Consuming Channel within SBI" }])
  );

  // 2. DYNAMIC REFERENCES LIST GENERATION
  const referenceParagraphs = form.references && form.references.length > 0
    ? form.references.map((ref, index) => {
        const fileText = ref.fileName ? ` - ${ref.fileName}` : "";
        return new Paragraph({ text: `${index + 1}. ${ref.description || "Reference Document"}${fileText}` });
      })
    : [new Paragraph({ text: "None." })];

  // 3. DOCUMENT CONSTRUCTION
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { size: 20, font: "Arial" }, // Default 10pt Arial
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // -------------------- LOGOS & HEADER --------------------
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({ data: Uint8Array.from(atob(TCS_LOGO_BASE64), c => c.charCodeAt(0)), transformation: { width: 100, height: 50 } }),
              new TextRun({ text: "      " }), // Spacing between logos
              new ImageRun({ data: Uint8Array.from(atob(SBI_LOGO_BASE64), c => c.charCodeAt(0)), transformation: { width: 100, height: 50 } }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "Solution Document",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),

          // -------------------- MODULE / CR INFO --------------------
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              createRow([{ text: "Module", bold: true }, { text: ":", bold: true }, { text: "Enterprise Integration Services (SBI GITC, CBD Belapur, Navi Mumbai)" }]),
              createRow([{ text: "CR Number", bold: true }, { text: ":", bold: true }, { text: form.crNumber || "" }]),
              createRow([{ text: "Functionality", bold: true }, { text: ":", bold: true }, { text: form.functionality || "" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          // -------------------- LEGAL & APPROVALS --------------------
          new Paragraph({ children: [new TextRun({ text: "Notice", bold: true, size: 24 })] }),
          new Paragraph({ text: "This document is confidential and is given to you in confidence. You may only use the information it contains for the purpose it was provided. Access must be restricted to your employees and professional advisers who need access for the specified purpose. You must not otherwise disclose or use the information it contains except as required by law or where that information has lawfully become public knowledge." }),
          new Paragraph({ text: "This is a controlled document. Unauthorised access, copying, replication or usage for a purpose other than for which it is intended, are prohibited. All trademarks that appear in the document have been used for identification purposes only and belong to their respective companies." }),
          new Paragraph({ text: "" }),

          new Paragraph({ children: [new TextRun({ text: "About this document", bold: true, size: 24 })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "Purpose", bold: true }, { text: "The document gives a brief description of the functional specifications, technical solution, and assumptions as per the specific requirement raised by the bank under this Change Request." }]),
              createRow([{ text: "Intended Audience", bold: true }, { text: "SBI Development Team, UAT Team and Business Unit" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ children: [new TextRun({ text: "Document Revision or Change Control", bold: true })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "Date", bold: true }, { text: "Version", bold: true }, { text: "TCS Associate", bold: true }, { text: "Reason for Change", bold: true }]),
              createRow([{ text: form.date }, { text: "1.0" }, { text: form.tcsAssociateName }, { text: "Preparation of Solution Document" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "Date", bold: true }, { text: "Position", bold: true }, { text: "SBI Official", bold: true }, { text: "Stage", bold: true }]),
              createRow([{ text: form.date }, { text: "Approver" }, { text: form.sbiOfficialName }, { text: "Solution Document Approved" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          // -------------------- ABBREVIATIONS --------------------
          new Paragraph({ children: [new TextRun({ text: "List of abbreviations", bold: true, size: 24 })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              createRow([{ text: "1" }, { text: "YONO" }, { text: ":" }, { text: "You Only Need One" }, { text: "10" }, { text: "VPS" }, { text: ":" }, { text: "Vendor Payment System" }]),
              createRow([{ text: "2" }, { text: "GCC" }, { text: ":" }, { text: "Green Channel Counter" }, { text: "11" }, { text: "POS" }, { text: ":" }, { text: "Point of Sale" }]),
              createRow([{ text: "3" }, { text: "FE" }, { text: ":" }, { text: "Front End" }, { text: "12" }, { text: "GRC" }, { text: ":" }, { text: "Green Remit Card" }]),
              createRow([{ text: "4" }, { text: "CBS" }, { text: ":" }, { text: "Core Banking System" }, { text: "13" }, { text: "SSK" }, { text: ":" }, { text: "Self Service Kiosk" }]),
              createRow([{ text: "5" }, { text: "LOS" }, { text: ":" }, { text: "Loan Origination System" }, { text: "14" }, { text: "AOK" }, { text: ":" }, { text: "Account Opening Kiosk" }]),
              createRow([{ text: "6" }, { text: "RLMS" }, { text: ":" }, { text: "Retail Loan Management System" }, { text: "15" }, { text: "MFK" }, { text: ":" }, { text: "Multi-Function Kiosk" }]),
              createRow([{ text: "7" }, { text: "GBSS" }, { text: ":" }, { text: "Govt. Business Software Solution" }, { text: "16" }, { text: "TF" }, { text: ":" }, { text: "Trade Finance" }]),
              createRow([{ text: "8" }, { text: "INB" }, { text: ":" }, { text: "Internet Banking" }, { text: "17" }, { text: "MR" }, { text: ":" }, { text: "Multi Remittance" }]),
              createRow([{ text: "9" }, { text: "ATM" }, { text: ":" }, { text: "Automated Teller Machine" }, { text: "18" }, { text: "HRMS" }, { text: ":" }, { text: "Human Resource Mgmt. System" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          // -------------------- 1. CR DETAILS --------------------
          new Paragraph({ text: "1. CR Details", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "1.1 Description", bold: true }),
          new Paragraph({ text: form.crDescription || "EIS wrapper API to consume new services from DPMS" }),
          
          new Paragraph({ text: "1.2 Scope of Change", bold: true }),
          new Paragraph({ text: "The following APIs will be developed:" }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: scopeOfChangeRows }),
          
          new Paragraph({ text: "" }),
          new Paragraph({ text: "1.3 Existing Functionality", bold: true }),
          new Paragraph({ text: form.existingFunctionalityStatus === "New" ? "This is a New Functionality." : form.existingFunctionalityDetails }),

          new Paragraph({ text: "1.4 Feasibility", bold: true }),
          new Paragraph({ text: "The solution proposed in this document is technically feasible subject to assumptions and limitations." }),
          new Paragraph({ text: "" }),

          // -------------------- 2. SOLUTION DETAILS --------------------
          new Paragraph({ text: "2. Solution Details", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "Communication of all APIs will be in encrypted format having a common request/response format, where all fields will be mandatory. There will be a two API to be consumed by channel to EIS. From Channel to EIS standard gen6 features will be present (payload encryption and source authentication)." }),
          new Paragraph({ text: "EIS will provide a wrapper service having a parent tag EIS_PAYLOAD. The request to be sent to third party will be constructed by the channel (consuming EIS API) from their application. Post decryption of the payload, malicious content check will be performed on the entire payload. If processed successfully, while sending the request to End Point, the contents received in the EIS_PAYLOAD tag it will be encrypted as per mechanism provided by Third Party. Once response is received from Third Party, it will be checked for malicious content both pre and post decryption. If processed successfully, the contents received would be passed on to the request originating application." }),
          new Paragraph({ text: "As there are multiple schemes and within that there will be multiple scheme-specific services, the routing of the request will be done based on TXN_TYPE (denoting the Scheme Type) and TXN_SUB_TYPE (denoting the Service within the specific scheme)" }),
          new Paragraph({ text: "EIS will maintain a static value of these combinations at its end against which the original URL to be consumed would be present." }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Sample Example:", bold: true }),
          new Paragraph({ text: form.destinationTypeSubtypeText }),
          new Paragraph({ text: "" }),

          // ENCRYPTED SCHEMAS
          new Paragraph({ text: "Encrypted Request format:", bold: true }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "Sl", bold: true }, { text: "Field Name", bold: true }, { text: "Field Description", bold: true }, { text: "Length", bold: true }]),
              createRow([{ text: "1." }, { text: "REQUEST_REFERENCE_NUMBER" }, { text: "Format : SBI-XX-YY-DDD-HH-mm-ssSSS-NNNNNN" }, { text: "25" }]),
              createRow([{ text: "2." }, { text: "REQUEST" }, { text: "Payload encrypted request. Please refer plain request format for details." }, { text: "String" }]),
              createRow([{ text: "3." }, { text: "DIGI_SIGN" }, { text: "Digital Signature" }, { text: "String" }]),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Encrypted Response format:", bold: true }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "SR NO", bold: true }, { text: "Field Name", bold: true }, { text: "Field Description", bold: true }, { text: "Length", bold: true }]),
              createRow([{ text: "1." }, { text: "REQUEST_REFERENCE_NUMBER" }, { text: "Reference number of the request which is responded." }, { text: "25" }]),
              createRow([{ text: "2." }, { text: "RESPONSE" }, { text: "Payload encrypted response. Please refer plan response format for details." }, { text: "String" }]),
              createRow([{ text: "3." }, { text: "RESPONSE_DATE" }, { text: "Response date and time stamp in format “dd-MM-yyyy HH:mm:ss”" }, { text: "19" }]),
              createRow([{ text: "4." }, { text: "DIGI_SIGN" }, { text: "Digital Signature" }, { text: "String" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          // PLAIN SCHEMAS
          new Paragraph({ text: "Plain Request:", bold: true }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "SR NO", bold: true }, { text: "Field Name", bold: true }, { text: "Field Description", bold: true }, { text: "Length", bold: true }, { text: "Mandatory/ Non-Mandatory", bold: true }, { text: "Data type", bold: true }]),
              createRow([{ text: "1" }, { text: "SOURCE_ID" }, { text: "Unique code assigned to identify from which channel the request is initiated" }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
              createRow([{ text: "2" }, { text: "DESTINATION" }, { text: "Destination where the API call will be routed" }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
              createRow([{ text: "3" }, { text: "TXN_TYPE" }, { text: "Type of Scheme" }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
              createRow([{ text: "4" }, { text: "TXN_SUB_TYPE" }, { text: "Type of Service" }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
              createRow([{ text: "5" }, { text: "EIS_PAYLOAD" }, { text: "Third Party Request will be sent in this field to Destination without any modifications." }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Plain Response:", bold: true }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "SR NO", bold: true }, { text: "Field Name", bold: true }, { text: "Field Description", bold: true }, { text: "Length", bold: true }, { text: "Mandatory/ Non-Mandatory", bold: true }, { text: "Data type", bold: true }]),
              createRow([{ text: "1" }, { text: "RESPONSE_STATUS" }, { text: "0: SUCCESS else FAILURE" }, { text: "1" }, { text: "Mandatory" }, { text: "String" }]),
              createRow([{ text: "2" }, { text: "ERROR_CODE" }, { text: "Error Code (in case of transaction failure)" }, { text: "5" }, { text: "Mandatory" }, { text: "String" }]),
              createRow([{ text: "3" }, { text: "ERROR_DESCRIPTION" }, { text: "Error Description (in case of transaction failure)" }, { text: "100" }, { text: "Mandatory" }, { text: "String" }]),
              createRow([{ text: "4" }, { text: "EIS_RESPONSE" }, { text: "Third party Response Received from Destination will be sent in the field without any modifications." }, { text: "-" }, { text: "Non-Mandatory" }, { text: "String" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          // ERROR CODES
          new Paragraph({ text: "Error Code and Error Description in Detail:", bold: true }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "Error Codes", bold: true }, { text: "Error Description", bold: true }, { text: "Meaning", bold: true }]),
              createRow([{ text: "SI569" }, { text: "BRANCH/TELLER MISSING" }, { text: "API parameter missing (applicable for missing Branch and Teller configuration)" }]),
              createRow([{ text: "SI570" }, { text: "BIT MAPPING NOT CONFIGURED" }, { text: "API configuration missing (applicable for enquiry APIs)" }]),
              createRow([{ text: "SI014" }, { text: "SI500|EIS APPLICATION TIMEOUT" }, { text: "Timeout while calling SYS from EXP" }]),
              createRow([{ text: "SI002" }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "connection refused / no connections available acquired / Failed to finish connect operation" }]),
              createRow([{ text: "SI011" }, { text: "SI520|INCORRECT DATA IN <TAG_NAME>" }, { text: "Invalid Data for <dynamic field name>, ParserException xmlnsc" }]),
              createRow([{ text: "SI011" }, { text: "SI520|MISSING FIELD <TAG_NAME>" }, { text: "Missing field (field name will not be provided), ParserException xmlnsc" }]),
              createRow([{ text: "SI001" }, { text: "SI530|INCORRECT REQUEST FORMATION" }, { text: "Issues With Request String" }]),
              createRow([{ text: "SI001" }, { text: "SI530|DATA PROCESSING FAILED" }, { text: "Issues with encryption library invoke" }]),
              createRow([{ text: "SI001" }, { text: "SI599|UNABLE TO PROCESS DUE TO TECHNICAL ERROR" }, { text: "Any other unhandled error" }]),
            ],
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({ text: "Error Code and Error Description in Detail for Gateway with response status - 2:", bold: true }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "Error Codes", bold: true }, { text: "Error Description", bold: true }, { text: "Meaning", bold: true }]),
              createRow([{ text: "SI411" }, { text: "RSA decryption Failed" }, { text: "Unauthorized : RSA decryption Failed" }]),
              createRow([{ text: "SI401" }, { text: "BAD REQUEST" }, { text: "BAD request received" }]),
              createRow([{ text: "SI412" }, { text: "AES Decryption Failed" }, { text: "Unauthorized : AES decryption Failed" }]),
              createRow([{ text: "SI402" }, { text: "Payload do not have proper JSON or header" }, { text: "Unsupported Media Type." }]),
              createRow([{ text: "SI404" }, { text: "URL not found in router file" }, { text: "The requested URL was not found on this server!!" }]),
              createRow([{ text: "SI413" }, { text: "RSA signature not verified" }, { text: "DIGI-SIGN verification failed" }]),
              createRow([{ text: "SI499" }, { text: "Unhandled exception in MPGW" }, { text: "<DPG error occurred>" }]),
              createRow([{ text: "SI414" }, { text: "HASH did not verify" }, { text: "Hash verification failed" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          // -------------------- 3. OTHER DETAILS --------------------
          new Paragraph({ text: "3. Other Details", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "3.1 Assumptions", bold: true }),
          new Paragraph({ text: "The following considerations and assumptions have been made while defining the solution, estimating effort and drawing up the work plan and schedules for all the services intended to be provided as part of this proposal." }),
          new Paragraph({ text: `• All APIs will have ${form.endpointName || "SBI LIFE"} as end point.` }),
          new Paragraph({ text: "• EIS will act as pass-through." }),
          new Paragraph({ text: "• Any response/data/error received from any source/end points of EIS API will be forwarded ‘as is’." }),
          new Paragraph({ text: "• SBI will provide sign-off on solution document before development begins." }),
          new Paragraph({ text: "• Any delays due to sign-off or any prioritization activities by business may affect project timelines." }),
          new Paragraph({ text: "• SBI shall provide access to Production environment." }),
          new Paragraph({ text: "• Consumer should pass the correct values for the request fields." }),
          
          new Paragraph({ text: "" }),
          new Paragraph({ text: "3.2 Enterprise Specifications", bold: true }),
          new Paragraph({ text: "SBI EA Team (Enterprise Architecture Team) will provide Enterprise-wide Specifications." }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "3.3 Impact/Dependencies on other API development", bold: true }),
          new Paragraph({ text: "New Development of the APIs to IIB platform will involve dependencies from all the stakeholders that are either part of consumer to the APIs or End points to the APIs." }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "3.4 Business Acceptance Scenario", bold: true }),
          new Paragraph({ text: "TCS will prepare solution documents as per the acceptance criteria provided by SBI. Formal acceptance from the SBI will be obtained after the SBI has reviewed the implemented change and is satisfied with the same." }),
          new Paragraph({ text: "" }),

          // -------------------- REFERENCES --------------------
          new Paragraph({ text: "References", heading: HeadingLevel.HEADING_2 }),
          ...referenceParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Solution_Document_CR${form.crNumber || "New"}.docx`;
  saveAs(blob, fileName);
}
