import { useSafeSearchParams } from "../../../hooks/use-safe-search-params";
import { pageSearchParamsSchema } from "../../../schemas/pagination.schema";
import type { PaginationSchema } from "../../../schemas/product.schema";
import { NextPageButton, PrevPageButton } from "../../layout/page-buttons";
import { Skeleton } from "../../ui/skeleton";

interface HistoryNavigationProps {
  pagination: PaginationSchema | null;
  loading: boolean;
}

export function HistoryNavigation({ pagination, loading }: HistoryNavigationProps) {
  const { searchParams } = useSafeSearchParams(pageSearchParamsSchema);

  if (loading || !pagination) {
    return (
      <header class="flex items-center justify-between">
        <Skeleton class="h-6 w-48" />
        <div class="flex gap-2">
          <PrevPageButton disabled />
          <NextPageButton disabled />
        </div>
      </header>
    );
  }

  return (
    <header class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">
        Page {pagination.page} / {pagination.totalPages} ({pagination.total}{" "}
        commandes)
      </span>
      <div class="flex gap-2">
        <PrevPageButton disabled={searchParams.page === 1} />
        <NextPageButton disabled={searchParams.page >= pagination.totalPages} />
      </div>
    </header>
  );
}
