import { useLocation } from "preact-iso";
import { useEffect } from "preact/hooks";
import { Check } from "lucide-preact";
import { ticketSignal, clearTicket } from "../contexts/ticket-context";
import { Card } from "../components/ui/card";
import { BUY_ROUTE_URL } from "./buy";

export const TICKET_ROUTE_URL = "/ticket";

export function TicketPage() {
  const { route } = useLocation();
  const ticket = ticketSignal.value;

  useEffect(() => {
    if (!ticket) {
      route(BUY_ROUTE_URL);
    }
  }, [ticket]);

  if (!ticket) return null;

  const handleClick = () => {
    clearTicket();
    route(BUY_ROUTE_URL);
  };

  const formattedDate = new Date(ticket.date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      class="flex-1 flex items-center justify-center p-4 cursor-pointer"
      onClick={handleClick}
    >
      <Card class="w-full max-w-md gap-4 py-4">
        <div class="flex items-center justify-center gap-2 text-green-600">
          <Check class="size-8" />
          <h1 class="text-2xl font-bold">
            {ticket.type === "purchase" ? "Paiement validé" : "Rechargement validé"}
          </h1>
        </div>

        <div class="px-6 text-center">
          <p class="text-lg font-medium">{ticket.memberName}</p>
          <p class="text-sm text-muted-foreground">{formattedDate}</p>
        </div>

        {ticket.type === "purchase" ? (
          <PurchaseTicketContent ticket={ticket} />
        ) : (
          <RechargeTicketContent ticket={ticket} />
        )}

        <p class="text-center text-sm text-muted-foreground pt-2">
          Touchez l'écran pour continuer
        </p>
      </Card>
    </div>
  );
}

function PurchaseTicketContent({ ticket }: { ticket: Extract<typeof ticketSignal.value, { type: "purchase" }> }) {
  if (!ticket) return null;

  return (
    <>
      <div class="px-6 border-t border-b py-3">
        {ticket.products.map((product) => (
          <div key={product.id} class="flex justify-between py-1 text-sm">
            <span>
              {product.amount}x {product.name}
            </span>
            <span>{(Number(product.price) * product.amount).toFixed(2)} EUR</span>
          </div>
        ))}
      </div>

      <div class="px-6 flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>-{ticket.totalPrice.toFixed(2)} EUR</span>
      </div>

      <div class="px-6 pt-2 border-t">
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Nouveau solde</span>
          <span class="font-semibold text-green-600">{ticket.newBalance} EUR</span>
        </div>
      </div>
    </>
  );
}

function RechargeTicketContent({ ticket }: { ticket: Extract<typeof ticketSignal.value, { type: "recharge" }> }) {
  if (!ticket) return null;

  return (
    <>
      <div class="px-6 border-t border-b py-3 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Ancien solde</span>
          <span>{ticket.previousBalance} EUR</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Rechargement</span>
          <span class="text-green-600">+{ticket.amount} EUR</span>
        </div>
      </div>

      <div class="px-6 flex justify-between font-bold text-lg">
        <span>Nouveau solde</span>
        <span class="text-green-600">{ticket.newBalance} EUR</span>
      </div>

      {ticket.processedBy && (
        <div class="px-6 pt-2 border-t">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Validé par</span>
            <span class="font-medium">{ticket.processedBy}</span>
          </div>
        </div>
      )}
    </>
  );
}
