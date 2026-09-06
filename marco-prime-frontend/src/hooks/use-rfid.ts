import { useEffect, useRef, useState } from "preact/hooks";

interface UseRfidOptions {
  disabled?: boolean;
}

export function useRfid(options: UseRfidOptions = {}) {
  const { disabled = false } = options;
  const [value, setValue] = useState<string | undefined>(undefined);
  const bufferRef = useRef("");

  useEffect(() => {
    if (disabled) {
      bufferRef.current = "";
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        if (bufferRef.current.length > 0) {
          setValue(bufferRef.current);
          bufferRef.current = "";
        }
        return;
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled]);

  return {
    value,
    clear: () => setValue(undefined),
  };
}
