interface TemplateHintPanelProps {
  templateName: string;
}

export default function TemplateHintPanel({ templateName }: TemplateHintPanelProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
      Place your wrapper template zip file in <span className="font-semibold text-indigo-600 dark:text-indigo-400">public/templates</span> and name it <span className="font-semibold">{templateName}</span> so the generator can load it automatically.
    </div>
  );
}
