import { signal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-preact";
import { shopping } from "../../../contexts/shopping-context";
import { useMember } from "../../../contexts/member-context";
import { setTicket } from "../../../contexts/ticket-context";
import { purchaseResponseSchema } from "../../../schemas/purchase.schema";
import { TICKET_ROUTE_URL } from "../../../pages/ticket";
import { Button } from "../../ui/button";
import { apiHeaders, apiUrl } from "../../../config/api";

const isLoading = signal(false);
const purchaseError = signal<string | null>(null);
const pendingTransactionId = signal<string | null>(null);

export function ResetButton() {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => {
        shopping.reset();
        purchaseError.value = null;
        pendingTransactionId.value = null;
      }}
      type="reset"
      disabled={shopping.selected.value.length === 0}
    >
      <RotateCcw class="size-5" />
    </Button>
  );
}

export function SubmitButton() {
  const { route } = useLocation();
  const { data, clear } = useMember();
  const canSubmit =
    shopping.total.value > 0 &&
    data &&
    !isLoading.value;

  const handlePurchase = async () => {
    if (!data) return;

    isLoading.value = true;
    purchaseError.value = null;
    const products = [...shopping.selected.value];
    const totalPrice = shopping.total.value;
    const transactionId = pendingTransactionId.value ?? crypto.randomUUID();
    pendingTransactionId.value = transactionId;

    try {
      const response = await fetch(apiUrl("purchase"), {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          transactionId,
          cardNumber: data.cardNumber,
          items: products.map((product) => ({
            productId: product.id,
            amount: product.amount,
          })),
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : `Paiement refusé (erreur ${response.status})`;
        pendingTransactionId.value = null;
        purchaseError.value = message;
        return;
      }

      const result = purchaseResponseSchema.parse(await response.json());

      setTicket({
        type: "purchase",
        transaction: result.transaction,
        products,
        totalPrice,
        memberName: `${data.firstName} ${data.lastName}`,
        newBalance: result.transaction.newBalance,
        date: result.transaction.date,
      });

      pendingTransactionId.value = null;
      shopping.reset();
      clear();
      route(TICKET_ROUTE_URL);
    } catch (error) {
      console.error("Erreur de paiement:", error);
      purchaseError.value =
        "Connexion perdue : résultat incertain. Réessayez pour vérifier avec le même numéro de transaction.";
    } finally {
      isLoading.value = false;
    }
  };

  return (
    <Button
      disabled={!canSubmit}
      variant="default"
      onClick={handlePurchase}
    >
      {isLoading.value ? (
        <Loader2 class="size-5 animate-spin" />
      ) : (
        `${pendingTransactionId.value ? "Réessayer" : "Payer"} ${shopping.total.value.toFixed(2)}€`
      )}
    </Button>
  );
}

export function PurchaseError() {
  if (!purchaseError.value) return null;

  return (
    <div class="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertTriangle class="size-5 shrink-0" />
      <span>{purchaseError.value}</span>
    </div>
  );
}
