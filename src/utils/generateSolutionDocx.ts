import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";
import type { SolutionDocFormState } from "../types/solutionDoc";

const NO_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
};

function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: NO_BORDER,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "EEF2FF" },
    children: [
      new Paragraph({ children: [new TextRun({ text, bold: true })] }),
    ],
  });
}

function valueCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: NO_BORDER,
    children: [new Paragraph({ children: [new TextRun(text)] })],
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true })],
  });
}

function subHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true })],
  });
}

function bodyPara(text: string) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun(text)] });
}

function bulletPara(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun(text)],
  });
}

function simpleTable(headers: string[], rows: string[][], widths: number[]) {
  return new Table({
    width: { size: 9350, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map((h, i) => headerCell(h, widths[i])),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((c, i) => valueCell(c || "-", widths[i])),
          }),
      ),
    ],
  });
}

export async function generateSolutionDocx(form: SolutionDocFormState): Promise<void> {
  const scopeRows: string[][] = [
    ["1.", form.apiName || "-", form.apiNameFileName || "-", "-"],
    ...form.apiDocuments.map((d, i) => [
      `${i + 2}.`,
      d.description || "API Specification / CR Document",
      d.fileName || "-",
      "",
    ]),
    [
      `${form.apiDocuments.length + 2}.`,
      "Encryption Document",
      "(reference attached)",
      "For Consuming Channel within SBI",
    ],
  ];

  const destTypeSubtypeParagraphs = (form.destinationTypeSubtypeText || "")
    .split("\n")
    .map((line) => bodyPara(line || " "));

  const referencesContent =
    form.references.length > 0
      ? form.references.map((r) =>
          bulletPara(`${r.description || "Reference document"}${r.fileName ? ` — ${r.fileName}` : ""}`),
        )
      : [bodyPara("None.")];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 } },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: "Solution Document", bold: true })],
          }),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),

          simpleTable(
            ["Field", "Value"],
            [
              ["Module", "Enterprise Integration Services (SBI GITC, CBD Belapur, Navi Mumbai)"],
              ["CR Number", form.crNumber],
              ["Functionality", form.functionality],
              ["Date", form.date],
              ["TCS Associate", form.tcsAssociateName],
              ["SBI Official", form.sbiOfficialName],
            ],
            [2000, 7350],
          ),

          sectionHeading("1. CR Details"),

          subHeading("1.1 Description"),
          bodyPara(form.crDescription || "-"),

          subHeading("1.2 Scope of Change"),
          bodyPara("The following APIs will be developed"),
          simpleTable(["Sl.", "API Name / Item", "Document", "Remarks"], scopeRows, [900, 3500, 2950, 2000]),

          subHeading("1.3 Existing Functionality"),
          bodyPara(
            form.existingFunctionalityStatus === "New"
              ? "This is a New Functionality."
              : `This is an Existing Functionality. ${form.existingFunctionalityDetails}`,
          ),

          subHeading("1.4 Feasibility"),
          bodyPara(
            "The solution proposed in this document is technically feasible subject to assumptions and limitations.",
          ),

          sectionHeading("2. Solution Details"),
          bodyPara(
            "Communication of all APIs will be in encrypted format having a common request/response format, where all fields will be mandatory.",
          ),
          bodyPara(
            "There will be a two API to be consumed by channel to EIS. From Channel to EIS standard gen6 features will be present (payload encryption and source authentication).",
          ),
          bodyPara(
            "EIS will provide a wrapper service having a parent tag EIS_PAYLOAD. The request to be sent to third party will be constructed by the channel (consuming EIS API) from their application. Post decryption of the payload, malicious content check will be performed on the entire payload. If processed successfully, while sending the request to End Point, the contents received in the EIS_PAYLOAD tag it will be encrypted as per mechanism provided by Third Party. Once response is received from Third Party, it will be checked for malicious content both pre and post decryption. If processed successfully, the contents received would be passed on to the request originating application.",
          ),
          bodyPara(
            "As there are multiple schemes and within that there will be multiple scheme-specific services, the routing of the request will be done based on TXN_TYPE (denoting the Scheme Type) and TXN_SUB_TYPE (denoting the Service within the specific scheme)",
          ),
          bodyPara(
            "EIS will maintain a static value of these combinations at its end against which the original URL to be consumed would be present.",
          ),

          subHeading("Destination / Type / Subtype Combinations"),
          ...destTypeSubtypeParagraphs,

          sectionHeading("3. Other Details"),

          subHeading("3.1 Assumptions"),
          bulletPara(`All APIs will have ${form.endpointName || "SBI LIFE"} as end point.`),
          bulletPara("EIS will act as pass-through."),
          bulletPara("Any response/data/error received from any source/end points of EIS API will be forwarded 'as is'."),
          bulletPara("SBI will provide sign-off on solution document before development begins."),
          bulletPara("Any delays due to sign-off or any prioritization activities by business may affect project timelines."),
          bulletPara("SBI shall provide access to Production environment."),
          bulletPara("Consumer should pass the correct values for the request fields."),

          subHeading("3.2 Enterprise Specs."),
          bodyPara("SBI EA Team (Enterprise Architecture Team) will provide Enterprise-wide Specifications."),

          subHeading("3.3 Impact/Dependency"),
          bodyPara(
            "New Development of the APIs to IIB platform will involve dependencies from all the stakeholders that are either part of consumer to the APIs or End points to the APIs.",
          ),

          subHeading("3.4 Business Acceptance"),
          bodyPara(
            "TCS will prepare solution documents as per the acceptance criteria provided by SBI. Formal acceptance from the SBI will be obtained after the SBI has reviewed the implemented change and is satisfied with the same.",
          ),

          sectionHeading("4. References"),
          ...referencesContent,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Solution_Document_CR${form.crNumber || "draft"}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
