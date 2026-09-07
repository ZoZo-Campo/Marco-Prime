import { useEffect, useRef, useState } from "preact/hooks";

interface UseRfidOptions {
  disabled?: boolean;
}

export function useRfid(options: UseRfidOptions = {}) {
  const { disabled = false } = options;
  const [value, setValue] = useState<string | undefined>(undefined);
  const [scanId, setScanId] = useState(0);
  const [inputLength, setInputLength] = useState(0);
  const bufferRef = useRef("");
  const resetTimerRef = useRef<number | undefined>(undefined);

  const commitBuffer = () => {
    const cardNumber = bufferRef.current;
    bufferRef.current = "";
    setInputLength(0);
    if (!/^\d+$/.test(cardNumber)) return;
    setValue(cardNumber);
    setScanId((current) => current + 1);
  };

  const clearBuffer = () => {
    bufferRef.current = "";
    setInputLength(0);
    window.clearTimeout(resetTimerRef.current);
  };

  useEffect(() => {
    if (disabled) {
      clearBuffer();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        window.clearTimeout(resetTimerRef.current);
        if (bufferRef.current.length > 0) {
          event.preventDefault();
          commitBuffer();
        }
        return;
      }

      if (event.key === "Backspace" && bufferRef.current.length > 0) {
        event.preventDefault();
        bufferRef.current = bufferRef.current.slice(0, -1);
        setInputLength(bufferRef.current.length);
        return;
      }

      if (event.key === "Escape") {
        clearBuffer();
        return;
      }

      if (/^\d$/.test(event.key)) {
        if (bufferRef.current.length < 32) {
          bufferRef.current += event.key;
          setInputLength(bufferRef.current.length);
        }
        window.clearTimeout(resetTimerRef.current);
        // Une saisie abandonnée est nettoyée, mais jamais envoyée toute seule :
        // cela laisse le temps de taper manuellement puis d'appuyer sur Entrée.
        resetTimerRef.current = window.setTimeout(clearBuffer, 5_000);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(resetTimerRef.current);
      bufferRef.current = "";
    };
  }, [disabled]);

  return {
    value,
    scanId,
    inputLength,
    clear: () => {
      clearBuffer();
      setValue(undefined);
    },
  };
}
