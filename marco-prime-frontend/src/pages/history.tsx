import { HistoryList } from "../components/features/history/history-list";
import { HistoryNavigation } from "../components/features/history/history-navigation";
import { ORDER_PAGE_SIZE } from "../constants";
import { useApi } from "../hooks/use-api";
import { useSafeSearchParams } from "../hooks/use-safe-search-params";
import { orderListResponseSchema } from "../schemas/order.schema";
import { pageSearchParamsSchema } from "../schemas/pagination.schema";
import { apiUrl } from "../config/api";
import { AlertCircle, RefreshCw } from "lucide-preact";
import { Button } from "../components/ui/button";

export const HISTORY_ROUTE_URL = "/history";

export function HistoryPage() {
  const { searchParams } = useSafeSearchParams(pageSearchParamsSchema);

  const { data, loading, error, refetch } = useApi(
    orderListResponseSchema,
    apiUrl(`history?page=${searchParams.page}&limit=${ORDER_PAGE_SIZE}`),
  );

  if (error) {
    return (
      <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <AlertCircle class="size-10 text-destructive" />
        <div>
          <p class="font-semibold">Historique indisponible</p>
          <p class="text-sm text-muted-foreground">
            Vérifiez la connexion au serveur Marco Prime.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw class="size-4" /> Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div class="flex flex-col flex-1 min-h-0 gap-2 p-3">
      <HistoryNavigation
        pagination={data?.pagination ?? null}
        loading={loading}
      />
      <HistoryList orders={data?.data ?? null} loading={loading} />
    </div>
  );
}
