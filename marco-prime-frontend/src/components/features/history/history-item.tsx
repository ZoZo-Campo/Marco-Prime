import type { OrderSchema } from "../../../schemas/order.schema";

interface HistoryItemProps {
  order: OrderSchema;
}

export function HistoryItem({ order }: HistoryItemProps) {
  const formattedDate = new Date(order.date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const memberName = order.member
    ? `${order.member.firstName} ${order.member.lastName}`
    : "Membre supprimé";
  const isRecharge = order.product === null;
  const productName = order.product?.name ?? "Rechargement";
  const ledgerAmount = Number(order.price);
  const formattedAmount = Number.isFinite(ledgerAmount)
    ? `${ledgerAmount > 0 ? "+" : ""}${ledgerAmount.toFixed(2)} EUR`
    : "Montant invalide";
  const hasInvalidSign = isRecharge ? ledgerAmount <= 0 : ledgerAmount >= 0;

  return (
    <div class="flex items-center gap-4 py-2 px-3 border-b last:border-b-0 text-sm">
      <span class="font-medium truncate w-40">{memberName}</span>
      <span class="text-muted-foreground truncate w-28">
        {isRecharge ? productName : `${order.amount}x ${productName}`}
      </span>
      <span
        class={`font-medium ml-auto ${
          hasInvalidSign
            ? "text-amber-600"
            : isRecharge
              ? "text-green-600"
              : "text-destructive"
        }`}
        title={hasInvalidSign ? "Signe comptable incohérent" : undefined}
      >
        {formattedAmount}
      </span>
      <span class="text-muted-foreground w-28 text-right">{formattedDate}</span>
    </div>
  );
}
