import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export interface ToastItem {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

interface Props {
  toasts: ToastItem[];
}

export default function ToastNotifications({ toasts }: Props) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-6 top-6 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : toast.type === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
          ) : toast.type === "error" ? (
            <AlertCircle className="mt-0.5 h-5 w-5" />
          ) : (
            <Info className="mt-0.5 h-5 w-5" />
          )}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
