import {
  AlertTriangle,
  Check,
  CreditCard,
  Loader2,
  Search,
  UserRoundSearch,
  X,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { apiHeaders, apiUrl } from "../../../config/api";
import { useMember } from "../../../contexts/member-context";
import { useRfid } from "../../../hooks/use-rfid";
import {
  memberListSchema,
  memberSchema,
  type MemberSchema,
} from "../../../schemas/member.schema";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { OnScreenKeyboard } from "../../shared/on-screen-keyboard";

export function MemberSearch() {
  const { pause, resume, select } = useMember();
  const [open, setOpen] = useState(false);
  const [adminCardNumber, setAdminCardNumber] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSchema[]>([]);
  const [authorizing, setAuthorizing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    value: scannedAdminCard,
    inputLength,
    clear: clearAdminScan,
  } = useRfid({ disabled: !open || adminCardNumber !== null });

  const show = () => {
    pause();
    setOpen(true);
    setAdminCardNumber(null);
    setQuery("");
    setResults([]);
    setError(null);
    clearAdminScan();
  };

  const close = () => {
    setOpen(false);
    clearAdminScan();
    resume();
  };

  useEffect(() => {
    if (!scannedAdminCard || !open || adminCardNumber !== null) return;
    const controller = new AbortController();
    setAuthorizing(true);
    setError(null);
    fetch(apiUrl(`member/${scannedAdminCard}`), {
      headers: apiHeaders(),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Carte inconnue");
        return memberSchema.parse(await response.json());
      })
      .then((admin) => {
        if (!admin.admin) throw new Error("Cette carte n’est pas administratrice");
        setAdminCardNumber(admin.cardNumber);
      })
      .catch((cause) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Autorisation impossible");
        clearAdminScan();
      })
      .finally(() => setAuthorizing(false));
    return () => controller.abort();
  }, [scannedAdminCard, open, adminCardNumber]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!adminCardNumber || trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setError(null);
      fetch(apiUrl("members/search"), {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ adminCardNumber, query: trimmed }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Erreur ${response.status}`);
          return memberListSchema.parse(await response.json());
        })
        .then(setResults)
        .catch((cause) => {
          if (cause instanceof Error && cause.name === "AbortError") return;
          setError("Impossible de rechercher les membres.");
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [adminCardNumber, query]);

  const choose = (member: MemberSchema) => {
    select(member);
    setOpen(false);
    clearAdminScan();
  };

  return (
    <>
      <Button class="mt-3 w-full" type="button" variant="outline" onClick={show}>
        <UserRoundSearch /> Rechercher sans carte
      </Button>
      {open && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3">
          <Card class="max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto p-5 shadow-2xl">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="text-2xl font-bold">Rechercher un membre</h2>
                <p class="text-sm text-muted-foreground">
                  Cette procédure remplace exceptionnellement la carte RFID.
                </p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Fermer" onClick={close}>
                <X />
              </Button>
            </div>

            {adminCardNumber === null ? (
              <div class="my-8 flex flex-col items-center gap-4 text-center">
                {authorizing ? (
                  <Loader2 class="size-14 animate-spin text-primary" />
                ) : (
                  <CreditCard class="size-14 text-primary" />
                )}
                <h3 class="text-xl font-semibold">Carte administrateur requise</h3>
                <p class="text-muted-foreground">
                  {inputLength > 0
                    ? `Lecture en cours : ${inputLength} chiffre${inputLength > 1 ? "s" : ""}`
                    : "Scannez une carte administrateur pour autoriser la recherche."}
                </p>
                {error && (
                  <p class="flex items-center gap-2 text-destructive">
                    <AlertTriangle /> {error}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div class="mt-5 flex items-center gap-3 rounded-lg border bg-background px-4">
                  <Search class="text-muted-foreground" />
                  <input
                    class="h-14 min-w-0 flex-1 bg-transparent text-xl outline-none"
                    value={query}
                    inputMode="none"
                    autocomplete="off"
                    placeholder="Prénom ou nom…"
                    aria-label="Nom du membre"
                    onInput={(event) => setQuery(event.currentTarget.value)}
                  />
                  {searching && <Loader2 class="animate-spin text-primary" />}
                </div>

                <div class="my-4 overflow-x-auto rounded-lg border bg-background p-3">
                  <OnScreenKeyboard value={query} onChange={setQuery} />
                </div>

                <div class="min-h-24 rounded-lg border">
                  {query.trim().length < 2 ? (
                    <p class="p-6 text-center text-muted-foreground">
                      Saisissez au moins deux lettres.
                    </p>
                  ) : !searching && results.length === 0 && !error ? (
                    <p class="p-6 text-center text-muted-foreground">
                      Aucun membre trouvé.
                    </p>
                  ) : (
                    results.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        class="flex min-h-14 w-full items-center gap-4 border-b px-4 py-3 text-left last:border-b-0 hover:bg-accent"
                        onClick={() => choose(member)}
                      >
                        <span class="text-lg font-semibold">
                          {member.firstName} {member.lastName}
                        </span>
                        <span class="ml-auto text-muted-foreground">
                          Solde {member.balance} €
                        </span>
                        <Check class="text-primary" />
                      </button>
                    ))
                  )}
                </div>
                {error && (
                  <p class="mt-3 flex items-center gap-2 text-destructive">
                    <AlertTriangle /> {error}
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
