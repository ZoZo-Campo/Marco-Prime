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
      {new Array(HISTORY_SKELETON_COUNT).fill(null).map((_, index) => (
        <div
          key={index}
          class="flex items-center gap-10 py-3 px-3 border-b last:border-b-0"
        >
          <Skeleton class="h-3 w-32" />
          <Skeleton class="h-3 w-24" />
          <Skeleton class="h-3 w-20 ml-auto" />
          <Skeleton class="h-3 w-20" />
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

  return (
    <Card class="min-h-0 gap-0 py-0 overflow-auto">
      {orders.map((order) => (
        <HistoryItem key={order.id} order={order} />
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
