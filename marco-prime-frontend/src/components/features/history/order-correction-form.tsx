import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { apiHeaders, apiUrl } from "../../../config/api";
import { MemberProvider, useMember } from "../../../contexts/member-context";
import type { OrderSchema } from "../../../schemas/order.schema";
import {
  catalogSelectionSchema,
  type CatalogSelectionProduct,
} from "../../../schemas/product.schema";
import { Button } from "../../ui/button";

interface OrderCorrectionFormProps {
  order: OrderSchema;
  onComplete: () => void;
}

export function OrderCorrectionForm(props: OrderCorrectionFormProps) {
  return (
    <MemberProvider>
      <OrderCorrectionEditor {...props} />
    </MemberProvider>
  );
}

function OrderCorrectionEditor({
  order,
  onComplete,
}: OrderCorrectionFormProps) {
  const {
    data: member,
    loading: memberLoading,
    error: memberError,
    inputLength,
    retry,
    clear,
    pause,
    resume,
  } = useMember();
  const [products, setProducts] = useState<CatalogSelectionProduct[]>([]);
  const [replacementProductId, setReplacementProductId] = useState(
    String(order.product?.id ?? ""),
  );
  const [replacementAmount, setReplacementAmount] = useState(
    String(order.amount),
  );
  const [reason, setReason] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = member?.admin === true;

  useEffect(() => {
    if (member) pause();
    else resume();
  }, [member?.cardNumber]);

  const changeAdministrator = () => {
    clear();
    resume();
  };

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setProductsLoading(true);
    setError(null);
    fetch(apiUrl("catalog-selection"), { headers: apiHeaders() })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return catalogSelectionSchema.parse(await response.json());
      })
      .then((catalogue) => {
        if (!cancelled) setProducts(catalogue);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger le catalogue Fouaille.");
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!member) {
    return (
      <section class="mt-6 border-t pt-5">
        <h3 class="text-xl font-bold">Corriger cette vente</h3>
        <div class="mt-4 flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-5 text-center">
          {memberLoading ? (
            <Loader2 class="size-10 animate-spin text-primary" />
          ) : memberError ? (
            <AlertTriangle class="size-10 text-destructive" />
          ) : (
            <CreditCard class="size-10 text-primary" />
          )}
          {memberError ? (
            <>
              <p class="text-destructive">
                Carte inconnue ou serveur indisponible.
              </p>
              <div class="flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={() => void retry()}>
                  Réessayer
                </Button>
                <Button onClick={clear}>Scanner une autre carte</Button>
              </div>
            </>
          ) : (
            <p class="text-muted-foreground">
              {inputLength > 0
                ? `Saisie en cours : ${inputLength} chiffre${inputLength > 1 ? "s" : ""}. Appuyez sur Entrée.`
                : "Scannez une carte administrateur pour autoriser la correction."}
            </p>
          )}
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section class="mt-6 border-t pt-5">
        <div class="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-5 text-center">
          <ShieldAlert class="size-10 text-destructive" />
          <p class="font-semibold">Cette carte n’est pas administratrice.</p>
          <Button onClick={changeAdministrator}>Scanner une autre carte</Button>
        </div>
      </section>
    );
  }

  const submit = async (cancel: boolean) => {
    const amount = Number(replacementAmount);
    if (
      !cancel &&
      (!Number.isInteger(amount) || amount < 1 || amount > 1000)
    ) {
      setError("La quantité doit être un nombre entier entre 1 et 1000.");
      return;
    }
    if (!cancel && !products.some((product) => product.id === Number(replacementProductId))) {
      setError("Choisissez un produit du catalogue.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Indiquez une raison d’au moins 3 caractères.");
      return;
    }
    if (
      !cancel &&
      Number(replacementProductId) === order.product?.id &&
      amount === order.amount
    ) {
      setError("Modifiez le produit ou la quantité avant d’enregistrer.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(apiUrl("order-corrections/apply"), {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          adminCardNumber: member.cardNumber,
          originalOrderId: order.id,
          replacementProductId: cancel
            ? null
            : Number(replacementProductId),
          replacementAmount: cancel ? 0 : amount,
          reason: reason.trim(),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        throw new Error(
          body?.message ?? body?.error ?? `Erreur HTTP ${response.status}`,
        );
      }
      setSuccess(
        cancel
          ? "Vente annulée et montant recrédité."
          : "Vente corrigée et solde ajusté.",
      );
      window.setTimeout(onComplete, 700);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Correction impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section class="mt-6 border-t pt-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-xl font-bold">Corriger cette vente</h3>
          <p class="text-sm text-muted-foreground">
            Autorisé par {member.firstName} {member.lastName}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={changeAdministrator}>
          Changer d’administrateur
        </Button>
      </div>

      {productsLoading ? (
        <div class="flex justify-center p-8">
          <Loader2 class="size-9 animate-spin text-primary" />
        </div>
      ) : (
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="flex flex-col gap-2 sm:col-span-2">
            Produit corrigé
            <select
              class="min-h-12 border bg-input px-3 py-2 text-lg"
              value={replacementProductId}
              onChange={(event) => {
                setReplacementProductId(event.currentTarget.value);
                setError(null);
              }}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.price} €
                </option>
              ))}
            </select>
          </label>
          <label class="flex flex-col gap-2">
            Quantité corrigée
            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              class="min-h-12 border bg-input px-3 py-2 text-lg"
              value={replacementAmount}
              onInput={(event) => {
                setReplacementAmount(event.currentTarget.value);
                setError(null);
              }}
            />
          </label>
          <label class="flex flex-col gap-2 sm:col-span-2">
            Raison de la correction
            <textarea
              class="min-h-24 border bg-input px-3 py-3 text-lg"
              maxlength={250}
              value={reason}
              onInput={(event) => {
                setReason(event.currentTarget.value);
                setError(null);
              }}
              placeholder="Ex. une Primus saisie en trop"
            />
          </label>
        </div>
      )}

      {error && (
        <p class="mt-4 flex gap-2 text-destructive">
          <AlertTriangle class="shrink-0" /> {error}
        </p>
      )}
      {success && (
        <p class="mt-4 flex gap-2 text-green-400">
          <CheckCircle2 class="shrink-0" /> {success}
        </p>
      )}

      <div class="sticky bottom-0 z-10 -mx-1 mt-5 flex flex-wrap gap-3 border-t bg-card/95 px-1 py-4 backdrop-blur">
        <Button
          disabled={saving || productsLoading || products.length === 0}
          onClick={() => void submit(false)}
        >
          {saving ? <Loader2 class="animate-spin" /> : <RotateCcw />}
          Enregistrer la correction
        </Button>
        <Button
          variant="destructive"
          disabled={saving}
          onClick={() => void submit(true)}
        >
          <XCircle /> Annuler et recréditer
        </Button>
      </div>
    </section>
  );
}
