import { createContext } from "preact";
import type { PropsWithChildren } from "preact/compat";
import { useContext, useEffect, useState } from "preact/hooks";
import type z from "zod";
import { useApi } from "../hooks/use-api";
import { useRfid } from "../hooks/use-rfid";
import { memberSchema } from "../schemas/member.schema";
import { apiUrl } from "../config/api";

const MemberContext = createContext<{
  data: z.infer<typeof memberSchema> | null;
  loading: boolean;
  error: Error | null;
  inputLength: number;
  paused: boolean;
  retry: () => Promise<void>;
  clear: () => void;
  pause: () => void;
  resume: () => void;
} | null>(null);

export function useMember() {
  const context = useContext(MemberContext);
  if (!context)
    throw new Error("useMember should be used inside a MemberProvider");
  return context;
}

export function MemberProvider({ children }: PropsWithChildren) {
  const [paused, setPaused] = useState(false);
  const {
    value: memberCardId,
    scanId,
    inputLength,
    clear: clearRfid,
  } = useRfid({ disabled: paused });
  const { data, loading, error, refetch, reset } = useApi(
    memberSchema,
    apiUrl(`member/${memberCardId}`),
    { immediate: false },
  );

  useEffect(() => {
    if (memberCardId) refetch();
  }, [memberCardId, scanId]);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);
  const clear = () => {
    clearRfid();
    reset();
  };

  return (
    <MemberContext.Provider
      value={{
        data,
        loading,
        error,
        inputLength,
        paused,
        retry: refetch,
        clear,
        pause,
        resume,
      }}
    >
      {children}
    </MemberContext.Provider>
  );
}
