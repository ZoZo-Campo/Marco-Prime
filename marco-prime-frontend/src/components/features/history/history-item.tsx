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

  const memberName = `${order.member.firstName} ${order.member.lastName}`;
  const productName = order.product?.name ?? "-";

  return (
    <div class="flex items-center gap-4 py-2 px-3 border-b last:border-b-0 text-sm">
      <span class="font-medium truncate w-40">{memberName}</span>
      <span class="text-muted-foreground truncate w-24">{productName}</span>
      <span class="font-medium ml-auto">{order.price} EUR</span>
      <span class="text-muted-foreground w-28 text-right">{formattedDate}</span>
    </div>
  );
}
