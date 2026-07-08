interface Props {
  title: string;
  completed: boolean;
}

export default function StatusCard({ title, completed }: Props) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>
      <span className={completed ? "text-sm font-semibold text-emerald-500" : "text-sm font-semibold text-slate-400"}>
        {completed ? "Completed" : "Waiting"}
      </span>
    </div>
  );
}