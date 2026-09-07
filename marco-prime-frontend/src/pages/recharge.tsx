import { signal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { useEffect } from "preact/hooks";
import { AlertTriangle, Loader2, CreditCard } from "lucide-preact";
import { MemberProvider, useMember } from "../contexts/member-context";
import { setTicket } from "../contexts/ticket-context";
import { useRfid } from "../hooks/use-rfid";
import { rechargeResponseSchema } from "../schemas/recharge.schema";
import { Keypad } from "../components/features/recharge/keypad";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { TICKET_ROUTE_URL } from "./ticket";
import { apiHeaders, apiUrl } from "../config/api";

export const RECHARGE_ROUTE_URL = "/recharge";

const amountSignal = signal("");
const isLoadingSignal = signal(false);
const waitingForAdminSignal = signal(false);
const rechargeErrorSignal = signal<string | null>(null);
const pendingRechargeTransactionId = signal<string | null>(null);

export function RechargePage() {
  return (
    <MemberProvider>
      <RechargeContent />
    </MemberProvider>
  );
}

function RechargeContent() {
  const { route } = useLocation();
  const {
    data: member,
    error: memberLookupError,
    inputLength,
    retry: retryMember,
    clear: clearMember,
    pause,
    resume,
  } = useMember();

  const { value: adminCardNumber, clear: clearAdminRfid } = useRfid({
    disabled: !waitingForAdminSignal.value,
  });

  useEffect(() => {
    amountSignal.value = "";
    isLoadingSignal.value = false;
    waitingForAdminSignal.value = false;
    rechargeErrorSignal.value = null;
    pendingRechargeTransactionId.value = null;
    resume();
  }, []);

  useEffect(() => {
    if (waitingForAdminSignal.value && adminCardNumber && member) {
      processRecharge(Number(adminCardNumber));
      clearAdminRfid();
    }
  }, [adminCardNumber, waitingForAdminSignal.value]);

  const processRecharge = async (adminCard?: number) => {
    if (!member || !amountSignal.value) return;

    isLoadingSignal.value = true;
    rechargeErrorSignal.value = null;

    try {
      // If member is admin, use their own card as admin card
      const adminCardNumber = adminCard ?? (member.admin ? member.cardNumber : undefined);

      const body: Record<string, unknown> = {
        transactionId:
          pendingRechargeTransactionId.value ?? crypto.randomUUID(),
        cardNumber: member.cardNumber,
        amount: Number(amountSignal.value),
      };
      pendingRechargeTransactionId.value = body.transactionId as string;

      if (adminCardNumber) {
        body.adminCardNumber = adminCardNumber;
      }

      const response = await fetch(apiUrl("recharge"), {
        method: "POST",
        headers: apiHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (response.status < 500) {
          pendingRechargeTransactionId.value = null;
        }
        throw new Error(
          payload && typeof payload.error === "string"
            ? payload.error
            : `Rechargement refusé (erreur ${response.status})`,
        );
      }

      const json = await response.json();
      const result = rechargeResponseSchema.parse(json);

      setTicket({
        type: "recharge",
        transaction: result.transaction,
      });

      amountSignal.value = "";
      pendingRechargeTransactionId.value = null;
      waitingForAdminSignal.value = false;
      isLoadingSignal.value = false;
      resume();
      route(TICKET_ROUTE_URL);
      clearMember();
    } catch (error) {
      console.error("Erreur de rechargement:", error);
      rechargeErrorSignal.value =
        error instanceof DOMException && error.name === "TimeoutError"
          ? "Connexion perdue. Le résultat est incertain : vérifiez le solde avant de recommencer."
          : error instanceof TypeError
            ? "Connexion au serveur impossible. Réessayez lorsque le réseau est revenu."
            : error instanceof Error
              ? error.message
              : "Le rechargement a échoué.";
      isLoadingSignal.value = false;
      waitingForAdminSignal.value = false;
      resume();
    }
  };

  const handleRecharge = () => {
    if (!member || !amountSignal.value) return;

    if (member.admin) {
      // Member is admin, no need for separate admin card
      processRecharge();
    } else {
      pause();
      waitingForAdminSignal.value = true;
    }
  };

  const handleCancel = () => {
    waitingForAdminSignal.value = false;
    resume();
  };

  const amount = amountSignal.value ? Number(amountSignal.value) : 0;
  const currentBalance = member ? Number(member.balance) : 0;
  const newBalance = currentBalance + amount;
  const canRecharge = member && amount > 0 && !isLoadingSignal.value;

  return (
    <div class="grid grid-cols-[1fr_300px] flex-1 min-h-0 overflow-hidden">
      {/* Left side - Keypad */}
      <div class="px-7 py-5 flex flex-col gap-5 items-center justify-center">
        <p class="text-muted-foreground text-sm">Montant à recharger</p>
        <p class="text-6xl font-bold mb-4">
          {amount > 0 ? `${amount.toFixed(2)} €` : "0.00 €"}
        </p>
        <div class="w-72">
          <Keypad
            value={amountSignal.value}
            onChange={(v) => (amountSignal.value = v)}
          />
        </div>
      </div>

      {/* Right side - Aside */}
      <aside class="border-l bg-card px-7 py-5 flex flex-col gap-5">
        <h2 class="text-xl font-semibold">Rechargement</h2>

        {/* Member info */}
        {member ? (
          <Card class="gap-2 py-4 px-4">
            <p class="font-medium">
              {member.firstName} {member.lastName}
            </p>
            <p class="text-sm text-muted-foreground">
              Carte: {member.cardNumber}
            </p>
          </Card>
        ) : (
          <Card class="gap-2 py-4 px-4">
            {memberLookupError ? (
              <>
                <p class="text-destructive text-center">
                  Carte inconnue ou serveur indisponible
                </p>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    class="flex-1"
                    onClick={() => void retryMember()}
                  >
                    Réessayer
                  </Button>
                  <Button class="flex-1" onClick={clearMember}>
                    Autre carte
                  </Button>
                </div>
              </>
            ) : (
              <p class="text-muted-foreground text-center">
                {inputLength > 0
                  ? `Saisie en cours : ${inputLength} chiffre${inputLength > 1 ? "s" : ""}. Appuyez sur Entrée.`
                  : "Scannez une carte, ou saisissez son numéro puis appuyez sur Entrée."}
              </p>
            )}
          </Card>
        )}

        {/* Transaction summary */}
        <div class="flex-1 flex flex-col gap-3">
          {member && amount > 0 && (
            <>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Solde actuel</span>
                <span>{currentBalance.toFixed(2)} €</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Rechargement</span>
                <span class="text-green-600">+{amount.toFixed(2)} €</span>
              </div>
              <div class="border-t pt-3 flex justify-between font-semibold">
                <span>Nouveau solde</span>
                <span class="text-green-600">{newBalance.toFixed(2)} €</span>
              </div>
            </>
          )}
        </div>

        {rechargeErrorSignal.value && (
          <div class="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle class="size-5 shrink-0" />
            <span>{rechargeErrorSignal.value}</span>
          </div>
        )}

        {/* Recharge button */}
        <Button class="h-12" disabled={!canRecharge} onClick={handleRecharge}>
          {isLoadingSignal.value ? (
            <Loader2 class="size-5 animate-spin" />
          ) : (
            `${pendingRechargeTransactionId.value ? "Réessayer" : "Recharger"} ${amount.toFixed(2)} €`
          )}
        </Button>
      </aside>

      {/* Admin card modal */}
      {waitingForAdminSignal.value && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card class="w-96 gap-4 py-6">
            <div class="px-6 text-center">
              <CreditCard class="size-16 mx-auto mb-4 text-primary" />
              <h2 class="text-xl font-bold mb-2">Carte admin requise</h2>
              <p class="text-muted-foreground">
                Veuillez scanner une carte administrateur pour valider le
                rechargement
              </p>
            </div>
            <div class="px-6 py-4 border-t border-b text-center">
              <p class="text-2xl font-bold">{amount.toFixed(2)} €</p>
              <p class="text-sm text-muted-foreground">
                pour {member?.firstName} {member?.lastName}
              </p>
            </div>
            <div class="px-6">
              <Button variant="outline" class="w-full" onClick={handleCancel}>
                Annuler
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
