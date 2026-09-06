import { useEffect, useRef, useState } from "preact/hooks";

interface UseRfidOptions {
  disabled?: boolean;
}

export function useRfid(options: UseRfidOptions = {}) {
  const { disabled = false } = options;
  const [value, setValue] = useState<string | undefined>(undefined);
  const bufferRef = useRef("");
  const resetTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (disabled) {
      bufferRef.current = "";
      window.clearTimeout(resetTimerRef.current);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        window.clearTimeout(resetTimerRef.current);
        if (bufferRef.current.length > 0) {
          setValue(bufferRef.current);
          bufferRef.current = "";
        }
        return;
      }

      if (/^\d$/.test(event.key)) {
        bufferRef.current += event.key;
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = window.setTimeout(() => {
          bufferRef.current = "";
        }, 500);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(resetTimerRef.current);
    };
  }, [disabled]);

  return {
    value,
    clear: () => setValue(undefined),
  };
}
