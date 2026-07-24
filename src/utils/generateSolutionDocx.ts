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
  LeaderType,
} from "docx";
import { saveAs } from "file-saver";
import type { SolutionDocFormState } from "../types/solutionDoc";

// --- Base64 Logo Placeholders ---
const TCS_LOGO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; 
const SBI_LOGO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

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

const createRow = (cells: { text: string; bold?: boolean; colSpan?: number; italics?: boolean; alignment?: AlignmentType }[]) => {
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

  const referenceParagraphs = form.references && form.references.length > 0
    ? form.references.map((ref, index) => {
        const fileText = ref.fileName ? ` - ${ref.fileName}` : "";
        return new Paragraph({ text: `${index + 1}. ${ref.description || "Reference Document"}${fileText}` });
      })
    : [new Paragraph({ text: "None." })];

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
