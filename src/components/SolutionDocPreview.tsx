import type { SolutionDocFormState } from "../types/solutionDoc";

interface Props {
  form: SolutionDocFormState;
}

export default function SolutionDocPreview({ form }: Props) {
  const scopeRows = [
    { sl: "1.", label: form.apiName || "(API name)", doc: form.apiNameFileName || "-", remarks: "-" },
    ...form.apiDocuments.map((d, i) => ({
      sl: `${i + 2}.`,
      label: d.description || "API Specification / CR Document",
      doc: d.fileName || "-",
      remarks: "",
    })),
    {
      sl: `${form.apiDocuments.length + 2}.`,
      label: "Encryption Document",
      doc: "(reference attached)",
      remarks: "For Consuming Channel within SBI",
    },
  ];

  return (
    <div className="rounded-3xl border border-slate-800 bg-white text-slate-900 p-8 shadow-xl overflow-y-auto h-full text-sm leading-relaxed">
      <h1 className="text-2xl font-bold text-center mb-6">Solution Document</h1>

      <table className="w-full border-collapse mb-6 text-sm">
        <tbody>
          {[
            ["Module", "Enterprise Integration Services (SBI GITC, CBD Belapur, Navi Mumbai)"],
            ["CR Number", form.crNumber || "—"],
            ["Functionality", form.functionality || "—"],
            ["Date", form.date || "—"],
            ["TCS Associate", form.tcsAssociateName || "—"],
            ["SBI Official", form.sbiOfficialName || "—"],
          ].map(([k, v]) => (
            <tr key={k} className="border border-slate-300">
              <td className="border border-slate-300 bg-indigo-50 font-semibold p-2 w-40">{k}</td>
              <td className="border border-slate-300 p-2">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-lg font-bold mt-6 mb-2">1. CR Details</h2>

      <h3 className="font-bold mt-3 mb-1">1.1 Description</h3>
      <p className="whitespace-pre-wrap text-slate-700">{form.crDescription || "—"}</p>

      <h3 className="font-bold mt-3 mb-1">1.2 Scope of Change</h3>
      <p className="text-slate-700 mb-2">The following APIs will be developed</p>
      <table className="w-full border-collapse text-xs mb-2">
        <thead>
          <tr className="bg-indigo-50">
            <th className="border border-slate-300 p-1.5">Sl.</th>
            <th className="border border-slate-300 p-1.5">API Name / Item</th>
            <th className="border border-slate-300 p-1.5">Document</th>
            <th className="border border-slate-300 p-1.5">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {scopeRows.map((r, i) => (
            <tr key={i}>
              <td className="border border-slate-300 p-1.5 text-center">{r.sl}</td>
              <td className="border border-slate-300 p-1.5">{r.label}</td>
              <td className="border border-slate-300 p-1.5">{r.doc}</td>
              <td className="border border-slate-300 p-1.5">{r.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="font-bold mt-3 mb-1">1.3 Existing Functionality</h3>
      <p className="text-slate-700">
        {form.existingFunctionalityStatus === "New"
          ? "This is a New Functionality."
          : `This is an Existing Functionality. ${form.existingFunctionalityDetails || ""}`}
      </p>

      <h3 className="font-bold mt-3 mb-1">1.4 Feasibility</h3>
      <p className="text-slate-700">
        The solution proposed in this document is technically feasible subject to assumptions and limitations.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">2. Solution Details</h2>
      <p className="text-slate-700 mb-2">
        Communication of all APIs will be in encrypted format having a common request/response format, where all
        fields will be mandatory. EIS will provide a wrapper service having a parent tag EIS_PAYLOAD, routing based
        on TXN_TYPE and TXN_SUB_TYPE.
      </p>

      <h3 className="font-bold mt-3 mb-1">Destination / Type / Subtype Combinations</h3>
      <pre className="whitespace-pre-wrap font-sans text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
        {form.destinationTypeSubtypeText || "—"}
      </pre>

      <h2 className="text-lg font-bold mt-6 mb-2">3. Other Details</h2>

      <h3 className="font-bold mt-3 mb-1">3.1 Assumptions</h3>
      <ul className="list-disc pl-5 text-slate-700 space-y-1">
        <li>All APIs will have {form.endpointName || "SBI LIFE"} as end point.</li>
        <li>EIS will act as pass-through.</li>
        <li>Any response/data/error received from any source/end points of EIS API will be forwarded 'as is'.</li>
        <li>SBI will provide sign-off on solution document before development begins.</li>
        <li>Any delays due to sign-off or any prioritization activities by business may affect project timelines.</li>
        <li>SBI shall provide access to Production environment.</li>
        <li>Consumer should pass the correct values for the request fields.</li>
      </ul>

      <h3 className="font-bold mt-3 mb-1">3.2 Enterprise Specs.</h3>
      <p className="text-slate-700">SBI EA Team (Enterprise Architecture Team) will provide Enterprise-wide Specifications.</p>

      <h3 className="font-bold mt-3 mb-1">3.3 Impact/Dependency</h3>
      <p className="text-slate-700">
        New Development of the APIs to IIB platform will involve dependencies from all the stakeholders that are
        either part of consumer to the APIs or End points to the APIs.
      </p>

      <h3 className="font-bold mt-3 mb-1">3.4 Business Acceptance</h3>
      <p className="text-slate-700">
        TCS will prepare solution documents as per the acceptance criteria provided by SBI. Formal acceptance from
        the SBI will be obtained after the SBI has reviewed the implemented change and is satisfied with the same.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">4. References</h2>
      {form.references.length > 0 ? (
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          {form.references.map((r) => (
            <li key={r.id}>
              {r.description || "Reference document"}
              {r.fileName ? ` — ${r.fileName}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500 italic">None.</p>
      )}
    </div>
  );
}
