import type { ProgressState } from "../types/Generator";
import StatusCard from "./StatusCard";

interface Props {
  progress: ProgressState;
}

export default function ProgressPanel({ progress }: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
        Progress Timeline
      </p>
      <div className="mt-5 space-y-3">
        <StatusCard title="Load Template" completed={progress.template} />
        <StatusCard title="Rename Files" completed={progress.rename} />
        <StatusCard title="Rename Folders" completed={progress.rename} />
        <StatusCard title="Update Swagger" completed={progress.swagger} />
        <StatusCard title="Update IBM ACE" completed={progress.ace} />
        <StatusCard title="Validation" completed={progress.validation} />
        <StatusCard title="Generate ZIP" completed={progress.zip} />
      </div>
    </div>
  );
}