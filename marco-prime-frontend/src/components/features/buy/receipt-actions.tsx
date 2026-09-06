import { signal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { Loader2, RotateCcw } from "lucide-preact";
import { shopping } from "../../../contexts/shopping-context";
import { useMember } from "../../../contexts/member-context";
import { setTicket } from "../../../contexts/ticket-context";
import { hasInsufficientBalance } from "../../../utils/validation";
import { purchaseResponseSchema, type PurchaseResponse } from "../../../schemas/purchase.schema";
import { TICKET_ROUTE_URL } from "../../../pages/ticket";
import { Button } from "../../ui/button";
import { apiHeaders, apiUrl } from "../../../config/api";

const isLoading = signal(false);

export function ResetButton() {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={shopping.reset}
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
  const insufficientBalance = hasInsufficientBalance(
    shopping.total.value,
    data?.balance ?? 0,
  );
  const canSubmit =
    shopping.total.value > 0 &&
    data &&
    !insufficientBalance &&
    !isLoading.value;

  const handlePurchase = async () => {
    if (!data) return;

    isLoading.value = true;
    const transactions: PurchaseResponse["transaction"][] = [];
    const products = [...shopping.selected.value];
    const totalPrice = shopping.total.value;

    try {
      for (const product of products) {
        const response = await fetch(apiUrl("purchase"), {
          method: "POST",
          headers: apiHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            productId: product.id,
            cardNumber: data.cardNumber,
            amount: product.amount,
          }),
        });

        if (!response.ok) {
          throw new Error(`Erreur: ${response.status}`);
        }

        const json = await response.json();
        const result = purchaseResponseSchema.parse(json);
        transactions.push(result.transaction);
      }

      const lastTransaction = transactions[transactions.length - 1];

      setTicket({
        type: "purchase",
        transactions,
        products,
        totalPrice,
        memberName: `${data.firstName} ${data.lastName}`,
        newBalance: lastTransaction.newBalance,
        date: lastTransaction.date,
      });

      shopping.reset();
      clear();
      isLoading.value = false;
      route(TICKET_ROUTE_URL);
    } catch (error) {
      console.error("Erreur de paiement:", error);
      isLoading.value = false;
    }
  };

  return (
    <Button
      disabled={!canSubmit}
      variant={insufficientBalance ? "destructive" : "default"}
      onClick={handlePurchase}
    >
      {isLoading.value ? (
        <Loader2 class="size-5 animate-spin" />
      ) : (
        `Payer ${shopping.total.value.toFixed(2)}€`
      )}
    </Button>
  );
}
