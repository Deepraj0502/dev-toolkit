import { Check, ListChecks } from "lucide-react";
import type { ProgressState } from "../types/Generator";

interface Props {
  progress: ProgressState;
}

const steps = [
  { key: "template", label: "Load Template" },
  { key: "extract", label: "Extract Files" },
  { key: "rename", label: "Rename" },
  { key: "swagger", label: "Replace Content" },
  { key: "ace", label: "Update Swagger" },
  { key: "validation", label: "Validate" },
  { key: "zip", label: "Build ZIP" },
  { key: "download", label: "Download" }
] as const;

export default function ProgressTimeline({ progress }: Props) {
  const completedCount = steps.filter((step) => progress[step.key]).length;
  const activeIndex = completedCount < steps.length ? completedCount : steps.length - 1;

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0b0f1d] p-6 shadow-xl shadow-black/30">
      <div className="mb-8 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-indigo-400" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-200">Progress</p>
      </div>

      <div className="flex items-start">
        {steps.map((step, index) => {
          const completed = progress[step.key];
          const isCurrent = !completed && index === activeIndex;

          return (
            <div key={step.key} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center gap-3">
                <div
                  className={[
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition",
                    completed
                      ? "bg-indigo-600 text-white"
                      : isCurrent
                        ? "border-2 border-indigo-500 bg-[#0f1424] text-indigo-300"
                        : "bg-slate-800 text-slate-500"
                  ].join(" ")}
                >
                  {completed ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <div className="text-center">
                  <p className={`text-xs font-medium ${completed || isCurrent ? "text-slate-200" : "text-slate-500"}`}>
                    {step.label}
                  </p>
                  <p className={`text-[11px] ${completed ? "text-emerald-400" : "text-slate-600"}`}>
                    {completed ? "Completed" : isCurrent ? "In progress" : "Pending"}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 ? (
                <div className={`mt-4 h-0.5 flex-1 rounded-full ${completed ? "bg-indigo-600" : "bg-slate-800"}`} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
