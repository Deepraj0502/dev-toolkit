import { useEffect, useMemo, useState } from "react";
import WrapperHeader from "./components/WrapperHeader";
import GeneratorForm from "./components/GeneratorForm";
import LoggerConsole from "./components/LoggerConsole";
import ProgressTimeline from "./components/ProgressTimeline";
import ToastNotifications, { type ToastItem } from "./components/ToastNotifications";
import { DEFAULT_PROGRESS } from "./config/constants";
import Generator from "./engines/Generator";
import { useGenerator } from "./hooks/useGenerator";
import type { WrapperRequest } from "./types/Generator";

export default function WrapperGenerator() {
  const { state, setState, addLog, updateProgress } = useGenerator();
  const [request, setRequest] = useState<WrapperRequest>({
    apiName: "",
    swaggerTitle: "",
    swaggerDescription: "",
    basePath: "",
    version: "1.0.0",
    author: ""
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const generator = useMemo(() => new Generator(), []);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  function pushToast(type: ToastItem["type"], message: string) {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), type, message }]);
  }

  async function generate() {
    if (!request.apiName.trim()) {
      addLog("error", "API Name is required.");
      pushToast("error", "API Name is required.");
      return;
    }
    setState((prev) => ({
      ...prev,
      loading: true,
      progress: DEFAULT_PROGRESS,
      logs: []
    }));
    addLog("info", "Initialization started...");
    pushToast("info", "Wrapper generation started.");
    try {
      await generator.generate(request, addLog, updateProgress);
      addLog("success", "Wrapper generated successfully! Ready to download.");
      pushToast("success", "Wrapper archive generated and downloaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog("error", message);
      pushToast("error", message);
    } finally {
      setState((prev) => ({
        ...prev,
        loading: false
      }));
    }
  }

  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-6 p-6">
        <WrapperHeader
          title="IBM ACE Wrapper Generator"
          subtitle="Back to Dashboard"
        />

        <ProgressTimeline progress={state.progress} />
        <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          <GeneratorForm request={request} setRequest={setRequest} generate={generate} loading={state.loading} />
          <LoggerConsole logs={state.logs} loading={state.loading} />
        </div>
      </div>
      <ToastNotifications toasts={toasts} />
    </div>
  );
}
