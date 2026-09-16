import type { ComponentChildren } from "preact";
import {
  AlertCircle,
  BarChart3,
  Calculator,
  Check,
  CreditCard,
  Loader2,
  Package,
  Power,
  Save,
  Search,
  ShieldAlert,
  ShoppingBasket,
  UsersRound,
  Wifi,
  X,
} from "lucide-preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { apiHeaders, apiUrl } from "../config/api";
import { MemberProvider, useMember } from "../contexts/member-context";
import { useApi } from "../hooks/use-api";
import {
  catalogSelectionSchema,
  type CatalogSelectionProduct,
} from "../schemas/product.schema";
import { cn } from "../utils/cn";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { StatisticsPanel } from "../components/features/config/statistics-panel";
import { WifiPanel } from "../components/features/config/wifi-panel";
import { AccountingPanel } from "../components/features/config/accounting-panel";
import { MembersPanel } from "../components/features/config/members-panel";
import { FouailleProductsPanel } from "../components/features/config/fouaille-products-panel";
import { Keypad } from "../components/features/recharge/keypad";
import { OnScreenKeyboard } from "../components/shared/on-screen-keyboard";

export const CONFIG_ROUTE_URL = "/config";

type SaveState = "idle" | "saving" | "saved" | "error";
type AdminSection = "catalog" | "statistics" | "accounting" | "wifi" | "members" | "fouaille-products";
const KIOSK_CONTROL_URL = "http://127.0.0.1:3210";

export function ConfigPage() {
  return (
    <MemberProvider>
      <ConfigContent />
    </MemberProvider>
  );
}

