import type { ProductInCart } from "../../../contexts/shopping-context";

interface ReceiptItemProps {
  product: ProductInCart;
}

export function ReceiptItem({ product }: ReceiptItemProps) {
  return (
    <li class="w-full flex items-center gap-2">
      <span class="font-semibold flex-1 line-clamp-1">{product.name}</span>
      <span class="text-muted-foreground">
        {product.amount} x {product.price}€
      </span>
    </li>
  );
}
