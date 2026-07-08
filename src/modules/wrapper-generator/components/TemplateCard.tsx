interface TemplateCardProps {
  templateName: string;
}

export default function TemplateCard({ templateName }: TemplateCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Template
          </p>
          <p className="mt-1 text-sm text-slate-300">Master Template (ZIP)</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
          Loaded
        </span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 text-sm text-slate-200">
        <p className="font-semibold">{templateName}</p>
        <p className="mt-2 text-xs text-slate-400">Using template: {templateName.replace(/\.zip$/, "")}</p>
      </div>
    </div>
  );
}
