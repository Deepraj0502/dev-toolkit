import { useState } from "react";
import { DEFAULT_PROGRESS } from "../config/constants";
import type { GeneratorState, ProgressState } from "../types/Generator";
import type { LogLevel } from "../types/Logger";

export function useGenerator() {
  const [state, setState] = useState<GeneratorState>({
    loading: false,
    progress: DEFAULT_PROGRESS,
    logs: []
  });

  function addLog(level: LogLevel, message: string) {
    setState((prev) => ({
      ...prev,
      logs: [
        ...prev.logs,
        {
          id: Date.now() + Math.random(),
          level,
          message,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })
        }
      ]
    }));
  }

  function updateProgress(step: keyof ProgressState) {
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [step]: true
      }
    }));
  }

  return {
    state,
    setState,
    addLog,
    updateProgress
  };
}