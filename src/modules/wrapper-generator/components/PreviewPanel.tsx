interface PreviewPanelProps {
  archiveName: string;
}

export default function PreviewPanel({ archiveName }: PreviewPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Output Preview
      </p>
      <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {archiveName}
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        The generated archive preserves binary assets and updates all wrapper references.
      </p>
    </div>
  );
}
