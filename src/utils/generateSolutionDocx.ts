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
  BorderStyle,
  ImageRun,
  PageBreak,
  TabStopType,
  TabStopPosition,
  LeaderType,
  VerticalMergeType,
  VerticalAlign,
  HeadingLevel,
} from "docx";
import { saveAs } from "file-saver";
import type { SolutionDocFormState } from "../types/solutionDoc";

// --- Base64 Logo Placeholders ---
const TCS_LOGO_BASE64 = "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";
const SBI_LOGO_BASE64 = "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";

// --- Helper Functions ---
const createCell = (
  text: string, 
  bold = false, 
  colSpan = 1, 
  italics = false, 
  alignment: any = AlignmentType.LEFT,
  rowSpan = 1,
  vMerge?: any
) => {
  return new TableCell({
    columnSpan: colSpan,
    rowSpan: rowSpan > 1 ? rowSpan : undefined,
    verticalMerge: vMerge,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: alignment,
        children: [new TextRun({ text, bold, italics, size: 22, font: "Cambria" })],
      }),
    ],
  });
};

const createRow = (cells: { text: string; bold?: boolean; colSpan?: number; italics?: boolean; alignment?: any; rowSpan?: number; vMerge?: any }[]) => {
  return new TableRow({
    children: cells.map(c => createCell(c.text, c.bold, c.colSpan, c.italics, c.alignment, c.rowSpan, c.vMerge)),
  });
};

const createBullet = (text: string) => {
  return new Paragraph({
    indent: { left: 720, hanging: 360 },
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: "•", size: 14 }),  
      new TextRun({ text: "\t" }),           
      new TextRun({ text: text, size: 22 }), 
    ],
  });
};

const createTocRow = (title: string, page: string, isSubItem: boolean = false) => {
  return new Paragraph({
    indent: { left: isSubItem ? 400 : 0 },
    spacing: {
      before: 60,
      after: 120,
    },
    tabStops: [
      {
        type: TabStopType.RIGHT,
        position: TabStopPosition.MAX,
        leader: LeaderType.DOT,
      },
    ],
    children: [
      new TextRun({ text: title, size: 22, bold: true }),
      new TextRun({ text: `\t${page}`, size: 22, bold: true }),
    ],
  });
};

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

