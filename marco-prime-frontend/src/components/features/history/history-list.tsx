import { AlertCircle, RefreshCw } from "lucide-preact";
import { HISTORY_SKELETON_COUNT } from "../../../constants";
import type { OrderSchema } from "../../../schemas/order.schema";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Skeleton } from "../../ui/skeleton";
import { HistoryItem } from "./history-item";

function HistoryListSkeleton() {
  return (
    <Card class="min-h-0 gap-0 py-0 overflow-auto">
      <div class="grid min-w-[60rem] grid-cols-[minmax(10rem,1.4fr)_minmax(9rem,1.4fr)_7rem_7rem_7rem_7rem] items-center gap-4 border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Membre</span>
        <span>Opération</span>
        <span class="text-right">Montant</span>
        <span class="text-right">Ancien solde</span>
        <span class="text-right">Nouveau solde</span>
        <span class="text-right">Date</span>
      </div>
      {new Array(HISTORY_SKELETON_COUNT).fill(null).map((_, index) => (
        <div
          key={index}
          class="grid min-w-[60rem] grid-cols-[minmax(10rem,1.4fr)_minmax(9rem,1.4fr)_7rem_7rem_7rem_7rem] items-center gap-4 border-b px-3 py-3 last:border-b-0"
        >
          <Skeleton class="h-3 w-32" />
          <Skeleton class="h-3 w-24" />
          <Skeleton class="ml-auto h-3 w-20" />
          <Skeleton class="ml-auto h-3 w-20" />
          <Skeleton class="ml-auto h-3 w-20" />
          <Skeleton class="ml-auto h-3 w-20" />
        </div>
      ))}
    </Card>
  );
}

interface HistoryListProps {
  orders: OrderSchema[] | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreError: Error | null;
  onLoadMore: () => void;
  onRetry: () => void;
}

export function HistoryList({
  orders,
  loading,
  loadingMore,
  hasMore,
  loadMoreError,
  onLoadMore,
  onRetry,
}: HistoryListProps) {
  if (loading || !orders) {
    return <HistoryListSkeleton />;
  }

  if (orders.length === 0) {
    return (
      <Card class="flex min-h-0 flex-1 items-center justify-center py-0 text-muted-foreground">
        Aucune commande dans l’historique.
      </Card>
    );
  }

  const balancesByOrder = calculateBalances(orders);

  return (
    <Card class="min-h-0 gap-0 py-0 overflow-auto">
      <div class="sticky top-0 z-10 grid min-w-[60rem] grid-cols-[minmax(10rem,1.4fr)_minmax(9rem,1.4fr)_7rem_7rem_7rem_7rem] items-center gap-4 border-b bg-card px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Membre</span>
        <span>Opération</span>
        <span class="text-right">Montant</span>
        <span class="text-right">Ancien solde</span>
        <span class="text-right">Nouveau solde</span>
        <span class="text-right">Date</span>
      </div>
      {orders.map((order) => (
        <HistoryItem
          key={order.id}
          order={order}
          previousBalance={balancesByOrder.get(order.id)?.previousBalance ?? null}
          newBalance={balancesByOrder.get(order.id)?.newBalance ?? null}
        />
      ))}
      {loadMoreError ? (
        <div class="flex min-h-16 items-center justify-center gap-3 p-2 text-destructive">
          <AlertCircle class="size-5" />
          <span>Impossible de charger les anciennes commandes.</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw class="size-4" /> Réessayer
          </Button>
        </div>
      ) : hasMore ? (
        <div class="flex justify-center p-3">
          <Button
            class="min-h-14 min-w-72 text-lg"
            variant="outline"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Chargement…" : "Afficher les commandes précédentes"}
          </Button>
        </div>
      ) : orders.length > 0 ? (
        <p class="p-4 text-center text-sm text-muted-foreground">
          Toutes les commandes sont affichées.
        </p>
      ) : null}
    </Card>
  );
}

interface HistoricalBalance {
  previousBalance: string;
  newBalance: string;
}

function calculateBalances(orders: OrderSchema[]) {
  const runningBalances = new Map<number, number>();
  const balancesByOrder = new Map<number, HistoricalBalance>();

  for (const order of orders) {
    if (!order.member) continue;

    const memberId = order.member.id;
    const currentBalance = runningBalances.get(memberId)
      ?? toCents(order.member.balance);
    if (currentBalance === null) continue;

    const storedAmount = toCents(order.price);
    if (storedAmount === null) continue;

    // Current purchases contain a negative line total. Older Marco versions
    // stored a positive unit price, so their amount must also be applied.
    const ledgerAmount = order.product === null
      ? Math.abs(storedAmount)
      : storedAmount < 0
        ? storedAmount
        : -Math.abs(storedAmount) * order.amount;
    const previousBalance = currentBalance - ledgerAmount;

    balancesByOrder.set(order.id, {
      previousBalance: fromCents(previousBalance),
      newBalance: fromCents(currentBalance),
    });
    runningBalances.set(memberId, previousBalance);
  }

  return balancesByOrder;
}

function toCents(value: string) {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function fromCents(value: number) {
  return `${(value / 100).toFixed(2)} €`;
}
