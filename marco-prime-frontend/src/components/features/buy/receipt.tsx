import { MAX_RECEIPT_PRODUCTS } from "../../../constants";
import { shopping } from "../../../contexts/shopping-context";
import { MemberCard } from "./member-card";
import { ResetButton, SubmitButton } from "./receipt-actions";
import { ReceiptItem } from "./receipt-item";

export function Receipt() {
  return (
    <div class="border-l bg-card px-7 py-5 flex flex-col gap-5">
      <div class="flex items-center">
        <h2 class="text-xl font-semibold flex-1">Commande</h2>
        <ResetButton />
      </div>
      <MemberCard />
      <ul class="flex-1 space-y-2">
        {shopping.selected.value
          .slice(0, MAX_RECEIPT_PRODUCTS)
          .map((product) => (
            <ReceiptItem key={product.id} product={product} />
          ))}
        <MoreReceiptItems
          count={shopping.selected.value.length - MAX_RECEIPT_PRODUCTS}
        />
      </ul>
      <SubmitButton />
    </div>
  );
}

function MoreReceiptItems({ count }: { count: number }) {
  if (count <= 0) return;

  return (
    <li class="w-full font-semibold text-muted-foreground">
      {count} en plus...
    </li>
  );
}