function ConfigContent() {
  const {
    data: member,
    loading: memberLoading,
    error: memberError,
    inputLength,
    retry,
    submitCardNumber,
    clear,
    pause,
  } = useMember();
  const [manualCardNumber, setManualCardNumber] = useState("");
  const isAdmin = member?.admin === true;
  useEffect(() => {
    if (isAdmin) pause();
  }, [isAdmin]);
  const {
    data: catalog,
    loading: catalogLoading,
    error: catalogError,
    refetch,
  } = useApi(catalogSelectionSchema, apiUrl("catalog-selection"), {
    immediate: isAdmin,
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogKeyboard, setCatalogKeyboard] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [section, setSection] = useState<AdminSection>("catalog");
  const [kioskControlAvailable, setKioskControlAvailable] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [closingKiosk, setClosingKiosk] = useState(false);
  const [kioskExitError, setKioskExitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setKioskControlAvailable(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1_500);
    fetch(`${KIOSK_CONTROL_URL}/status`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => setKioskControlAvailable(response.ok))
      .catch(() => setKioskControlAvailable(false))
      .finally(() => window.clearTimeout(timer));
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!catalog) return;
    setSelectedIds(
      new Set(
        catalog
          .filter((product) => product.enabledOnMarco)
          .map((product) => product.id),
      ),
    );
    setDirty(false);
  }, [catalog]);

  const categories = useMemo(() => groupByCategory(catalog ?? []), [catalog]);
  const filteredCategories = useMemo(() => {
    const needle = catalogQuery.trim().toLocaleLowerCase("fr");
    if (!needle) return categories;
    return categories.map((category) => ({
      ...category,
      products: category.products.filter((product) =>
        `${product.name} ${product.title}`.toLocaleLowerCase("fr").includes(needle)),
    })).filter((category) => category.products.length > 0);
  }, [categories, catalogQuery]);

  if (!member) {
    return (
      <div class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-3">
        <Card class="grid w-full max-w-4xl gap-4 p-4 md:grid-cols-[1fr_20rem]">
          <div class="flex flex-col items-center justify-center gap-3 text-center">
            {memberLoading ? (
              <Loader2 class="size-12 animate-spin text-primary" />
            ) : memberError ? (
              <AlertCircle class="size-14 text-destructive" />
            ) : (
              <CreditCard class="size-14 text-primary" />
            )}
            <h1 class="text-2xl font-bold">Accès administrateur</h1>
            <p class={cn("text-base", memberError ? "text-destructive" : "text-muted-foreground")}>
              {memberError
                ? "Carte inconnue ou serveur indisponible. Corrigez le numéro ou réessayez."
                : inputLength > 0
                  ? `Lecture RFID en cours : ${inputLength} chiffre${inputLength > 1 ? "s" : ""}.`
                  : "Scannez la carte ou saisissez son numéro avec le pavé tactile."}
            </p>
            {memberError && (
              <Button variant="outline" onClick={() => void retry()} disabled={memberLoading}>
                Réessayer la même carte
              </Button>
            )}
          </div>

          <form
            class="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitCardNumber(manualCardNumber);
            }}
          >
            <div
              class="flex min-h-12 items-center justify-center rounded-md border bg-background px-3 text-center text-2xl font-semibold tracking-wider"
              aria-label="Numéro de carte saisi"
            >
              {manualCardNumber || "—"}
            </div>
            <Keypad
              value={manualCardNumber}
              onChange={setManualCardNumber}
              maxLength={32}
              disabled={memberLoading}
            />
            <Button
              type="submit"
              size="lg"
              disabled={memberLoading || !/^\d{5,32}$/.test(manualCardNumber)}
            >
              {memberLoading ? <Loader2 class="size-5 animate-spin" /> : <Check class="size-5" />}
              Valider la carte
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setManualCardNumber("");
                clear();
              }}
            >
              Effacer et recommencer
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <CenteredCard>
        <ShieldAlert class="size-16 text-destructive" />
        <h1 class="text-3xl font-bold">Accès administrateur requis</h1>
        <p class="text-lg text-muted-foreground">
          La carte de {member.firstName} {member.lastName} n'est pas autorisée.
        </p>
        <Button onClick={clear}>Scanner une autre carte</Button>
      </CenteredCard>
    );
  }

  const toggleProduct = (productId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    setDirty(true);
    setSaveState("idle");
  };

  const selectAll = () => {
    if (catalogQuery.trim()) {
      setSelectedIds((current) => new Set([
        ...current,
        ...filteredCategories.flatMap((category) => category.products.map((product) => product.id)),
      ]));
    } else {
      setSelectedIds(new Set((catalog ?? []).map((product) => product.id)));
    }
    setDirty(true);
    setSaveState("idle");
  };

  const clearSelection = () => {
    if (catalogQuery.trim()) {
      const visibleIds = new Set(filteredCategories.flatMap((category) => category.products.map((product) => product.id)));
      setSelectedIds((current) => new Set([...current].filter((id) => !visibleIds.has(id))));
    } else {
      setSelectedIds(new Set());
    }
    setDirty(true);
    setSaveState("idle");
  };

  const saveSelection = async () => {
    setSaveState("saving");

    try {
      const response = await fetch(apiUrl("catalog-selection"), {
        method: "PUT",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          adminCardNumber: member.cardNumber,
          productIds: [...selectedIds],
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await refetch();
      setSaveState("saved");
      setDirty(false);
    } catch (error) {
      console.error("Erreur de configuration du catalogue:", error);
      setSaveState("error");
    }
  };

  const closeKiosk = async () => {
    setClosingKiosk(true);
    setKioskExitError(null);
    try {
      const response = await fetch(`${KIOSK_CONTROL_URL}/exit`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch {
      setClosingKiosk(false);
      setKioskExitError(
        "Impossible de fermer automatiquement. Utilisez Alt+F4.",
      );
    }
  };

  const adminNavigation = (
    <>
      <nav class="flex shrink-0 items-center gap-3 overflow-x-auto border-b bg-card px-7 py-3">
        <Button
          variant={section === "catalog" ? "default" : "outline"}
          onClick={() => setSection("catalog")}
        >
          <ShoppingBasket class="size-5" /> Catalogue
        </Button>
        <Button variant={section === "fouaille-products" ? "default" : "outline"} onClick={() => setSection("fouaille-products")}>
          <Package class="size-5" /> Produits Fouaille
        </Button>
        <Button
          variant={section === "statistics" ? "default" : "outline"}
          onClick={() => setSection("statistics")}
        >
          <BarChart3 class="size-5" /> Statistiques
        </Button>
        <Button
          variant={section === "accounting" ? "default" : "outline"}
          onClick={() => setSection("accounting")}
        >
          <Calculator class="size-5" /> Compta
        </Button>
        <Button variant={section === "members" ? "default" : "outline"} onClick={() => setSection("members")}>
          <UsersRound class="size-5" /> Membres
        </Button>
        <Button
          variant={section === "wifi" ? "default" : "outline"}
          onClick={() => setSection("wifi")}
        >
          <Wifi class="size-5" /> Wi-Fi
        </Button>
        <span class="ml-auto shrink-0 text-sm text-muted-foreground">
          {member.firstName} {member.lastName}
        </span>
        {kioskControlAvailable && (
          <Button
            class="shrink-0"
            variant="destructive"
            onClick={() => {
              setKioskExitError(null);
              setShowExitDialog(true);
            }}
          >
            <Power class="size-5" /> Fermer Marco
          </Button>
        )}
      </nav>

      {showExitDialog && (
        <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
          <Card
            class="w-full max-w-lg p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-marco-title"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 id="close-marco-title" class="text-2xl font-bold">
                  Fermer l’écran Marco ?
                </h2>
                <p class="mt-2 text-muted-foreground">
                  Chromium sera fermé et le Bureau réapparaîtra. Docker et
                  l’API continueront de fonctionner.
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Annuler"
                disabled={closingKiosk}
                onClick={() => setShowExitDialog(false)}
              >
                <X />
              </Button>
            </div>
            {kioskExitError && (
              <p class="mt-4 text-destructive">{kioskExitError}</p>
            )}
            <div class="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={closingKiosk}
                onClick={() => setShowExitDialog(false)}
              >
                Rester sur Marco
              </Button>
              <Button
                variant="destructive"
                disabled={closingKiosk}
                onClick={() => void closeKiosk()}
              >
                {closingKiosk ? (
                  <Loader2 class="animate-spin" />
                ) : (
                  <Power />
                )}
                Fermer et revenir au Bureau
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );

  if (section === "statistics") {
    return (
      <div class="flex flex-1 min-h-0 flex-col overflow-hidden">
        {adminNavigation}
        <StatisticsPanel adminCardNumber={member.cardNumber} />
      </div>
    );
  }

  if (section === "members") {
    return <div class="flex flex-1 min-h-0 flex-col overflow-hidden">
      {adminNavigation}
      <MembersPanel adminCardNumber={member.cardNumber} />
    </div>;
  }

  if (section === "fouaille-products") {
    return <div class="flex flex-1 min-h-0 flex-col overflow-hidden">
      {adminNavigation}
      <FouailleProductsPanel adminCardNumber={member.cardNumber} onChanged={() => void refetch()} />
    </div>;
  }

  if (section === "wifi") {
    return (
      <div class="flex flex-1 min-h-0 flex-col overflow-hidden">
        {adminNavigation}
        <WifiPanel adminCardNumber={member.cardNumber} />
      </div>
    );
  }

  if (section === "accounting") {
    return (
      <div class="flex flex-1 min-h-0 flex-col overflow-hidden">
        {adminNavigation}
        <AccountingPanel adminCardNumber={member.cardNumber} />
      </div>
    );
  }

  return (
    <div class="flex flex-1 min-h-0 flex-col overflow-hidden">
      {adminNavigation}
      <header class="flex items-center justify-between gap-5 border-b bg-card px-7 py-4">
        <div>
          <h1 class="text-2xl font-bold">Produits vendus ce soir</h1>
          <p class="text-sm text-muted-foreground">
            {selectedIds.size} produit{selectedIds.size > 1 ? "s" : ""}{" "}
            sélectionné{selectedIds.size > 1 ? "s" : ""} · {member.firstName}{" "}
            {member.lastName}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            {catalogQuery.trim() ? "Cocher les résultats" : "Tout cocher"}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            {catalogQuery.trim() ? "Décocher les résultats" : "Tout décocher"}
          </Button>
          <Button
            onClick={saveSelection}
            disabled={!dirty || saveState === "saving"}
          >
            {saveState === "saving" ? (
              <Loader2 class="size-5 animate-spin" />
            ) : (
              <Save class="size-5" />
            )}
            Enregistrer
          </Button>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto px-7 py-5">
        <div class="mb-5 flex items-center gap-3 rounded border bg-background px-3">
          <Search class="size-5 text-muted-foreground" />
          <input class="min-h-12 min-w-0 flex-1 bg-transparent text-lg outline-none" value={catalogQuery}
            placeholder="Chercher un produit à vendre ce soir" onInput={(event) => setCatalogQuery(event.currentTarget.value)} />
          <Button variant="ghost" size="sm" onClick={() => setCatalogKeyboard(!catalogKeyboard)}>
            {catalogKeyboard ? "Masquer clavier" : "Clavier tactile"}
          </Button>
        </div>
        {catalogKeyboard && <div class="mb-5 overflow-x-auto rounded border bg-background p-2">
          <OnScreenKeyboard value={catalogQuery} onChange={setCatalogQuery} />
        </div>}
        {catalogLoading && (
          <div class="flex h-full items-center justify-center">
            <Loader2 class="size-12 animate-spin text-primary" />
          </div>
        )}

        {catalogError && (
          <CenteredCard>
            <ShieldAlert class="size-12 text-destructive" />
            <h2 class="text-xl font-semibold">Catalogue Fouaille indisponible</h2>
            <Button onClick={refetch}>Réessayer</Button>
          </CenteredCard>
        )}

        {!catalogLoading && !catalogError && catalog?.length === 0 && (
          <CenteredCard>
            <h2 class="text-xl font-semibold">Aucun produit disponible</h2>
            <p class="text-muted-foreground">
              Vérifiez la synchronisation avec Fouaille Manager.
            </p>
          </CenteredCard>
        )}

        {!catalogLoading && !catalogError && catalogQuery.trim() && filteredCategories.length === 0 && (
          <p class="py-8 text-center text-muted-foreground">Aucun produit ne correspond à cette recherche.</p>
        )}

        <div class="flex flex-col gap-7">
          {filteredCategories.map((category) => (
            <section key={category.id}>
              <h2 class="mb-3 text-lg font-semibold">{category.name}</h2>
              <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {category.products.map((product) => {
                  const selected = selectedIds.has(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleProduct(product.id)}
                      class={cn(
                        "relative min-h-28 border bg-card p-4 text-left transition-all hover:bg-accent",
                        selected &&
                          "border-primary bg-primary/10 ring-2 ring-primary/40",
                      )}
                    >
                      {selected && (
                        <span class="absolute right-3 top-3 rounded-full bg-primary p-1 text-primary-foreground">
                          <Check class="size-4" />
                        </span>
                      )}
                      <p class="pr-8 text-lg font-semibold">{product.name}</p>
                      <p class="mt-1 text-sm text-muted-foreground">
                        {product.title}
                      </p>
                      <p class="mt-3 font-medium">{product.price} €</p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {saveState === "saved" && (
        <div class="border-t border-green-500/30 bg-green-500/10 px-7 py-2 text-center text-green-400">
          Sélection enregistrée. L'écran Achats est déjà à jour.
        </div>
      )}
      {saveState === "error" && (
        <div class="border-t border-destructive/30 bg-destructive/10 px-7 py-2 text-center text-destructive">
          Impossible d'enregistrer la sélection. Réessayez.
        </div>
      )}
    </div>
  );
}

function CenteredCard({ children }: { children: ComponentChildren }) {
  return (
    <div class="flex flex-1 items-center justify-center p-7">
      <Card class="items-center px-10 py-10">{children}</Card>
    </div>
  );
}

function groupByCategory(products: CatalogSelectionProduct[]) {
  const categories = new Map<
    number,
    { id: number; name: string; products: CatalogSelectionProduct[] }
  >();

  for (const product of products) {
    const category = categories.get(product.productTypeId) ?? {
      id: product.productTypeId,
      name: product.productType,
      products: [],
    };
    category.products.push(product);
    categories.set(product.productTypeId, category);
  }

  return [...categories.values()];
}
