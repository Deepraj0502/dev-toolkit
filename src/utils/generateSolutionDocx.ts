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
  PageBreak,
  TabStopType,
  TabStopPosition,
  LeaderType
} from "docx";
import { saveAs } from "file-saver";
import type { SolutionDocFormState } from "../types/solutionDoc";

// --- Base64 Logo Placeholders ---
const TCS_LOGO_BASE64 = "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"; 
const SBI_LOGO_BASE64 = "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";


// --- Helper Functions ---
const createCell = (text: string, bold = false, colSpan = 1, italics = false, alignment = AlignmentType.LEFT) => {
  return new TableCell({
    columnSpan: colSpan,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: alignment,
        children: [new TextRun({ text, bold, italics, size: 22 })], // 11pt Times New Roman
      }),
    ],
  });
};

const createRow = (cells: { text: string; bold?: boolean; colSpan?: number; italics?: boolean; alignment?: AlignmentType}[]) => {
  return new TableRow({
    children: cells.map(c => createCell(c.text, c.bold, c.colSpan, c.italics, c.alignment)),
  });
};

const createTocRow = (title: string, page: string, isSubItem: boolean = false) => {
  return new Paragraph({
    indent: { left: isSubItem ? 400 : 0 },
    tabStops: [
      {
        type: TabStopType.RIGHT,
        position: TabStopPosition.MAX,
        leader: LeaderType.DOT,
      },
    ],
    children: [
      new TextRun({ text: title }),
      new TextRun({ text: `\t${page}` }),
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
  
  // 1. DYNAMIC SCOPE OF CHANGE TABLE
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

  // 2. DOCUMENT CONSTRUCTION
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { size: 22, font: "Times New Roman" }, 
        },
      },
    },
    sections: [
      {
        properties: {},
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
                    children: [
                      new Paragraph({
                        children: [
                          new ImageRun({ 
                            data: Uint8Array.from(atob(TCS_LOGO_BASE64), c => c.charCodeAt(0)), 
                            transformation: { width: 300, height: 150 }, 
                            type: 'png'
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new ImageRun({ 
                            data: Uint8Array.from(atob(SBI_LOGO_BASE64), c => c.charCodeAt(0)), 
                            transformation: { width: 200, height: 100 }, 
                            type: 'png'
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
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Solution Document", bold: true })],
          }),
          new Paragraph({ text: "" }),

          // -------------------- PAGE 1: MODULE / CR INFO --------------------
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            rows: [
              createRow([{ text: "Module", bold: true }, { text: ":", bold: true }, { text: "Enterprise Integration Services (SBI GITC, CBD Belapur, Navi Mumbai)" }]),
              createRow([{ text: "TCS CR", bold: true }, { text: ":", bold: true }, { text: form.crNumber || "" }]),
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
          
          // PAGE BREAK INJECTED HERE
          new Paragraph({ children: [new PageBreak()] }),

          // -------------------- PAGE 2: ABOUT THIS DOCUMENT --------------------
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "About this document", bold: true })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            rows: [
              createRow([{ text: "Purpose", bold: true }, { text: "The document gives a brief description of the functional specifications, technical solution, and assumptions as per the specific requirement raised by the bank under this Change Request." }]),
              createRow([{ text: "Intended Audience", bold: true }, { text: "SBI Development Team, UAT Team and Business Unit" }]),
            ],
          }),
          new Paragraph({ text: "" }),

          // -------------------- PAGE 2: REVISION CONTROL --------------------
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Document Revision or Change Control", bold: true })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([
                { text: "Date", italics: true, alignment: AlignmentType.CENTER }, 
                { text: "Version", italics: true, alignment: AlignmentType.CENTER }, 
                { text: "TCS Associate", italics: true, alignment: AlignmentType.CENTER }, 
                { text: "Reason for Change", italics: true, alignment: AlignmentType.CENTER }
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
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Sign-off", bold: true })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow([
                { text: "Date", italics: true, alignment: AlignmentType.CENTER }, 
                { text: "Position", italics: true, alignment: AlignmentType.CENTER }, 
                { text: "SBI Official", italics: true, alignment: AlignmentType.CENTER }, 
                { text: "Stage", italics: true, alignment: AlignmentType.CENTER }
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
          
          // -------------------- PAGE 2: TABLE OF CONTENTS (EXACT MATCH) --------------------
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
          
          new Paragraph({ text: "1. CR Details", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ children: [new TextRun({ text: "1.1 Description", bold: true })] }),
          new Paragraph({ text: form.crDescription || "EIS wrapper API to consume new services from DPMS" }),
          
          // Add remaining section variables from the prior implementation here...
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Solution_Document_CR${form.crNumber || "New"}.docx`;
  saveAs(blob, fileName);
}
