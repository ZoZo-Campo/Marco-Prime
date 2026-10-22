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
import {
  isValidCardNumber,
  MAX_CARD_NUMBER_DIGITS,
} from "../../../constants";
import { useMember } from "../../../contexts/member-context";
import { useRfid } from "../../../hooks/use-rfid";
import { shopping } from "../../../contexts/shopping-context";
import {
  memberListSchema,
  memberSchema,
  type MemberSchema,
} from "../../../schemas/member.schema";
import { loadRecentMembers } from "../../../utils/recent-members";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";

export function MemberSearch() {
  const { pause, resume, submitCardNumber } = useMember();
  const [open, setOpen] = useState(false);
  const [adminCardNumber, setAdminCardNumber] = useState<number | null>(null);
  const [manualAdminCode, setManualAdminCode] = useState("");
  const [query, setQuery] = useState("");
  const [promotion, setPromotion] = useState("");
  const [promotions, setPromotions] = useState<number[]>([]);
  const [results, setResults] = useState<MemberSchema[]>([]);
  const [authorizing, setAuthorizing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<MemberSchema[]>([]);
  const {
    value: scannedAdminCard,
    inputLength,
    clear: clearAdminScan,
  } = useRfid({ disabled: !open || adminCardNumber !== null });

  const resetAuthorization = () => {
    setAdminCardNumber(null);
    setManualAdminCode("");
    setAdminError(null);
    clearAdminScan();
  };

  const show = () => {
    pause();
    setOpen(true);
    resetAuthorization();
    setQuery("");
    setPromotion("");
    setResults([]);
    setError(null);
    setRecent(loadRecentMembers());
  };

  const close = () => {
    setOpen(false);
    resetAuthorization();
    resume();
  };

  const authorizeAdmin = async (cardNumber: string) => {
    if (!isValidCardNumber(cardNumber)) {
      setAdminError("Numéro de carte invalide.");
      clearAdminScan();
      return;
    }
    setAuthorizing(true);
    setAdminError(null);
    try {
      const response = await fetch(apiUrl(`member/${cardNumber}`), {
        headers: apiHeaders(),
      });
      if (!response.ok) throw new Error("Carte inconnue");
      const admin = memberSchema.parse(await response.json());
      if (!admin.admin) {
        throw new Error("Cette carte n’est pas administratrice");
      }
      setAdminCardNumber(admin.cardNumber);
      setManualAdminCode("");
      clearAdminScan();
    } catch (cause) {
      setAdminError(
        cause instanceof Error ? cause.message : "Autorisation impossible",
      );
      clearAdminScan();
    } finally {
      setAuthorizing(false);
    }
  };

  useEffect(() => {
    if (!scannedAdminCard || !open || adminCardNumber !== null) return;
    void authorizeAdmin(scannedAdminCard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedAdminCard, open, adminCardNumber]);

  useEffect(() => {
    if (!open || !adminCardNumber) return;
    fetch(apiUrl("admin/promotions"), {
      method: "POST",
      headers: apiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ adminCardNumber }),
    })
      .then((response) => response.json())
      .then((rows: { promotion: number }[] | number[]) => {
        if (Array.isArray(rows)) {
          setPromotions(
            rows
              .map((row) => (typeof row === "number" ? row : row.promotion))
              .filter((value) => typeof value === "number"),
          );
        }
      })
      .catch(() => {});
  }, [open, adminCardNumber]);

  useEffect(() => {
    const trimmed = query.trim();
    if (
      !open ||
      !adminCardNumber ||
      (trimmed.length < 2 && !promotion)
    ) {
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
        body: JSON.stringify({
          adminCardNumber,
          query: trimmed,
          ...(promotion ? { promotion: Number(promotion) } : {}),
        }),
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
  }, [open, adminCardNumber, query, promotion]);

  const choose = (member: MemberSchema) => {
    shopping.reset();
    // Ne jamais réutiliser l'objet des « membres récents » : son solde peut
    // dater d'avant un rechargement. On refetch toujours la fiche à jour.
    submitCardNumber(String(member.cardNumber));
    resume();
    setOpen(false);
    resetAuthorization();
  };

  return (
    <>
      <Button class="mt-3 w-full" type="button" variant="outline" onClick={show}>
        <UserRoundSearch /> Rechercher un membre
      </Button>
      {open && (
        <div class="fixed inset-0 z-50 flex flex-col items-center bg-black/75 p-3">
          <Card class="flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden px-5 py-3 shadow-2xl">
            <div class="flex shrink-0 items-center justify-between gap-4">
              <div>
                <h2 class="text-2xl font-bold">Rechercher un membre</h2>
                <p class="text-sm text-muted-foreground">
                  Par nom, prénom, promotion ou numéro de carte.
                </p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Fermer" onClick={close}>
                <X />
              </Button>
            </div>

            {adminCardNumber === null ? (
              <div class="my-8 flex flex-1 flex-col items-center justify-center gap-4 text-center">
                {authorizing ? (
                  <Loader2 class="size-14 animate-spin text-primary" />
                ) : (
                  <CreditCard class="size-14 text-primary" />
                )}
                <h3 class="text-xl font-semibold">Carte administrateur requise</h3>
                <p class="text-muted-foreground">
                  {inputLength > 0
                    ? `Lecture en cours : ${inputLength} chiffre${inputLength > 1 ? "s" : ""}`
                    : "Scannez une carte administrateur ou saisissez son numéro pour autoriser la recherche."}
                </p>
                {adminError && (
                  <p class="flex items-center gap-2 text-destructive">
                    <AlertTriangle /> {adminError}
                  </p>
                )}
                <form
                  class="flex w-full max-w-md flex-wrap items-center justify-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void authorizeAdmin(manualAdminCode);
                  }}
                >
                  <input
                    class="h-12 min-w-0 flex-1 border bg-input px-3 text-lg"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxlength={MAX_CARD_NUMBER_DIGITS}
                    autocomplete="off"
                    placeholder="Numéro de carte admin"
                    aria-label="Numéro de carte administrateur"
                    value={manualAdminCode}
                    onInput={(event) => {
                      setManualAdminCode(event.currentTarget.value.replace(/\D/g, ""));
                      setAdminError(null);
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={authorizing || manualAdminCode.length === 0}
                  >
                    Valider
                  </Button>
                </form>
              </div>
            ) : (
              <div class="mt-3 flex min-h-0 flex-1 flex-col gap-3">
                <div class="flex shrink-0 items-center gap-3 rounded-lg border bg-background px-4">
                  <Search class="text-muted-foreground" />
                  <input
                    class="h-14 min-w-0 flex-1 bg-transparent text-xl outline-none"
                    value={query}
                    autocomplete="off"
                    autoFocus
                    placeholder="Prénom, nom ou numéro de carte…"
                    aria-label="Nom ou numéro de carte"
                    onInput={(event) => setQuery(event.currentTarget.value)}
                  />
                  {searching && <Loader2 class="animate-spin text-primary" />}
                </div>
                <label class="flex shrink-0 items-center gap-3 text-lg">
                  Promotion
                  <select class="min-h-12 flex-1 rounded-lg border bg-background px-3" value={promotion}
                    onChange={(event) => setPromotion(event.currentTarget.value)}>
                    <option value="">Toutes les promotions</option>
                    {promotions.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>

                {recent.length > 0 && query.trim().length < 1 && !promotion && (
                  <div class="shrink-0">
                    <p class="mb-1.5 text-sm font-semibold text-muted-foreground">
                      Membres récents
                    </p>
                    <div class="flex flex-wrap gap-2">
                      {recent.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          class="flex min-h-11 items-center gap-2 rounded-full border bg-background px-4 py-2 text-left hover:bg-accent"
                          onClick={() => choose(member)}
                        >
                          <UserRoundSearch class="size-4 text-primary" />
                          <span class="text-base font-semibold">
                            {member.firstName} {member.lastName}
                          </span>
                          <span class="text-sm text-muted-foreground">
                            {member.class ? `Promo ${member.class}` : ""} · Solde {member.balance}€
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div class="min-h-16 flex-1 overflow-y-auto rounded-lg border bg-background">
                  {error && (
                    <p class="border-b p-4 text-destructive">{error}</p>
                  )}
                  {query.trim().length < 2 && !promotion ? (
                    <p class="p-6 text-center text-muted-foreground">
                      Saisissez au moins deux lettres ou choisissez une promotion.
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
                          {member.class ? `Promo ${member.class} · ` : ""}Solde {member.balance} €
                        </span>
                        <Check class="text-primary" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