export async function generateSolutionDocx(form: SolutionDocFormState) {
  const isBank = form.documentType === "Bank";
  
  // 1. DYNAMIC SCOPE OF CHANGE TABLE
  const scopeOfChangeRows = [
    createRow([
      { text: isBank ? "Sr.no" : "SL", bold: true, alignment: AlignmentType.CENTER }, 
      { text: "API Name", bold: true, alignment: AlignmentType.CENTER }, 
      { text: "Type", bold: true, alignment: AlignmentType.CENTER },
      { text: isBank ? "New/\nExisting" : "New/Existing", bold: true, alignment: AlignmentType.CENTER }, 
      { text: "Swagger", bold: true, alignment: AlignmentType.CENTER }, 
      { text: "Remarks", bold: true, alignment: AlignmentType.CENTER }
    ]),
    createRow([
      { text: "1.", alignment: AlignmentType.CENTER }, 
      { text: form.apiName || "" }, 
      { text: isBank ? "EIS -CBS" : "" },
      { text: "New", alignment: AlignmentType.CENTER }, 
      { text: form.apiNameFileName ? `📄\n${form.apiNameFileName}` : "-", alignment: AlignmentType.CENTER }, 
      { text: "" }
    ])
  ];

  if (form.apiDocuments && form.apiDocuments.length > 0) {
    form.apiDocuments.forEach((doc, index) => {
      scopeOfChangeRows.push(
        createRow([
          { text: `${index + 2}.`, alignment: AlignmentType.CENTER }, 
          { text: doc.description || "API Document" }, 
          { text: "" },
          { text: "" }, 
          { text: doc.fileName ? `📄\n${doc.fileName}` : "-", alignment: AlignmentType.CENTER }, 
          { text: "" }
        ])
      );
    });
  } else {
    scopeOfChangeRows.push(
      createRow([
        { text: "2.", alignment: AlignmentType.CENTER }, 
        { text: "API Specification/CR Documents" }, 
        { text: "" }, { text: "" }, { text: "" }, { text: "" }
      ])
    );
  }

  scopeOfChangeRows.push(
    createRow([
      { text: `${scopeOfChangeRows.length}.`, alignment: AlignmentType.CENTER }, 
      { text: "Encryption Document" }, 
      { text: "" }, { text: "" }, 
      { text: "", alignment: AlignmentType.CENTER }, 
      { text: "For Consuming Channel within SBI", alignment: AlignmentType.CENTER }
    ])
  );

  const referenceParagraphs = form.references && form.references.length > 0
    ? form.references.map((ref) => {
        return new Paragraph({ 
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `📄\n`, size: 40 }), 
            new TextRun({ text: `${ref.fileName || ref.description}`, size: 22 })
          ] 
        });
      })
    : [new Paragraph({ children: [new TextRun({ text: "None.", italics: true })] })];

  const sampleTextParagraphs = form.destinationTypeSubtypeText.split('\n').map(line => 
    new Paragraph({ 
      indent: { left: 720 },
      children: [new TextRun({ text: line, size: 22 })] 
    })
  );

  // 2. DOCUMENT CONSTRUCTION
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { size: 22, font: "Cambria" }, 
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          // -------------------- PAGE 1: LOGOS & HEADER --------------------
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.LEFT,
                        children: [
                          new ImageRun({
                            data: Uint8Array.from(atob(TCS_LOGO_BASE64), c => c.charCodeAt(0)),
                            transformation: { width: 350, height: 180 },
                            type: 'png',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new ImageRun({
                            data: Uint8Array.from(atob(SBI_LOGO_BASE64), c => c.charCodeAt(0)),
                            transformation: { width: 350, height: 180 },
                            type: 'png',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Solution Document", bold: true, size: 30 })],
          }),
          new Paragraph({ text: "" }),

          // -------------------- PAGE 1: MODULE / CR INFO --------------------
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            rows: [
              createRow([{ text: "Module", bold: true }, { text: ":", bold: true }, { text: "Enterprise Integration Services (SBI GITC, CBD Belapur, Navi Mumbai)" }]),
              createRow([{ text: isBank ? "TCS CR" : "CR Number", bold: true }, { text: ":", bold: true }, { text: form.crNumber || "" }]),
              createRow([{ text: "Demand No.", bold: true }, { text: ":", bold: true }, { text: form.functionality || "" }]),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),

          // -------------------- PAGE 1: NOTICE --------------------
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Notice", bold: true })] }),
          new Paragraph({ 
            alignment: AlignmentType.JUSTIFIED, 
            children: [new TextRun({ text: "This document is confidential and is given to you in confidence. You may only use the information it contains for the purpose it was provided. Access must be restricted to your employees and professional advisers who need access for the specified purpose. You must not otherwise disclose or use the information it contains except as required by law or where that information has lawfully become public knowledge.", italics: true })] 
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ 
            alignment: AlignmentType.JUSTIFIED, 
            children: [new TextRun({ text: "This is a controlled document. Unauthorised access, copying, replication or usage for a purpose other than for which it is intended, are prohibited.", italics: true })] 
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ 
            alignment: AlignmentType.JUSTIFIED, 
            children: [new TextRun({ text: "All trademarks that appear in the document have been used for identification purposes only and belong to their respective companies.", italics: true })] 
          }),
          
          new Paragraph({ children: [new PageBreak()] }),

          // -------------------- PAGE 2: ABOUT THIS DOCUMENT --------------------
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "About this document", bold: true })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            rows: [
              createRow([{ text: "Purpose", bold: true }, { text: `The document gives a brief description of the functional specifications, technical solution${isBank ? "" : ","} and assumptions as per the specific requirement raised by the bank under this Change Request.` }]),
              createRow([{ text: "Intended Audience", bold: true }, { text: "SBI Development Team, UAT Team and Business Unit" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          // -------------------- PAGE 2: REVISION CONTROL --------------------
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Document Revision or Change Control", bold: true })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([
                { text: "Date", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                { text: "Version", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                { text: "TCS Associate", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                { text: "Reason for Change", italics: true, alignment: AlignmentType.CENTER, bold: true }
              ]),
              createRow([
                { text: form.date, alignment: AlignmentType.CENTER }, 
                { text: "1.0", alignment: AlignmentType.CENTER }, 
                { text: form.tcsAssociateName, alignment: AlignmentType.CENTER }, 
                { text: "Preparation of solution document", alignment: AlignmentType.CENTER }
              ]),
            ],
          }),
          new Paragraph({ text: "" }),

          // -------------------- PAGE 2: SIGN-OFF --------------------
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([
                { text: "Date", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                { text: "Position", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                { text: "SBI Official", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                { text: "Stage", italics: true, alignment: AlignmentType.CENTER, bold: true }
              ]),
              createRow([
                { text: form.date, alignment: AlignmentType.CENTER }, 
                { text: "Project Manager", alignment: AlignmentType.CENTER }, 
                { text: form.sbiOfficialName, alignment: AlignmentType.CENTER }, 
                { text: "Solution Document Approval", alignment: AlignmentType.CENTER }
              ]),
            ],
          }),
          new Paragraph({ text: "" }),
          
          // -------------------- PAGE 2: CONTENTS --------------------
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Contents", bold: true })] }),
          new Paragraph({ text: "" }),
          
          createTocRow("1. CR Details", "3"),
          createTocRow("1.1 Description", "3", true),
          createTocRow("1.2 Scope of Change", "3", true),
          createTocRow("1.3 Existing Functionality", "3", true),
          createTocRow("1.4 Feasibility", "3", true),
          createTocRow("2. Solution Details", "4"),
          createTocRow("3. Other Details", "11"),
          createTocRow("3.1 Assumptions", "11", true),
          createTocRow("3.2 Enterprise Specs.", "11", true),
          createTocRow("3.3 Impact/Dependency", "11", true),
          createTocRow("3.4 Business Acceptance", "11", true),
          
          new Paragraph({ text: "" }),

          // -------------------- PAGE 2: ABBREVIATIONS --------------------
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "List of abbreviations", bold: true })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([{ text: "1", bold: true }, { text: "YONO" }, { text: ":" }, { text: "You Only Need One" }, { text: "10", bold: true }, { text: "VPS" }, { text: ":" }, { text: "Vendor Payment System" }]),
              createRow([{ text: "2", bold: true }, { text: "GCC" }, { text: ":" }, { text: "Green Channel Counter" }, { text: "11", bold: true }, { text: "POS" }, { text: ":" }, { text: "Point of Sale" }]),
              createRow([{ text: "3", bold: true }, { text: "FE" }, { text: ":" }, { text: "Front End" }, { text: "12", bold: true }, { text: "GRC" }, { text: ":" }, { text: "Green Remit Card" }]),
              createRow([{ text: "4", bold: true }, { text: "CBS" }, { text: ":" }, { text: "Core Banking System" }, { text: "13", bold: true }, { text: "SSK" }, { text: ":" }, { text: "Self Service Kiosk" }]),
              createRow([{ text: "5", bold: true }, { text: "LOS" }, { text: ":" }, { text: "Loan Origination System" }, { text: "14", bold: true }, { text: "AOK" }, { text: ":" }, { text: "Account Opening Kiosk" }]),
              createRow([{ text: "6", bold: true }, { text: "RLMS" }, { text: ":" }, { text: "Retail Loan Management System" }, { text: "15", bold: true }, { text: "MFK" }, { text: ":" }, { text: "Multi-Function Kiosk" }]),
              createRow([{ text: "7", bold: true }, { text: "GBSS" }, { text: ":" }, { text: "Govt. Business Software Solution" }, { text: "16", bold: true }, { text: "TF" }, { text: ":" }, { text: "Trade Finance" }]),
              createRow([{ text: "8", bold: true }, { text: "INB" }, { text: ":" }, { text: "Internet Banking" }, { text: "17", bold: true }, { text: "MR" }, { text: ":" }, { text: "Multi Remittance" }]),
              createRow([{ text: "9", bold: true }, { text: "ATM" }, { text: ":" }, { text: "Automated Teller Machine" }, { text: "18", bold: true }, { text: "HRMS" }, { text: ":" }, { text: "Human Resource Mgmt. System" }]),
            ],
          }),
          
          new Paragraph({ children: [new PageBreak()] }),
          
          // -------------------- MAIN CONTENT PAGES --------------------
          new Paragraph({ children: [new TextRun({ text: "1 CR Details", bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: form.crDescription || "EIS wrapper API to consume new services from DPMS", indent: { left: 400 } }),
          new Paragraph({ text: "" }),
          
          ...(!isBank
            ? [
                new Paragraph({ text: "1. Case Create API (CRM -> EIS -> SBI LIFE)", indent: { left: 720 } }),
                new Paragraph({ text: "2. Case Update API (SBI LIFE -> EIS -> CRM)", indent: { left: 720 } }),
                new Paragraph({ text: "" }),
              ]
            : []),
          
          new Paragraph({ children: [new TextRun({ text: "2. Scope of Change", bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: `The following APIs will be developed${isBank ? "." : ""}`, indent: { left: 400 } }),
          new Paragraph({ text: "" }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: scopeOfChangeRows }),
          new Paragraph({ text: "" }),
          
          new Paragraph({ children: [new TextRun({ text: "3 Existing Functionality", bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: form.existingFunctionalityStatus === "New" ? (isBank ? "The functionality is new." : "This is a New Functionality.") : `${form.existingFunctionalityDetails || ""}`, indent: { left: 400 } }),
          new Paragraph({ text: "" }),

          new Paragraph({ children: [new TextRun({ text: "4 Feasibility", bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "The solution proposed in this document is technically feasible subject to assumptions and limitations.", indent: { left: 400 } }),
          new Paragraph({ text: "" }),

          new Paragraph({ children: [new TextRun({ text: "2 Solution Details", bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Communication of all APIs will be in encrypted format having a common request/response format, where all fields will be mandatory." }),
          new Paragraph({ text: "" }),
          
          ...(isBank && form.solutionDetailsDescription
            ? [
                new Paragraph({ text: form.solutionDetailsDescription }),
                new Paragraph({ text: "" }),
              ]
            : []),
          
          ...(!isBank
            ? [
                new Paragraph({ text: "There will be a two API to be consumed by channel to EIS. From Channel to EIS standard gen6 features will be present (payload encryption and source authentication)." }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "EIS will provide a wrapper service having a parent tag EIS_PAYLOAD. The request to be sent to third party will be constructed by the channel (consuming EIS API) from their application. Post decryption of the payload, malicious content check will be performed on the entire payload. If processed successfully, while sending the request to End Point, the contents received in the EIS_PAYLOAD tag it will be encrypted as per mechanism provided by Third Party. Once response is received from Third Party, it will be checked for malicious content both pre and post decryption. If processed successfully, the contents received would be passed on to the request originating application." }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "As there are multiple schemes and within that there will be multiple scheme-specific services, the routing of the request will be done based on TXN_TYPE (denoting the Scheme Type) and TXN_SUB_TYPE (denoting the Service within the specific scheme)" }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "EIS will maintain a static value of these combinations at its end against which the original URL to be consumed would be present." }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "Sample Example:" }),
                new Paragraph({ text: "" }),
                ...sampleTextParagraphs,
                new Paragraph({ text: "" }),
              ]
            : []),

          // -------------------- ENCRYPTED REQUEST FORMAT --------------------
          new Paragraph({ children: [new TextRun({ text: "Encrypted Request format:", bold: true })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell("Sl", true, 1, true, AlignmentType.CENTER),
                  createCell("Field Name", true, 1, true, AlignmentType.CENTER),
                  createCell("Field Description", true, 2, true, AlignmentType.CENTER),
                  createCell("Length", true, 1, true, AlignmentType.CENTER),
                ],
              }),
              
              // --- ITEM 1: REQUEST_REFERENCE_NUMBER ---
              new TableRow({
                children: [
                  createCell("1.", false, 1, false, AlignmentType.CENTER, isBank ? 7 : 8), 
                  createCell(isBank ? "REQUEST_REFERENCE_NUMBR" : "REQUEST_REFERENCE_NUMBER", false, 1, false, AlignmentType.LEFT, isBank ? 7 : 8), 
                  createCell(isBank ? "Format- SBI-XX-YY-DDD-HHmmssSSS-NNNNNN" : "Format : SBI-XX-YY-DDD-HH-mm-ssSSS-NNNNNN", false, 2, false, AlignmentType.LEFT), 
                  createCell("25", false, 1, false, AlignmentType.LEFT, isBank ? 7 : 8), 
                ],
              }),
              new TableRow({
                children: [
                  createCell("SBI", true, 1, false, AlignmentType.CENTER),
                  createCell("Mandatory", false, 1, false, AlignmentType.LEFT),
                ],
              }),
              new TableRow({
                children: [
                  createCell("XX", true, 1, false, AlignmentType.CENTER),
                  createCell("2-character AO identifier. YA for Yono App, YB for Yono Branch. Providing correct identifier is required as certificate will be mapped to this for encryption, decryption, source authentication", false, 1, false, AlignmentType.LEFT),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "YY", bold: true })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "DDD", bold: true })],
                      }),
                    ],
                    verticalMerge: VerticalMergeType.RESTART,
                  }),
                  createCell(
                    `Julian day, where first two characters is the year and remaining three characters is day of the year. ${isBank ? "\n" : ""}Eg${isBank ? ":" : " :"} 26-Feb-2020 will be represented as 20057`,
                    false, 1, false, AlignmentType.LEFT, 2, VerticalMergeType.RESTART
                  ),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "" })],
                    verticalMerge: VerticalMergeType.CONTINUE,
                  }),
                  createCell("", false, 1, false, AlignmentType.LEFT, 1, VerticalMergeType.CONTINUE),
                ],
              }),
              new TableRow({
                children: [
                  createCell("HHmmssSSS", true, 1, false, AlignmentType.CENTER),
                  createCell("Origination time of request in hours, minutes, seconds and milliseconds.", false, 1, false, AlignmentType.LEFT),
                ],
              }),
              new TableRow({
                children: [
                  createCell("NNNNNN", true, 1, false, AlignmentType.CENTER),
                  createCell("Running sequence", false, 1, false, AlignmentType.LEFT),
                ],
              }),
              new TableRow({
                children: [
                  createCell("The date and time of origination (if provided properly) may be used to track any delay of request receipt at EIS for the purposes of reporting issues pertaining to network delay. It must be ensured that the servers are synched with NTP servers.", false, isBank ? 5 : 2, false, AlignmentType.LEFT), 
                ],
              }),

              // --- ITEM 2: REQUEST ---
              new TableRow({
                children: [
                  createCell("2.", false, 1, false, AlignmentType.CENTER),
                  createCell("REQUEST", false, 1, false, AlignmentType.LEFT),
                  createCell("Payload encrypted request. Please refer plain request format for details.", false, 2, false, AlignmentType.LEFT), 
                  createCell("String", false, 1, false, AlignmentType.LEFT),
                ],
              }),

              // --- ITEM 3: DIGI_SIGN ---
              new TableRow({
                children: [
                  createCell("3.", false, 1, false, AlignmentType.CENTER),
                  createCell("DIGI_SIGN", false, 1, false, AlignmentType.LEFT),
                  createCell("Digital Signature", false, 2, false, AlignmentType.LEFT), 
                  createCell("String", false, 1, false, AlignmentType.LEFT),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          // -------------------- ENCRYPTED RESPONSE FORMAT --------------------
          new Paragraph({ children: [new TextRun({ text: "Encrypted Response format:", bold: true })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([
                { text: isBank ? "Sl" : "SR NO", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                { text: "Field Name", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                { text: "Field Description", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                { text: "Length", italics: true, alignment: AlignmentType.CENTER, bold: true }
              ]),
              createRow([{ text: "1.", alignment: AlignmentType.CENTER }, { text: "REQUEST_REFERENCE_NUMBER" }, { text: "Reference number of the request which is responded." }, { text: "25" }]),
              createRow([{ text: "2.", alignment: AlignmentType.CENTER }, { text: "RESPONSE" }, { text: "Payload encrypted response. Please refer plan response format for details." }, { text: "String" }]),
              createRow([{ text: "3.", alignment: AlignmentType.CENTER }, { text: "RESPONSE_DATE" }, { text: "Response date and time stamp in format “dd-MM-yyyy HH:mm:ss”" }, { text: "19" }]),
              createRow([{ text: "4.", alignment: AlignmentType.CENTER }, { text: "DIGI_SIGN" }, { text: "Digital Signature" }, { text: "String" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          // -------------------- PLAIN REQUEST AND RESPONSE FORMATS --------------------
          ...(isBank
            ? (form.bankServices || []).flatMap((service, sIdx) => [
                new Paragraph({
                  text: service.serviceName || `Service #${sIdx + 1}`,
                  heading: HeadingLevel.HEADING_3,
                  spacing: { before: 240, after: 120 },
                }),
                new Paragraph({ children: [new TextRun({ text: "Plain Request:", bold: true })] }),
                new Paragraph({ text: "" }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    createRow([
                      { text: "Sl", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Field Name", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Field Description", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Length", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Data Type", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Mandatory/Non-Mandatory", italics: true, alignment: AlignmentType.CENTER, bold: true },
                    ]),
                    ...(service.requestFields || []).map((f, i) =>
                      createRow([
                        { text: `${i + 1}`, alignment: AlignmentType.CENTER },
                        { text: f.name || "-", bold: true },
                        { text: f.description || "-" },
                        { text: f.length || "-", alignment: AlignmentType.CENTER },
                        { text: f.dataType || "String" },
                        { text: f.mandatory || "Mandatory" },
                      ])
                    ),
                  ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Plain Response:", bold: true })] }),
                new Paragraph({ text: "" }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    createRow([
                      { text: "Sl", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Field Name", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Field Description", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Length", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Data Type", italics: true, alignment: AlignmentType.CENTER, bold: true },
                      { text: "Mandatory/Non-Mandatory", italics: true, alignment: AlignmentType.CENTER, bold: true },
                    ]),
                    ...(service.responseFields || []).map((f, i) =>
                      createRow([
                        { text: `${i + 1}.`, alignment: AlignmentType.CENTER },
                        { text: f.name || "-", bold: true },
                        { text: f.description || "-" },
                        { text: f.length || "-", alignment: AlignmentType.CENTER },
                        { text: f.dataType || "String" },
                        { text: f.mandatory || "Mandatory" },
                      ])
                    ),
                  ],
                }),
                new Paragraph({ text: "" }),
              ])
            : [
                new Paragraph({ children: [new TextRun({ text: "Plain Request:", bold: true })] }),
                new Paragraph({ text: "" }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    createRow([
                      { text: "SR\nNO", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Field Name", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Field Description", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Length", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Mandatory/\nNon\nMandatory", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Data type", italics: true, alignment: AlignmentType.CENTER, bold: true }
                    ]),
                    createRow([{ text: "1", alignment: AlignmentType.CENTER }, { text: "SOURCE_ID" }, { text: "Unique code assigned to identify from which channel the request is initiated" }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
                    createRow([{ text: "2", alignment: AlignmentType.CENTER }, { text: "DESTINATION" }, { text: "Destination where the API call will be routed" }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
                    createRow([{ text: "3", alignment: AlignmentType.CENTER }, { text: "TXN_TYPE" }, { text: "Type of Scheme" }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
                    createRow([{ text: "4", alignment: AlignmentType.CENTER }, { text: "TXN_SUB_TYPE" }, { text: "Type of Service" }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
                    createRow([{ text: "5", alignment: AlignmentType.CENTER }, { text: "EIS_PAYLOAD" }, { text: "Third Party Request will be sent in this field to Destination without any modifications." }, { text: "-" }, { text: "Mandatory" }, { text: "String" }]),
                  ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Plain Response:", bold: true })] }),
                new Paragraph({ text: "" }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    createRow([
                      { text: "SR\nNO", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Field Name", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Field Description", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Length", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Mandatory/\nNon\nMandatory", italics: true, alignment: AlignmentType.CENTER, bold: true }, 
                      { text: "Data type", italics: true, alignment: AlignmentType.CENTER, bold: true }
                    ]),
                    createRow([{ text: "1", alignment: AlignmentType.CENTER }, { text: "RESPONSE_STATUS" }, { text: "0: SUCCESS else FAILURE" }, { text: "1" }, { text: "Mandatory" }, { text: "String" }]),
                    createRow([{ text: "2", alignment: AlignmentType.CENTER }, { text: "ERROR_CODE" }, { text: "Error Code (in case of transaction failure)" }, { text: "5" }, { text: "Mandatory" }, { text: "String" }]),
                    createRow([{ text: "3", alignment: AlignmentType.CENTER }, { text: "ERROR_DESCRIPTION" }, { text: "Error Description (in case of transaction failure)" }, { text: "100" }, { text: "Mandatory" }, { text: "String" }]),
                    createRow([{ text: "4", alignment: AlignmentType.CENTER }, { text: "EIS_RESPONSE" }, { text: "Third party Response Received from Destination will be sent in the field without any modifications." }, { text: "-" }, { text: "Non-Mandatory" }, { text: "String" }]),
                  ],
                }),
                new Paragraph({ text: "" }),
              ]),

          // -------------------- ERROR CODES --------------------
          new Paragraph({ children: [new TextRun({ text: "Error Code and Error Description in Detail:", bold: true, size: 28 })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([
                { text: "Error Codes", bold: true, alignment: AlignmentType.CENTER }, 
                { text: "Error Description", bold: true, alignment: AlignmentType.CENTER }, 
                { text: "Meaning", bold: true, alignment: AlignmentType.CENTER }
              ]),
              createRow([{ text: "SI569", alignment: AlignmentType.CENTER }, { text: "BRANCH/TELLER MISSING" }, { text: "API parameter missing (applicable for missing Branch and Teller configuration)" }]),
              createRow([{ text: "SI570", alignment: AlignmentType.CENTER }, { text: "BIT MAPPING NOT CONFIGURED" }, { text: "API configuration missing (applicable for enquiry APIs)" }]),
              createRow([{ text: "SI014", alignment: AlignmentType.CENTER }, { text: "SI500|EIS APPLICATION TIMEOUT" }, { text: "Timeout while calling SYS from EXP" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "connection refused" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "no connections available acquired" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "Failed to finish connect operation" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "detected a SOCKET error whilst invoking a web service" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "503 Service Unavailable" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "404 Not Found" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "401 Unauthorised" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "500 Internal Server Error" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "Connection reset by peer" }]),
              createRow([{ text: "SI002", alignment: AlignmentType.CENTER }, { text: "SI510|EIS APPLICATION INACTIVE" }, { text: "unhandled exception while calling SYS from EXP" }]),
              createRow([{ text: "SI011", alignment: AlignmentType.CENTER }, { text: "SI520|INCORRECT DATA IN <TAG_NAME>" }, { text: "Invalid Data for <dynamic field name>,\nParserException xmlnsc" }]),
              createRow([{ text: "SI011", alignment: AlignmentType.CENTER }, { text: "SI520|MISSING FIELD <TAG_NAME>" }, { text: "Missing field (field name will not be provided).\nParserException xmlnsc" }]),
              createRow([{ text: "SI011", alignment: AlignmentType.CENTER }, { text: "SI520|EXCESS FIELD PROVIDED <TAG_NAME>" }, { text: "Excess field provided (field name will not be provided). No root element was found while writing the XML message" }]),
              createRow([{ text: "SI011", alignment: AlignmentType.CENTER }, { text: "SI520|PARSING EXCEPTION" }, { text: "5706-JSON writing errors have occurred" }]),
              createRow([{ text: "SI011", alignment: AlignmentType.CENTER }, { text: "SI520|CASTING EXCEPTION" }, { text: "CastException" }]),
              createRow([{ text: "SI001", alignment: AlignmentType.CENTER }, { text: "SI530|INCORRECT REQUEST FORMATION" }, { text: "Issues With Request String" }]),
              createRow([{ text: "SI001", alignment: AlignmentType.CENTER }, { text: "SI530|DATA PROCESSING FAILED" }, { text: "Issues with encryption library invoke" }]),
              createRow([{ text: "SI001", alignment: AlignmentType.CENTER }, { text: "SI599|UNABLE TO PROCESS DUE TO TECHNICAL ERROR" }, { text: "Any other unhandled error" }]),
            ],
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({ children: [new TextRun({ text: `Error Code and Error Description in Detail for Gateway with response status ${isBank ? "" : "- 2:"}`, bold: true, size: 28 })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([
                { text: "Error Codes", bold: true, alignment: AlignmentType.CENTER }, 
                { text: "Error Description", bold: true, alignment: AlignmentType.CENTER }, 
                { text: "Meaning", bold: true, alignment: AlignmentType.CENTER }
              ]),
              ...(isBank
                ? [
                    createRow([{ text: "SI011", alignment: AlignmentType.CENTER }, { text: "Unauthorized" }, { text: "Describes the invalid/missing access token" }]),
                    createRow([{ text: "SI011", alignment: AlignmentType.CENTER }, { text: "The requested URL was not found on this server" }, { text: "Describes URL is not hosted on DPG" }]),
                    createRow([{ text: "SI011", alignment: AlignmentType.CENTER }, { text: "Unable to process due to validation error!!" }, { text: "Describes the request decryption fails at EIS ends" }]),
                    createRow([{ text: "SI051", alignment: AlignmentType.CENTER }, { text: "Unauthorized" }, { text: "Describes EIS unable to authenticate the sender." }]),
                    createRow([{ text: "SI001", alignment: AlignmentType.CENTER }, { text: "-" }, { text: "Dynamic in nature which will be represent error as per the exception occurred." }]),
                  ]
                : [
                    createRow([{ text: "SI411", alignment: AlignmentType.CENTER }, { text: "RSA decryption Failed" }, { text: "Unauthorized : RSA decryption Failed" }]),
                    createRow([{ text: "SI401", alignment: AlignmentType.CENTER }, { text: "BAD REQUEST" }, { text: "BAD request received" }]),
                    createRow([{ text: "SI412", alignment: AlignmentType.CENTER }, { text: "AES Decryption Failed" }, { text: "Unauthorized : AES decryption Failed" }]),
                    createRow([{ text: "SI402", alignment: AlignmentType.CENTER }, { text: 'Payload do not have proper JSON or header "application/JSON" is not present' }, { text: "Unsupported Media Type." }]),
                    createRow([{ text: "SI404", alignment: AlignmentType.CENTER }, { text: "URL not found in router file" }, { text: "The requested URL was not found on this server!!" }]),
                    createRow([{ text: "SI413", alignment: AlignmentType.CENTER }, { text: "RSA signature not verified" }, { text: "DIGI-SIGN verification failed" }]),
                    createRow([{ text: "SI499", alignment: AlignmentType.CENTER }, { text: "Unhandled exception in MPGW" }, { text: "<DPG error occurred>" }]),
                    createRow([{ text: "SI414", alignment: AlignmentType.CENTER }, { text: "HASH did not verify" }, { text: "Hash verification failed" }]),
                  ]),
            ],
          }),
          new Paragraph({ text: "" }),

          // -------------------- 3. OTHER DETAILS --------------------
          new Paragraph({ children: [new TextRun({ text: `3${isBank ? "" : "."} Other Details`, bold: true, size: 28 })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun({ text: "3.1 Assumptions", bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "The following considerations and assumptions have been made while defining the solution, estimating effort and drawing up the work plan and schedules for all the services intended to be provided as part of this proposal." }),
          new Paragraph({ text: "" }),
          
          ...(isBank
            ? [
                createBullet("All APIs will have CBS bancs port as endpoint."),
                createBullet("EIS will act as a middle-ware"),
                createBullet("SBI will provide sign-off on solution document before development begins."),
                createBullet("Any delays due to sign-off or any prioritization activities by business may affect project timelines."),
                createBullet("SBI shall provide access to Production environment."),
                createBullet("Consumer should pass the correct values for the request fields."),
                createBullet("Spaces are being trimmed in response."),
                createBullet("Numeric values will be left padded with zero and alphanumeric and alphabet values will be right padded with space"),
              ]
            : [
                createBullet(`All APIs will have ${form.endpointName || "SBI LIFE"} as end point.`),
                createBullet("EIS will act as pass-through."),
                createBullet("Any response/data/error received from any source/end points of EIS API will be forwarded ‘as is’."),
                createBullet("SBI will provide sign-off on solution document before development begins."),
                createBullet("Any delays due to sign-off or any prioritization activities by business may affect project timelines."),
                createBullet("SBI shall provide access to Production environment."),
                createBullet("Consumer should pass the correct values for the request fields."),
              ]),
          new Paragraph({ text: "" }),
          
          new Paragraph({ children: [new TextRun({ text: "3.2 Enterprise Specifications", bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "SBI EA Team (Enterprise Architecture Team) will provide Enterprise-wide Specifications." }),
          new Paragraph({ text: "" }),

          new Paragraph({ children: [new TextRun({ text: "3.3 Impact/Dependencies on other API development", bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "New Development of the APIs to IIB platform will involve dependencies from all the stakeholders that are either part of consumer to the APIs or End points to the APIs." }),
          new Paragraph({ text: "" }),

          new Paragraph({ children: [new TextRun({ text: "3.4 Business Acceptance Scenario", bold: true })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "TCS will prepare solution documents as per the acceptance criteria provided by SBI. Formal acceptance from the SBI will be obtained after the SBI has reviewed the implemented change and is satisfied with the same." }),
          new Paragraph({ text: "" }),

          // -------------------- 4. REFERENCES --------------------
          ...(!isBank || form.references.length > 0
            ? [
                new Paragraph({ children: [new TextRun({ text: "4. References", bold: true, size: 28 })] }),
                new Paragraph({ text: "" }),
              ]
            : []),
          
          ...(form.references.length > 0
            ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: referenceParagraphs.map(p => new TableCell({ children: [p] }))
                    })
                  ]
                }),
              ]
            : (!isBank ? [new Paragraph({ children: [new TextRun({ text: "None.", italics: true })] })] : [])),
          
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Solution_Document_CR${form.crNumber || "New"}.docx`;
  saveAs(blob, fileName);
}