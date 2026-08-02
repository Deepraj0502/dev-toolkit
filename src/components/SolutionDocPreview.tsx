import React from "react";
import type { SolutionDocFormState } from "../types/solutionDoc";

interface Props {
  form: SolutionDocFormState;
}

// Helper to safely decode Base64 text/JSON/ESQL payloads for live preview
const decodeBase64Text = (base64Str?: string): string => {
  if (!base64Str) return "";
  try {
    const cleanBase64 = base64Str.includes(",") ? base64Str.split(",")[1] : base64Str;
    return atob(cleanBase64);
  } catch (e) {
    return "[Unable to decode text content — Binary or Encoded Payload]";
  }
};

export default function SolutionDocPreview({ form }: Props) {
  const isBank = form.documentType === "Bank";

  // Build Scope of Change rows mapping precisely to backend schema
  const scopeRows = [
    {
      sl: "1.",
      name: form.apiName || "(API Name)",
      type: isBank ? "EIS -CBS" : "",
      status: "New",
      swagger: form.apiNameFileName ? `📄\n${form.apiNameFileName}` : "-",
      remarks: "",
    },
    ...(form.apiDocuments || []).map((d, i) => ({
      sl: `${i + 2}.`,
      name: d.description || "API Specification / CR Document",
      type: "",
      status: "",
      swagger: d.fileName ? `📄\n${d.fileName}` : "-",
      remarks: "",
    })),
    {
      sl: `${(form.apiDocuments?.length || 0) + 2}.`,
      name: "Encryption Document",
      type: "",
      status: "",
      swagger: "📄\nEIS_Encryption Specification for gen",
      remarks: "For Consuming Channel within SBI",
    },
  ];

  // Gather all attachments for the Appendix Live Preview
  const allAttachments = [
    ...(form.apiNameFileBase64
      ? [
          {
            fileName: form.apiNameFileName || "Main_API_Spec",
            fileBase64: form.apiNameFileBase64,
            description: "Main API Scope Specification",
          },
        ]
      : []),
    ...(form.apiDocuments || [])
      .filter((d) => d.fileBase64)
      .map((d) => ({
        fileName: d.fileName || "API_Doc",
        fileBase64: d.fileBase64!,
        description: d.description || "API Document",
      })),
    ...(form.references || [])
      .filter((r) => r.fileBase64)
      .map((r) => ({
        fileName: r.fileName || "Ref_Doc",
        fileBase64: r.fileBase64!,
        description: r.description || "Reference Specification",
      })),
  ];

  // Split sample text to preserve indentation and formatting
  const sampleTextLines = (form.destinationTypeSubtypeText || "").split("\n");

  return (
    <div className="rounded-none border border-slate-400 bg-white text-black p-8 sm:p-12 shadow-2xl overflow-y-auto h-full font-serif text-[14px] leading-relaxed select-text max-w-4xl mx-auto" style={{ fontFamily: "Cambria, 'Times New Roman', serif" }}>
      
      {/* -------------------- HEADER & LOGOS -------------------- */}
      <div className="flex items-center justify-between pb-6 mb-6 font-sans">
        
        {/* TCS 50 Base64 Logo */}
        <div className="flex items-center w-[84%]">
          <img
            src={"data:image/png;base64,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"}
            alt="TCS 50 Logo"
            className="w-full h-full w-auto object-contain select-none"
          />
        </div>

        {/* SBI Base64 Logo */}
        <div className="flex items-center w-full">
          <img
            src={"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVwAAACtCAYAAAD8r8ckAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAEP6SURBVHhe7Z0HYBzF3cWfdLpTb5ZtuTdcKKaaYKrpPTYQU0w3mBISWiB8lBACIQQCGDAdjAm9OHRjemjGgOnYEBsX3Kts9Xanu9P3f7Mz55UQLtLd6mTPT5qbPjs7u/t2dnZ3NuXPYx9qLFlVg1SkwGKxWCzxJ4pGdOmWjZRxR9/V+NbUn5CONB1lsVgslngSRBhHHD0EKeeOnND43ynzEYBPR1ksFoslnoQQwcEjByJV+y0Wi8WSYKzgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDzCCq7FYrF4hBVci8Vi8QgruBaLxeIRVnAtFovFI6zgWiwWi0dYwbVYLBaPsIJrsVgsHmEF12KxWDwB+H84UUl7RRh2wgAAAABJRU5ErkJggg=="}
            alt="SBI Logo"
            className="w-full h-full w-auto object-contain select-none"
          />
        </div>

      </div>

      <h1 className="text-2xl font-bold text-center mb-6">
        Solution Document
      </h1>

      {/* -------------------- MODULE / CR INFO TABLE -------------------- */}
      <table className="w-full border-collapse mb-6 text-[13px]">
        <tbody>
          {[
            ["Module", ":", "Enterprise Integration Services (SBI GITC, CBD Belapur, Navi Mumbai)"],
            [isBank ? "TCS CR" : "CR Number", ":", form.crNumber || ""],
            ["Demand No.", ":", form.functionality || ""],
          ].map(([k, sep, v]) => (
            <tr key={k}>
              <td className="font-bold py-1 w-28 align-top">{k}</td>
              <td className="font-bold py-1 w-4 align-top">{sep}</td>
              <td className="py-1 align-top">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* -------------------- LEGAL NOTICE -------------------- */}
      <div className="my-6 text-[13px] text-justify space-y-3 leading-5">
        <p className="font-bold text-center">Notice</p>
        <p className="italic">
          This document is confidential and is given to you in confidence. You may only use the information it contains
          for the purpose it was provided. Access must be restricted to your employees and professional advisers who
          need access for the specified purpose. You must not otherwise disclose or use the information it contains
          except as required by law or where that information has lawfully become public knowledge.
        </p>
        <p className="italic">
          This is a controlled document. Unauthorised access, copying, replication or usage for a purpose other than
          for which it is intended, are prohibited.
        </p>
        <p className="italic">
          All trademarks that appear in the document have been used for identification purposes only and belong to their respective companies.
        </p>
      </div>

      <div className="border-t border-slate-300 my-8" />

      {/* -------------------- ABOUT THIS DOCUMENT -------------------- */}
      <h2 className="text-base font-bold text-center mb-4">
        About this document
      </h2>
      <table className="w-full border-collapse mb-8 text-[13px]">
        <tbody>
          <tr>
            <td className="font-bold py-2 w-36 align-top">Purpose</td>
            <td className="py-2 align-top">
              The document gives a brief description of the functional specifications, technical solution{isBank ? "" : ","} and
              assumptions as per the specific requirement raised by the bank under this Change Request.
            </td>
          </tr>
          <tr>
            <td className="font-bold py-2 w-36 align-top">Intended Audience</td>
            <td className="py-2 align-top">SBI Development Team, UAT Team and Business Unit</td>
          </tr>
        </tbody>
      </table>

      {/* -------------------- REVISION & SIGN-OFF -------------------- */}
      <h3 className="text-[13px] font-bold mt-6 mb-2 text-center">
        Document Revision or Change Control
      </h3>
      <table className="w-full border-collapse border border-black mb-8 text-[13px] text-center">
        <thead>
          <tr>
            <th className="border border-black p-2 italic font-bold">Date</th>
            <th className="border border-black p-2 italic font-bold">Version</th>
            <th className="border border-black p-2 italic font-bold">TCS Associate</th>
            <th className="border border-black p-2 italic font-bold">Reason for Change</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2">{form.date || ""}</td>
            <td className="border border-black p-2">1.0</td>
            <td className="border border-black p-2">{form.tcsAssociateName || ""}</td>
            <td className="border border-black p-2">Preparation of solution document</td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-[13px] font-bold mt-6 mb-2 text-center">Sign-off</h3>
      <table className="w-full border-collapse border border-black mb-8 text-[13px] text-center">
        <thead>
          <tr>
            <th className="border border-black p-2 italic font-bold">Date</th>
            <th className="border border-black p-2 italic font-bold">Position</th>
            <th className="border border-black p-2 italic font-bold">SBI Official</th>
            <th className="border border-black p-2 italic font-bold">Stage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2">{form.date || ""}</td>
            <td className="border border-black p-2">Project Manager</td>
            <td className="border border-black p-2">{form.sbiOfficialName || ""}</td>
            <td className="border border-black p-2">Solution Document Approval</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-slate-300 my-8" />

      {/* -------------------- CONTENTS & ABBREVIATIONS -------------------- */}
      <div className="mb-8 text-[13px]">
        <h3 className="font-bold text-center mb-4">Contents</h3>
        <div className="space-y-1.5 font-bold">
          <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5"><span>1. CR Details</span><span>3</span></div>
          <div className="flex justify-between pl-6 border-b border-dotted border-slate-300 pb-0.5 font-normal"><span>1.1 Description</span><span>3</span></div>
          <div className="flex justify-between pl-6 border-b border-dotted border-slate-300 pb-0.5 font-normal"><span>1.2 Scope of Change</span><span>3</span></div>
          <div className="flex justify-between pl-6 border-b border-dotted border-slate-300 pb-0.5 font-normal"><span>1.3 Existing Functionality</span><span>3</span></div>
          <div className="flex justify-between pl-6 border-b border-dotted border-slate-300 pb-0.5 font-normal"><span>1.4 Feasibility</span><span>3</span></div>
          <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5"><span>2. Solution Details</span><span>4</span></div>
          <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5"><span>3. Other Details</span><span>11</span></div>
          <div className="flex justify-between pl-6 border-b border-dotted border-slate-300 pb-0.5 font-normal"><span>3.1 Assumptions</span><span>11</span></div>
          <div className="flex justify-between pl-6 border-b border-dotted border-slate-300 pb-0.5 font-normal"><span>3.2 Enterprise Specs.</span><span>11</span></div>
          <div className="flex justify-between pl-6 border-b border-dotted border-slate-300 pb-0.5 font-normal"><span>3.3 Impact/Dependency</span><span>11</span></div>
          <div className="flex justify-between pl-6 border-b border-dotted border-slate-300 pb-0.5 font-normal"><span>3.4 Business Acceptance</span><span>11</span></div>
          <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5"><span>4. References</span><span>12</span></div>
          {allAttachments.length > 0 && (
            <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5"><span>5. Appendix: Attached Specifications</span><span>13</span></div>
          )}
        </div>
      </div>

      <h3 className="text-[13px] font-bold mb-3 text-center">List of abbreviations</h3>
      <table className="w-full border-collapse border border-black mb-8 text-[12px]">
        <tbody>
          {[
            ["1", "YONO", ":", "You Only Need One", "10", "VPS", ":", "Vendor Payment System"],
            ["2", "GCC", ":", "Green Channel Counter", "11", "POS", ":", "Point of Sale"],
            ["3", "FE", ":", "Front End", "12", "GRC", ":", "Green Remit Card"],
            ["4", "CBS", ":", "Core Banking System", "13", "SSK", ":", "Self Service Kiosk"],
            ["5", "LOS", ":", "Loan Origination System", "14", "AOK", ":", "Account Opening Kiosk"],
            ["6", "RLMS", ":", "Retail Loan Management System", "15", "MFK", ":", "Multi-Function Kiosk"],
            ["7", "GBSS", ":", "Govt. Business Software Solution", "16", "TF", ":", "Trade Finance"],
            ["8", "INB", ":", "Internet Banking", "17", "MR", ":", "Multi Remittance"],
            ["9", "ATM", ":", "Automated Teller Machine", "18", "HRMS", ":", "Human Resource Mgmt. System"],
          ].map(([n1, k1, s1, v1, n2, k2, s2, v2]) => (
            <tr key={n1}>
              <td className="border border-black font-bold text-center p-1 w-6">{n1}</td>
              <td className="border border-black font-bold p-1 w-16">{k1}</td>
              <td className="border border-black text-center p-1 w-4">{s1}</td>
              <td className="border border-black p-1">{v1}</td>
              <td className="border border-black font-bold text-center p-1 w-6">{n2}</td>
              <td className="border border-black font-bold p-1 w-16">{k2}</td>
              <td className="border border-black text-center p-1 w-4">{s2}</td>
              <td className="border border-black p-1">{v2}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-slate-300 my-8" />

      {/* -------------------- 1. CR DETAILS -------------------- */}
      <h2 className="text-base font-bold mt-8 mb-4">
        1 CR Details
      </h2>

      <div className="pl-6 mb-6">
        <p className="mb-2 whitespace-pre-wrap">{form.crDescription || "EIS wrapper API to consume new services from DPMS"}</p>
        {!isBank && (
          <div className="pl-4 space-y-1">
            <p>1. Case Create API (CRM -&gt; EIS -&gt; SBI LIFE)</p>
            <p>2. Case Update API (SBI LIFE -&gt; EIS -&gt; CRM)</p>
          </div>
        )}
      </div>

      <h2 className="text-base font-bold mt-6 mb-2">2. Scope of Change</h2>
      <p className="pl-6 mb-4">The following APIs will be developed{isBank ? "." : ""}</p>
      
      <table className="w-full border-collapse border border-black text-[13px] mb-6 text-center">
        <thead>
          <tr>
            <th className="border border-black p-2 font-bold w-10">{isBank ? "Sr.no" : "SL"}</th>
            <th className="border border-black p-2 font-bold">API Name</th>
            <th className="border border-black p-2 font-bold w-16">Type</th>
            <th className="border border-black p-2 font-bold w-24">New/{isBank ? "\n" : ""}Existing</th>
            <th className="border border-black p-2 font-bold">Swagger</th>
            <th className="border border-black p-2 font-bold">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {scopeRows.map((r, i) => (
            <tr key={i}>
              <td className="border border-black p-2 text-center">{r.sl}</td>
              <td className="border border-black p-2 text-left">{r.name}</td>
              <td className="border border-black p-2">{r.type || ""}</td>
              <td className="border border-black p-2">{r.status || ""}</td>
              <td className="border border-black p-2 whitespace-pre-line text-center">{r.swagger}</td>
              <td className="border border-black p-2 text-left">{r.remarks || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-base font-bold mt-6 mb-1">3 Existing Functionality</h2>
      <p className="pl-6 mb-6">
        {form.existingFunctionalityStatus === "New"
          ? (isBank ? "The functionality is new." : "This is a New Functionality.")
          : `${form.existingFunctionalityDetails || ""}`}
      </p>

      <h2 className="text-base font-bold mt-6 mb-1">4 Feasibility</h2>
      <p className="pl-6 mb-8">
        The solution proposed in this document is technically feasible subject to assumptions and limitations.
      </p>

      <div className="border-t border-slate-300 my-8" />

      {/* -------------------- 2. SOLUTION DETAILS -------------------- */}
      <h2 className="text-base font-bold mt-8 mb-4">
        2 Solution Details
      </h2>
      <div className="space-y-4 text-[14px] mb-6 whitespace-pre-wrap">
        <p>
          Communication of all APIs will be in encrypted format having a common request/response format, where all
          fields will be mandatory.
        </p>
        {isBank && form.solutionDetailsDescription && (
          <p>{form.solutionDetailsDescription}</p>
        )}
        {!isBank && (
          <>
            <p>
              There will be a two API to be consumed by channel to EIS. From Channel to EIS standard gen6 features will be present (payload encryption and source authentication).
            </p>
            <p>
              EIS will provide a wrapper service having a parent tag EIS_PAYLOAD. The request to be sent to third party will
              be constructed by the channel (consuming EIS API) from their application. Post decryption of the payload,
              malicious content check will be performed on the entire payload. If processed successfully, while sending the
              request to End Point, the contents received in the EIS_PAYLOAD tag it will be encrypted as per mechanism
              provided by Third Party. Once response is received from Third Party, it will be checked for malicious content
              both pre and post decryption. If processed successfully, the contents received would be passed on to the
              request originating application.
            </p>
            <p>
              As there are multiple schemes and within that there will be multiple scheme-specific services, the routing of
              the request will be done based on TXN_TYPE (denoting the Scheme Type) and TXN_SUB_TYPE (denoting the Service
              within the specific scheme)
            </p>
            <p>
              EIS will maintain a static value of these combinations at its end against which the original URL to be consumed would be present.
            </p>
            <p>Sample Example:</p>
          </>
        )}
      </div>

      {!isBank && (
        <div className="pl-6 font-mono text-[13px] space-y-1 mb-8">
          {sampleTextLines.map((line, idx) => (
            <p key={idx} className="whitespace-pre">{line}</p>
          ))}
        </div>
      )}

      {/* --- ENCRYPTED REQUEST FORMAT --- */}
      <h3 className="font-bold mt-6 mb-2">Encrypted Request format:</h3>
      <table className="w-full border-collapse border border-black mb-8 text-[13px]">
        <thead>
          <tr className="text-center italic font-bold">
            <th className="border border-black p-2 w-10">Sl</th>
            <th className="border border-black p-2 w-48">Field Name</th>
            <th className="border border-black p-2" colSpan={2}>Field Description</th>
            <th className="border border-black p-2 w-16">Length</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2 text-center" rowSpan={isBank ? 7 : 8}>1.</td>
            <td className="border border-black p-2" rowSpan={isBank ? 7 : 8}>
              {isBank ? "REQUEST_REFERENCE_NUMBR" : "REQUEST_REFERENCE_NUMBER"}
            </td>
            <td className="border border-black p-2" colSpan={2}>
              {isBank ? "Format- SBI-XX-YY-DDD-HHmmssSSS-NNNNNN" : "Format : SBI-XX-YY-DDD-HH-mm-ssSSS-NNNNNN"}
            </td>
            <td className="border border-black p-2 text-center" rowSpan={isBank ? 7 : 8}>25</td>
          </tr>
          <tr className="text-center font-bold">
            <td className="border border-black p-1.5 w-24">SBI</td>
            <td className="border border-black p-1.5 text-left font-normal">Mandatory</td>
          </tr>
          <tr>
            <td className="border border-black p-2 text-center font-bold">XX</td>
            <td className="border border-black p-2">
              2-character AO identifier. YA for Yono App, YB for Yono Branch. Providing correct identifier is required
              as certificate will be mapped to this for encryption, decryption, source authentication
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2 text-center font-bold">YY{isBank ? "" : <><br /><br />DDD</>}</td>
            <td className="border border-black p-2">
              Julian day, where first two characters is the year and remaining three characters is day of the year. {isBank ? "\n" : ""}Eg{isBank ? ":" : " :"} 26-Feb-2020 will be represented as 20057
            </td>
          </tr>
          {isBank && (
            <tr>
              <td className="border border-black p-2 text-center font-bold">DDD</td>
              <td className="border border-black p-2"></td>
            </tr>
          )}
          <tr>
            <td className="border border-black p-2 text-center font-bold">HHmmssSSS</td>
            <td className="border border-black p-2">
              Origination time of request in hours, minutes, seconds and milliseconds.
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2 text-center font-bold">NNNNNN</td>
            <td className="border border-black p-2">Running sequence</td>
          </tr>
          {!isBank && (
            <tr>
              <td className="border border-black p-2 text-[12px]" colSpan={2}>
                The date and time of origination (if provided properly) may be used to track any delay of request receipt
                at EIS for the purposes of reporting issues pertaining to network delay. It must be ensured that the servers
                are synched with NTP servers.
              </td>
            </tr>
          )}
          {isBank && (
            <tr>
              <td className="border border-black p-2 text-[12px]" colSpan={5}>
                The date and time of origination (if provided properly) may be used to track any delay of request receipt at EIS for the purposes of reporting issues pertaining to network delay. It must be ensured that the servers are synched with NTP servers.
              </td>
            </tr>
          )}
          <tr>
            <td className="border border-black p-2 text-center">2.</td>
            <td className="border border-black p-2">REQUEST</td>
            <td className="border border-black p-2" colSpan={2}>
              Payload encrypted request. Please refer plain request format for details.
            </td>
            <td className="border border-black p-2 text-center">String</td>
          </tr>
          <tr>
            <td className="border border-black p-2 text-center">3.</td>
            <td className="border border-black p-2">DIGI_SIGN</td>
            <td className="border border-black p-2" colSpan={2}>Digital Signature</td>
            <td className="border border-black p-2 text-center">String</td>
          </tr>
        </tbody>
      </table>

      {/* --- ENCRYPTED RESPONSE FORMAT --- */}
      <h3 className="font-bold mt-6 mb-2">Encrypted Response format:</h3>
      <table className="w-full border-collapse border border-black mb-8 text-[13px]">
        <thead>
          <tr className="text-center italic font-bold">
            <th className="border border-black p-2 w-14">{isBank ? "Sl" : "SR NO"}</th>
            <th className="border border-black p-2 w-52">Field Name</th>
            <th className="border border-black p-2">Field Description</th>
            <th className="border border-black p-2 w-16">Length</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["1.", "REQUEST_REFERENCE_NUMBER", "Reference number of the request which is responded.", "25"],
            ["2.", "RESPONSE", "Payload encrypted response. Please refer plan response format for details.", "String"],
            ["3.", "RESPONSE_DATE", "Response date and time stamp in format “dd-MM-yyyy HH:mm:ss”", "19"],
            ["4.", "DIGI_SIGN", "Digital Signature", "String"],
          ].map(([sl, fn, fd, len]) => (
            <tr key={sl}>
              <td className="border border-black p-2 text-center">{sl}</td>
              <td className="border border-black p-2">{fn}</td>
              <td className="border border-black p-2">{fd}</td>
              <td className="border border-black p-2 text-center">{len}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- DYNAMIC API NAME HEADER (IF BANK) --- */}
      {isBank && form.apiName && (
        <p className="font-bold mb-2">{form.apiName}</p>
      )}

      {/* --- DYNAMIC PLAIN REQUEST & RESPONSE SCHEMAS --- */}
      {isBank ? (
        /* Bank Multi-Service Iteration */
        (form.bankServices || []).map((service, sIdx) => (
          <div key={service.id || sIdx} className="mb-8 border-l-2 border-indigo-900 pl-4 my-6">
            <h3 className="font-bold text-indigo-950 text-base border-b border-slate-300 pb-1 mb-4 uppercase tracking-wide">
              Service #{sIdx + 1}: {service.serviceName || "(Unnamed Service)"}
            </h3>

            <h4 className="font-bold text-slate-800 mt-4 mb-2">Plain Request:</h4>
            <table className="w-full border-collapse border border-black mb-6 text-[13px] text-center">
              <thead>
                <tr className="italic font-bold bg-slate-100">
                  <th className="border border-black p-2 w-12 whitespace-pre">Sl</th>
                  <th className="border border-black p-2 w-36">Field Name</th>
                  <th className="border border-black p-2 text-left">Field Description</th>
                  <th className="border border-black p-2 w-14">Length</th>
                  <th className="border border-black p-2 w-20">Data Type</th>
                  <th className="border border-black p-2 w-24">Mandatory/Non-Mandatory</th>
                </tr>
              </thead>
              <tbody>
                {(service.requestFields || []).map((f, i) => (
                  <React.Fragment key={f.id || i}>
                    <tr className={f.fieldType === "Array" ? "bg-indigo-50/30" : ""}>
                      <td className="border border-black p-2">{i + 1}</td>
                      <td className="border border-black p-2 text-left font-mono font-bold text-indigo-900">{f.name || "-"}</td>
                      <td className="border border-black p-2 text-left">{f.description || "-"}</td>
                      <td className="border border-black p-2 font-bold">{f.length || "-"}</td>
                      <td className="border border-black p-2 font-mono">{f.dataType || "String"}</td>
                      <td className={`border border-black p-2 font-semibold ${f.mandatory === "Mandatory" ? "text-amber-800" : "text-slate-500"}`}>
                        {f.mandatory || "Mandatory"}
                      </td>
                    </tr>
                    {f.fieldType === "Array" && f.children?.map((child, cIdx) => (
                      <tr key={child.id || `${f.id}-child-${cIdx}`} className="bg-slate-50/50">
                        <td className="border border-black p-2 text-slate-500 text-[11px]">{i + 1}.{cIdx + 1}</td>
                        <td className="border border-black p-2 text-left font-mono font-bold text-indigo-700 pl-6">
                          <span className="text-indigo-300 mr-1">↳</span>{child.name || "-"}
                        </td>
                        <td className="border border-black p-2 text-left">{child.description || "-"}</td>
                        <td className="border border-black p-2 font-bold">{child.length || "-"}</td>
                        <td className="border border-black p-2 font-mono">{child.dataType || "String"}</td>
                        <td className={`border border-black p-2 font-semibold ${child.mandatory === "Mandatory" ? "text-amber-800" : "text-slate-500"}`}>
                          {child.mandatory || "Mandatory"}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {(!service.requestFields || service.requestFields.length === 0) && (
                  <tr>
                    <td colSpan={6} className="border border-black p-3 italic text-slate-400">
                      No request fields defined for this service.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <h4 className="font-bold text-slate-800 mt-4 mb-2">Plain Response:</h4>
            <table className="w-full border-collapse border border-black mb-6 text-[13px] text-center">
              <thead>
                <tr className="italic font-bold bg-slate-100">
                  <th className="border border-black p-2 w-12 whitespace-pre">Sl</th>
                  <th className="border border-black p-2 w-36">Field Name</th>
                  <th className="border border-black p-2 text-left">Field Description</th>
                  <th className="border border-black p-2 w-14">Length</th>
                  <th className="border border-black p-2 w-20">Data Type</th>
                  <th className="border border-black p-2 w-24">Mandatory/Non-Mandatory</th>
                </tr>
              </thead>
              <tbody>
                {(service.responseFields || []).map((f, i) => (
                  <React.Fragment key={f.id || i}>
                    <tr className={f.fieldType === "Array" ? "bg-indigo-50/30" : ""}>
                      <td className="border border-black p-2">{i + 1}.</td>
                      <td className="border border-black p-2 text-left font-mono font-bold text-indigo-900">{f.name || "-"}</td>
                      <td className="border border-black p-2 text-left">{f.description || "-"}</td>
                      <td className="border border-black p-2 font-bold">{f.length || "-"}</td>
                      <td className="border border-black p-2 font-mono">{f.dataType || "String"}</td>
                      <td className={`border border-black p-2 font-semibold ${f.mandatory === "Mandatory" ? "text-amber-800" : "text-slate-500"}`}>
                        {f.mandatory || "Mandatory"}
                      </td>
                    </tr>
                    {f.fieldType === "Array" && f.children?.map((child, cIdx) => (
                      <tr key={child.id || `${f.id}-child-${cIdx}`} className="bg-slate-50/50">
                        <td className="border border-black p-2 text-slate-500 text-[11px]">{i + 1}.{cIdx + 1}</td>
                        <td className="border border-black p-2 text-left font-mono font-bold text-indigo-700 pl-6">
                          <span className="text-indigo-300 mr-1">↳</span>{child.name || "-"}
                        </td>
                        <td className="border border-black p-2 text-left">{child.description || "-"}</td>
                        <td className="border border-black p-2 font-bold">{child.length || "-"}</td>
                        <td className="border border-black p-2 font-mono">{child.dataType || "String"}</td>
                        <td className={`border border-black p-2 font-semibold ${child.mandatory === "Mandatory" ? "text-amber-800" : "text-slate-500"}`}>
                          {child.mandatory || "Mandatory"}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {(!service.responseFields || service.responseFields.length === 0) && (
                  <tr>
                    <td colSpan={6} className="border border-black p-3 italic text-slate-400">
                      No response fields defined for this service.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        /* Third-Party Single Schema Render */
        <>
          <h3 className="font-bold mt-6 mb-2">Plain Request:</h3>
          <table className="w-full border-collapse border border-black mb-8 text-[13px] text-center">
            <thead>
              <tr className="italic font-bold bg-slate-100">
                <th className="border border-black p-2 w-12 whitespace-pre">SR{"\n"}NO</th>
                <th className="border border-black p-2 w-36">Field Name</th>
                <th className="border border-black p-2 text-left">Field Description</th>
                <th className="border border-black p-2 w-14">Length</th>
                <th className="border border-black p-2 w-24 whitespace-pre">Mandatory/{"\n"}Non{"\n"}Mandatory</th>
                <th className="border border-black p-2 w-20">Data type</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1", "SOURCE_ID", "Unique code assigned to identify from which channel the request is initiated", "-", "Mandatory", "String"],
                ["2", "DESTINATION", "Destination where the API call will be routed", "-", "Mandatory", "String"],
                ["3", "TXN_TYPE", "Type of Scheme", "-", "Mandatory", "String"],
                ["4", "TXN_SUB_TYPE", "Type of Service", "-", "Mandatory", "String"],
                ["5", "EIS_PAYLOAD", "Third Party Request will be sent in this field to Destination without any modifications.", "-", "Mandatory", "String"],
              ].map(([sl, fn, fd, len, man, dt]) => (
                <tr key={sl}>
                  <td className="border border-black p-2 font-bold">{sl}</td>
                  <td className="border border-black p-2 text-left font-mono font-bold text-indigo-900">{fn}</td>
                  <td className="border border-black p-2 text-left">{fd}</td>
                  <td className="border border-black p-2 font-bold">{len}</td>
                  <td className="border border-black p-2 font-semibold text-amber-800">{man}</td>
                  <td className="border border-black p-2 font-mono">{dt}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="font-bold mt-6 mb-2">Plain Response:</h3>
          <table className="w-full border-collapse border border-black mb-8 text-[13px] text-center">
            <thead>
              <tr className="italic font-bold bg-slate-100">
                <th className="border border-black p-2 w-12 whitespace-pre">SR{"\n"}NO</th>
                <th className="border border-black p-2 w-36">Field Name</th>
                <th className="border border-black p-2 text-left">Field Description</th>
                <th className="border border-black p-2 w-14">Length</th>
                <th className="border border-black p-2 w-24 whitespace-pre">Mandatory/{"\n"}Non{"\n"}Mandatory</th>
                <th className="border border-black p-2 w-20">Data type</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1", "RESPONSE_STATUS", "0: SUCCESS else FAILURE", "1", "Mandatory", "String"],
                ["2", "ERROR_CODE", "Error Code (in case of transaction failure)", "5", "Mandatory", "String"],
                ["3", "ERROR_DESCRIPTION", "Error Description (in case of transaction failure)", "100", "Mandatory", "String"],
                ["4", "EIS_RESPONSE", "Third party Response Received from Destination will be sent in the field without any modifications.", "-", "Non-Mandatory", "String"],
              ].map(([sl, fn, fd, len, man, dt]) => (
                <tr key={sl}>
                  <td className="border border-black p-2 font-bold">{sl}</td>
                  <td className="border border-black p-2 text-left font-mono font-bold text-indigo-900">{fn}</td>
                  <td className="border border-black p-2 text-left">{fd}</td>
                  <td className="border border-black p-2 font-bold">{len}</td>
                  <td className={`border border-black p-2 font-semibold ${man === "Mandatory" ? "text-amber-800" : "text-slate-500"}`}>{man}</td>
                  <td className="border border-black p-2 font-mono">{dt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* --- ERROR CODES --- */}
      <h3 className="font-bold mt-8 mb-2 text-base">Error Code and Error Description in Detail:</h3>
      <table className="w-full border-collapse border border-black mb-8 text-[13px]">
        <thead>
          <tr className="font-bold text-center">
            <th className="border border-black p-2 w-24">Error Codes</th>
            <th className="border border-black p-2 w-64">Error Description</th>
            <th className="border border-black p-2">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["SI569", "BRANCH/TELLER MISSING", "API parameter missing (applicable for missing Branch and Teller configuration)"],
            ["SI570", "BIT MAPPING NOT CONFIGURED", "API configuration missing (applicable for enquiry APIs)"],
            ["SI014", "SI500|EIS APPLICATION TIMEOUT", "Timeout while calling SYS from EXP"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "connection refused"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "no connections available acquired"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "Failed to finish connect operation"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "detected a SOCKET error whilst invoking a web service"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "503 Service Unavailable"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "404 Not Found"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "401 Unauthorised"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "500 Internal Server Error"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "Connection reset by peer"],
            ["SI002", "SI510|EIS APPLICATION INACTIVE", "unhandled exception while calling SYS from EXP"],
            ["SI011", "SI520|INCORRECT DATA IN <TAG_NAME>", "Invalid Data for <dynamic field name>, ParserException xmlnsc"],
            ["SI011", "SI520|MISSING FIELD <TAG_NAME>", "Missing field (field name will not be provided), ParserException xmlnsc"],
            ["SI011", "SI520|EXCESS FIELD PROVIDED <TAG_NAME>", "Excess field provided (field name will not be provided), No root element was found while writing the XML message"],
            ["SI011", "SI520|PARSING EXCEPTION", "5706-JSON writing errors have occurred"],
            ["SI011", "SI520|CASTING EXCEPTION", "CastException"],
            ["SI001", "SI530|INCORRECT REQUEST FORMATION", "Issues With Request String"],
            ["SI001", "SI530|DATA PROCESSING FAILED", "Issues with encryption library invoke"],
            ["SI001", "SI599|UNABLE TO PROCESS DUE TO TECHNICAL ERROR", "Any other unhandled error"],
          ].map(([ec, ed, m], idx) => (
            <tr key={idx}>
              <td className="border border-black p-2 text-center">{ec}</td>
              <td className="border border-black p-2">{ed}</td>
              <td className="border border-black p-2 whitespace-pre-line">{m}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="font-bold mt-6 mb-2 text-base">
        Error Code and Error Description in Detail for Gateway with response status {isBank ? "" : "- 2:"}
      </h3>
      <table className="w-full border-collapse border border-black mb-8 text-[13px]">
        <thead>
          <tr className="font-bold text-center">
            <th className="border border-black p-2 w-24">Error Codes</th>
            <th className="border border-black p-2 w-64">Error Description</th>
            <th className="border border-black p-2">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {isBank ? (
            [
              ["SI011", "Unauthorized", "Describes the invalid/missing access token"],
              ["SI011", "The requested URL was not found on this server", "Describes URL is not hosted on DPG"],
              ["SI011", "Unable to process due to validation error!!", "Describes the request decryption fails at EIS ends"],
              ["SI051", "Unauthorized", "Describes EIS unable to authenticate the sender."],
              ["SI001", "-", "Dynamic in nature which will be represent error as per the exception occurred."],
            ].map(([ec, ed, m], idx) => (
              <tr key={idx}>
                <td className="border border-black p-2 text-center">{ec}</td>
                <td className="border border-black p-2">{ed}</td>
                <td className="border border-black p-2">{m}</td>
              </tr>
            ))
          ) : (
            [
              ["SI411", "RSA decryption Failed", "Unauthorized : RSA decryption Failed"],
              ["SI401", "BAD REQUEST", "BAD request received"],
              ["SI412", "AES Decryption Failed", "Unauthorized : AES decryption Failed"],
              ["SI402", 'Payload do not have proper JSON or header "application/JSON" is not present', "Unsupported Media Type."],
              ["SI404", "URL not found in router file", "The requested URL was not found on this server!!"],
              ["SI413", "RSA signature not verified", "DIGI-SIGN verification failed"],
              ["SI499", "Unhandled exception in MPGW", "<DPG error occurred>"],
              ["SI414", "HASH did not verify", "Hash verification failed"],
            ].map(([ec, ed, m], idx) => (
              <tr key={idx}>
                <td className="border border-black p-2 text-center">{ec}</td>
                <td className="border border-black p-2">{ed}</td>
                <td className="border border-black p-2">{m}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="border-t border-slate-300 my-8" />

      {/* -------------------- 3. OTHER DETAILS -------------------- */}
      <h2 className="text-base font-bold mt-8 mb-4">
        3{isBank ? "" : "."} Other Details
      </h2>

      <h3 className="font-bold mt-4 mb-2">3.1 Assumptions</h3>
      <p className="mb-3">
        The following considerations and assumptions have been made while defining the solution, estimating effort and
        drawing up the work plan and schedules for all the services intended to be provided as part of this proposal.
      </p>
      <ul className="list-disc pl-10 space-y-1 mb-6">
        {isBank ? (
          <>
            <li>All APIs will have CBS bancs port as endpoint.</li>
            <li>EIS will act as a middle-ware</li>
            <li>SBI will provide sign-off on solution document before development begins.</li>
            <li>Any delays due to sign-off or any prioritization activities by business may affect project timelines.</li>
            <li>SBI shall provide access to Production environment.</li>
            <li>Consumer should pass the correct values for the request fields.</li>
            <li>Spaces are being trimmed in response.</li>
            <li>Numeric values will be left padded with zero and alphanumeric and alphabet values will be right padded with space</li>
          </>
        ) : (
          <>
            <li>All APIs will have {form.endpointName || "SBI LIFE"} as end point.</li>
            <li>EIS will act as pass-through.</li>
            <li>Any response/data/error received from any source/end points of EIS API will be forwarded ‘as is’.</li>
            <li>SBI will provide sign-off on solution document before development begins.</li>
            <li>Any delays due to sign-off or any prioritization activities by business may affect project timelines.</li>
            <li>SBI shall provide access to Production environment.</li>
            <li>Consumer should pass the correct values for the request fields.</li>
          </>
        )}
      </ul>

      <h3 className="font-bold mt-6 mb-1">3.2 Enterprise Specifications</h3>
      <p className="mb-6">
        SBI EA Team (Enterprise Architecture Team) will provide Enterprise-wide Specifications.
      </p>

      <h3 className="font-bold mt-6 mb-1">3.3 Impact/Dependencies on other API development</h3>
      <p className="mb-6">
        New Development of the APIs to IIB platform will involve dependencies from all the stakeholders that are
        either part of consumer to the APIs or End points to the APIs.
      </p>

      <h3 className="font-bold mt-6 mb-1">3.4 Business Acceptance Scenario</h3>
      <p className="mb-8">
        TCS will prepare solution documents as per the acceptance criteria provided by SBI. Formal acceptance from the
        SBI will be obtained after the SBI has reviewed the implemented change and is satisfied with the same.
      </p>

      {/* -------------------- 4. REFERENCES -------------------- */}
      {(!isBank || form.references.length > 0) && (
        <h2 className="text-base font-bold mt-8 mb-4">
          4. References
        </h2>
      )}
      {form.references.length > 0 ? (
        <table className="w-full border-collapse border border-black mb-8 text-[13px]">
          <tbody>
            <tr>
              {form.references.map((r) => (
                <td key={r.id} className="border border-black p-4 text-center align-middle w-1/2">
                  <div className="text-4xl mb-1">📄</div>
                  <div className="font-semibold">{r.fileName || r.description || "Reference Specification"}</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      ) : (
        !isBank && <p className="italic mb-8">None.</p>
      )}

      {/* -------------------- 5. APPENDIX (LIVE ATTACHMENT PREVIEW) -------------------- */}
      {allAttachments.length > 0 && (
        <>
          <div className="border-t border-slate-300 my-8" />
          <h2 className="text-base font-bold mt-8 mb-4">
            5. Appendix: Attached Document Specifications &amp; Payloads
          </h2>

          <div className="space-y-8">
            {allAttachments.map((att, idx) => (
              <div key={idx} className="border border-black p-4">
                <p className="font-bold mb-3">
                  5.{idx + 1} {att.description} ({att.fileName})
                </p>
                <table className="w-full border-collapse border border-black mb-4 text-[13px]">
                  <tbody>
                    <tr>
                      <td className="border border-black font-bold p-1.5 w-40 bg-slate-100">Document Name</td>
                      <td className="border border-black p-1.5">{att.fileName}</td>
                    </tr>
                    <tr>
                      <td className="border border-black font-bold p-1.5 w-40 bg-slate-100">Specification Type</td>
                      <td className="border border-black p-1.5">{att.description}</td>
                    </tr>
                    <tr>
                      <td className="border border-black font-bold p-1.5 w-40 bg-slate-100">Integration Storage</td>
                      <td className="border border-black p-1.5">Embedded Data URI Archive / Spec Dump</td>
                    </tr>
                  </tbody>
                </table>

                {/* Image Schema Preview */}
                {att.fileName.match(/\.(png|jpg|jpeg)$/i) ? (
                  <div className="flex flex-col items-center justify-center p-4 border border-black my-2">
                    <img
                      src={att.fileBase64}
                      alt={att.fileName}
                      className="max-h-80 w-auto object-contain"
                    />
                  </div>
                ) : att.fileName.match(/\.(json|txt|xml|esql|sql|md)$/i) ||
                  att.fileBase64.includes("application/json") ||
                  att.fileBase64.includes("text/") ? (
                  /* Decoded Text / JSON / ESQL Preview */
                  <pre className="font-mono text-[12px] bg-slate-100 border border-black p-3 overflow-x-auto max-h-96 whitespace-pre-wrap">
                    {decodeBase64Text(att.fileBase64)}
                  </pre>
                ) : (
                  /* Binary Archive Token (PDF / DOCX) */
                  <div className="p-3 border border-black bg-slate-50 text-[12px] space-y-1">
                    <p className="italic">
                      Note: The binary file '{att.fileName}' is archived in the integration repository under CR-
                      {form.crNumber || "New"}. A Data-URI preview token is registered below for verification:
                    </p>
                    <div className="font-mono text-[11px] text-slate-600 break-all bg-white p-2 border border-slate-300">
                      {att.fileBase64.substring(0, 160)}... [TRUNCATED BINARY PAYLOAD]
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}