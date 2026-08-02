import { useEffect, useMemo, useState } from "react";
import WrapperHeader from "./components/WrapperHeader";
import GeneratorForm from "./components/GeneratorForm";
import BankGeneratorForm from "./components/BankGeneratorForm";
import LoggerConsole from "./components/LoggerConsole";
import ProgressTimeline from "./components/ProgressTimeline";
import ToastNotifications, { type ToastItem } from "./components/ToastNotifications";
import Generator from "./engines/Generator";
import { useGenerator } from "./hooks/useGenerator";
import type { BankVariant, ThirdPartyVariant, WrapperRequest } from "./types/Generator";

type Mode = "thirdparty" | "bank";

export default function WrapperGenerator() {
  const { state, setState, addLog, updateProgress } = useGenerator();
  const generator = useMemo(() => new Generator(), []);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mode, setMode] = useState<Mode>("thirdparty");

  // Third-party wrapper state
  const [request, setRequest] = useState<WrapperRequest>({
    apiName: "",
    swaggerTitle: "",
    swaggerDescription: "",
    basePath: "",
    version: "1.0.0",
    author: ""
  });
  const [thirdPartyVariant, setThirdPartyVariant] = useState<ThirdPartyVariant>("standard");

  // Bank wrapper state
  const [bankApiName, setBankApiName] = useState("");
  const [bankVariant, setBankVariant] = useState<BankVariant>("normal");
  const [bankSwaggerFile, setBankSwaggerFile] = useState<File | null>(null);

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

  function resetRunState() {
    setState((prev) => ({
      ...prev,
      loading: true,
      progress: {
        template: false,
        extract: false,
        rename: false,
        swagger: false,
        ace: false,
        validation: false,
        zip: false,
        download: false
      },
      logs: []
    }));
  }

  async function generateThirdParty() {
    if (!request.apiName.trim()) {
      addLog("error", "API Name is required.");
      pushToast("error", "API Name is required.");
      return;
    }
    resetRunState();
    addLog("info", "Initialization started...");
    pushToast("info", "Wrapper generation started.");
    try {
      await generator.generate(request, addLog, updateProgress, thirdPartyVariant);
      addLog("success", "Wrapper generated successfully! Ready to download.");
      pushToast("success", "Wrapper archive generated and downloaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog("error", message);
      pushToast("error", message);
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }

  async function generateBank() {
    if (!bankApiName.trim()) {
      addLog("error", "API Name is required.");
      pushToast("error", "API Name is required.");
      return;
    }
    if (!bankSwaggerFile) {
      addLog("error", "A swagger file is required.");
      pushToast("error", "Drag and drop a swagger file first.");
      return;
    }
    resetRunState();
    addLog("info", "Initialization started...");
    pushToast("info", "Bank wrapper generation started.");
    try {
      await generator.generateBank(
        { apiName: bankApiName, variant: bankVariant, swaggerFile: bankSwaggerFile },
        addLog,
        updateProgress
      );
      addLog("success", "Bank wrapper generated successfully! Ready to download.");
      pushToast("success", "Wrapper archive generated and downloaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog("error", message);
      pushToast("error", message);
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }

  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-6 p-6">
        <WrapperHeader title="IBM ACE Wrapper Generator" subtitle="Back to Dashboard" />

        <div className="flex w-fit gap-2 rounded-xl border border-slate-800 bg-[#0b0f1d] p-1.5">
          <button
            type="button"
            disabled={state.loading}
            onClick={() => setMode("thirdparty")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              mode === "thirdparty" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Third-Party Wrapper
          </button>
          <button
            type="button"
            disabled={state.loading}
            onClick={() => setMode("bank")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              mode === "bank" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Bank Wrapper
          </button>
        </div>

        <ProgressTimeline progress={state.progress} />
        <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          {mode === "thirdparty" ? (
            <GeneratorForm
              request={request}
              setRequest={setRequest}
              variant={thirdPartyVariant}
              onVariantChange={setThirdPartyVariant}
              generate={generateThirdParty}
              loading={state.loading}
            />
          ) : (
            <BankGeneratorForm
              apiName={bankApiName}
              onApiNameChange={setBankApiName}
              variant={bankVariant}
              onVariantChange={setBankVariant}
              swaggerFile={bankSwaggerFile}
              onSwaggerFileChange={setBankSwaggerFile}
              generate={generateBank}
              loading={state.loading}
            />
          )}
          <LoggerConsole logs={state.logs} loading={state.loading} />
        </div>
      </div>
      <ToastNotifications toasts={toasts} />
    </div>
  );
}
