import { HistoryList } from "../components/features/history/history-list";
import { HistoryNavigation } from "../components/features/history/history-navigation";
import { ORDER_PAGE_SIZE } from "../constants";
import { useApi } from "../hooks/use-api";
import { useSafeSearchParams } from "../hooks/use-safe-search-params";
import { orderListResponseSchema } from "../schemas/order.schema";
import { pageSearchParamsSchema } from "../schemas/pagination.schema";
import { apiUrl } from "../config/api";

export const HISTORY_ROUTE_URL = "/history";

export function HistoryPage() {
  const { searchParams } = useSafeSearchParams(pageSearchParamsSchema);

  const { data, loading } = useApi(
    orderListResponseSchema,
    apiUrl(`history?page=${searchParams.page}&limit=${ORDER_PAGE_SIZE}`),
  );

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
