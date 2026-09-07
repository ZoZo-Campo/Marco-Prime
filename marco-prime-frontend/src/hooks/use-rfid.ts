import { useEffect, useRef, useState } from "preact/hooks";

interface UseRfidOptions {
  disabled?: boolean;
}

export function useRfid(options: UseRfidOptions = {}) {
  const { disabled = false } = options;
  const [value, setValue] = useState<string | undefined>(undefined);
  const [scanId, setScanId] = useState(0);
  const bufferRef = useRef("");
  const endTimerRef = useRef<number | undefined>(undefined);

  const commitBuffer = () => {
    const cardNumber = bufferRef.current;
    bufferRef.current = "";
    if (!/^\d+$/.test(cardNumber)) return;
    setValue(cardNumber);
    setScanId((current) => current + 1);
  };

  useEffect(() => {
    if (disabled) {
      bufferRef.current = "";
      window.clearTimeout(endTimerRef.current);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        window.clearTimeout(endTimerRef.current);
        if (bufferRef.current.length > 0) {
          commitBuffer();
        }
        return;
      }

      if (/^\d$/.test(event.key)) {
        if (bufferRef.current.length < 32) {
          bufferRef.current += event.key;
        }
        window.clearTimeout(endTimerRef.current);
        // Certains lecteurs n'envoient pas Entrée. Une courte période sans
        // chiffre marque alors automatiquement la fin de la lecture.
        endTimerRef.current = window.setTimeout(commitBuffer, 250);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(endTimerRef.current);
      bufferRef.current = "";
    };
  }, [disabled]);

  return {
    value,
    scanId,
    clear: () => setValue(undefined),
  };
}
