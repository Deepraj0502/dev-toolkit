import { useState, useCallback, useEffect, useRef } from "react";

interface UseClipboardOptions {
  /** Duration in milliseconds to show the copied state. @default 2000 */
  timeout?: number;
}

interface UseClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

export function useClipboard({ timeout = 2000 }: UseClipboardOptions = {}): UseClipboardReturn {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setCopied(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      let success = false;

      // 1. Try modern Clipboard API (Secure Contexts: HTTPS or localhost)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          success = true;
        } catch (err) {
          console.warn("Clipboard API failed, trying HTTP fallback...", err);
        }
      }

      // 2. Fallback for non-secure contexts (HTTP / custom IPs)
      if (!success) {
        try {
          const textArea = document.createElement("textarea");
          textArea.value = text;

          // Prevent viewport jumping and make invisible
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          textArea.setAttribute("readonly", "");

          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          success = document.execCommand("copy");
          document.body.removeChild(textArea);
        } catch (err) {
          console.error("Fallback clipboard copy failed:", err);
          success = false;
        }
      }

      // 3. Trigger UI feedback timer if successful
      if (success) {
        setCopied(true);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          setCopied(false);
        }, timeout);
      }

      return success;
    },
    [timeout]
  );

  // Cleanup timer if the component unmounts before timeout finishes
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { copied, copy, reset };
}