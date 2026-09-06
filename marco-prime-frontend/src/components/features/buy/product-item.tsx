import type { ProductSchema } from "../../../schemas/product.schema";
import { useMember } from "../../../contexts/member-context";
import { cn } from "../../../utils/cn";
import { closestColor } from "../../../utils/colors";

interface ProductItemProps {
  product: ProductSchema;
  amount: number;
  onClick: () => void;
}

export function ProductItem({ product, amount, onClick }: ProductItemProps) {
  const { data } = useMember();
  const color = closestColor(product.color);
  const selected = amount > 0;

  return (
    <button
      key={product.id}
      style={{
        borderColor: color,
        backgroundColor: selected ? `${color}30` : "var(--color-card)",
      }}
      class={cn(
        " border justify-center items-center disabled:cursor-default cursor-pointer flex flex-col gap-3 hover:brightness-90 select-none text-card-foreground disabled:opacity-50 disabled:border-border",
      )}
      onClick={onClick}
      disabled={!data}
    >
      <span class="text-xl font-semibold text-center line-clamp-2">
        {product.name}
      </span>
      {amount > 0 ? <span>x {amount}</span> : <span></span>}
      <span class={cn("text-lg", " text-muted-foreground")}>
        {product.price}€
      </span>
    </button>
  );
}
