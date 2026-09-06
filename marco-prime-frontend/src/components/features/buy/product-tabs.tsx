import z from "zod";
import { AlertCircle, RefreshCw } from "lucide-preact";
import { useEffect } from "preact/hooks";
import { apiUrl } from "../../../config/api";
import { PRODUCT_PAGE_SIZE, PRODUCT_TYPE_COUNT } from "../../../constants";
import { cn } from "../../../utils/cn";
import { capitalize } from "../../../utils/string";
import { useApi } from "../../../hooks/use-api";
import { useSafeSearchParams } from "../../../hooks/use-safe-search-params";
import { BUY_ROUTE_URL } from "../../../pages/buy";
import { buySearchParamsSchema } from "../../../schemas/pagination.schema";
import { productTypeSchema } from "../../../schemas/product.schema";
import { NextPageButton, PrevPageButton } from "../../layout/page-buttons";
import { Button } from "../../ui/button";
import { TabSkeleton } from "../../shared/loading/tab-skeleton";

export function ProductTabs() {
  const { data, loading, error, refetch } = useApi(
    z.array(productTypeSchema),
    apiUrl("product-types"),
  );
  const { searchParams, route } = useSafeSearchParams(buySearchParamsSchema);

  useEffect(() => {
    if (!data?.length) return;
    const categoryExists = data.some(
      (category) => category.id === searchParams.categoryId,
    );
    if (!categoryExists) {
      route(`${BUY_ROUTE_URL}?categoryId=${data[0]!.id}&page=1`);
    }
  }, [data, searchParams.categoryId]);

  if (loading) {
    return (
      <header class="flex items-center gap-2">
        <div class="flex-1 min-w-0 flex gap-2 overflow-x-auto">
          {new Array(PRODUCT_TYPE_COUNT).fill(null).map((_, id) => (
            <TabSkeleton key={id} />
          ))}
        </div>
        <PrevPageButton disabled />
        <NextPageButton disabled />
      </header>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <header class="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-card px-4 py-2">
        <div class="flex items-center gap-2 text-destructive">
          <AlertCircle class="size-4" />
          <span class="text-sm font-medium">Catégories indisponibles</span>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw class="size-4" /> Réessayer
        </Button>
      </header>
    );
  }

  const [currentTab] = data?.filter(
    (tab) => tab.id === searchParams.categoryId,
  );

  return (
    <header class="flex items-center gap-2">
      <div class="flex-1 min-w-0 flex overflow-x-auto">
        {data.map((productType) => (
          <Tab
            key={productType.id}
            label={productType.type}
            category={productType.id}
          />
        ))}
      </div>
      <PrevPageButton disabled={searchParams.page === 1} />
      <NextPageButton
        disabled={
          !currentTab ||
          searchParams.page * PRODUCT_PAGE_SIZE >= currentTab.productCount
        }
      />
    </header>
  );
}

function Tab({ label, category }: { label: string; category: number }) {
  const { searchParams, route } = useSafeSearchParams(buySearchParamsSchema);
  const isActive = category === searchParams.categoryId;

  return (
    <Button
      class={cn(isActive && "text-primary hover:text-primary")}
      variant="ghost"
      onClick={() => route(`${BUY_ROUTE_URL}?categoryId=${category}`)}
      size="sm"
    >
      {capitalize(label)}
    </Button>
  );
}
