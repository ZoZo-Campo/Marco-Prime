import {
  Calculator,
  Download,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { apiHeaders, apiUrl } from "../../../config/api";
import {
  accountingSchema,
  type Accounting,
  type AccountingRow,
} from "../../../schemas/accounting.schema";
import {
  productCostListSchema,
  type ProductCost,
} from "../../../schemas/statistics.schema";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";

interface AccountingPanelProps {
  adminCardNumber: number;
}

type EditableRow = Pick<
  AccountingRow,
  | "id"
  | "productId"
  | "label"
  | "liters"
  | "purchasePricePerLiter"
  | "revenue"
>;

interface WritableFile {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface SaveFileHandle {
  createWritable(): Promise<WritableFile>;
}

interface SavePickerWindow extends Window {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
}

export function AccountingPanel({ adminCardNumber }: AccountingPanelProps) {
  const [accounting, setAccounting] = useState<Accounting | null>(null);
  const [products, setProducts] = useState<ProductCost[]>([]);
  const [purchasePriceDefaults, setPurchasePriceDefaults] = useState<
    Map<number, string>
  >(new Map());
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [accountingResponse, productsResponse] = await Promise.all([
        fetch(apiUrl("accounting"), {
          method: "POST",
          headers: apiHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ adminCardNumber }),
        }),
        fetch(apiUrl("statistics/costs"), {
          method: "POST",
          headers: apiHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ adminCardNumber }),
        }),
      ]);
      if (!accountingResponse.ok || !productsResponse.ok) {
        throw new Error("HTTP error");
      }

      const value = accountingSchema.parse(await accountingResponse.json());
      const catalogue = productCostListSchema.parse(
        await productsResponse.json(),
      );
      setAccounting(value);
      setProducts(catalogue);
      setPurchasePriceDefaults(
        new Map(
          value.productDefaults.map((entry) => [
            entry.productId,
            entry.purchasePricePerLiter,
          ]),
        ),
      );
      setEventName(value.eventName);
      setEventDate(value.eventDate);
      setRows(
        value.rows.map(
          ({
            id,
            productId,
            label,
            liters,
            purchasePricePerLiter,
            revenue,
          }) => ({
            id,
            productId:
              productId ??
              catalogue.find(
                (product) =>
                  product.name.toLocaleLowerCase("fr") ===
                  label.toLocaleLowerCase("fr"),
              )?.id ??
              null,
            label,
            liters,
            purchasePricePerLiter,
            revenue,
          }),
        ),
      );
    } catch {
      setMessage("Impossible de charger la comptabilité et le catalogue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [adminCardNumber]);

  const updateRow = (
    id: string,
    field: keyof EditableRow,
    value: string | number | null,
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    );
    setMessage(null);
  };

  const chooseProduct = (rowId: string, value: string) => {
    const productId = Number(value);
    const product = products.find((item) => item.id === productId);
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              productId: product?.id ?? null,
              label: product?.name ?? "",
              purchasePricePerLiter: product
                ? (purchasePriceDefaults.get(product.id) ?? "0")
                : "0",
            }
          : row,
      ),
    );
    setMessage(null);
  };

  const addProduct = () => {
    const selectedIds = new Set(
      rows.flatMap((row) => (row.productId === null ? [] : [row.productId])),
    );
    const product = products.find((item) => !selectedIds.has(item.id));
    if (!product) {
      setMessage("Tous les produits du catalogue sont déjà présents.");
      return;
    }
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        productId: product.id,
        label: product.name,
        liters: "0",
        purchasePricePerLiter:
          purchasePriceDefaults.get(product.id) ?? "0",
        revenue: "0",
      },
    ]);
    setMessage(null);
  };

  const normalizedRows = () =>
    rows.map((row) => ({
      ...row,
      label: row.label.trim(),
      liters: normalizeNumber(row.liters),
      purchasePricePerLiter: normalizeNumber(row.purchasePricePerLiter),
      revenue: normalizeNumber(row.revenue),
    }));

  const validRows = () => {
    const normalized = normalizedRows();
    const productIds = normalized.flatMap((row) =>
      row.productId === null ? [] : [row.productId],
    );
    return (
      normalized.every(
        (row) =>
          row.productId !== null &&
          row.label !== "" &&
          row.liters !== null &&
          row.purchasePricePerLiter !== null &&
          row.revenue !== null,
      ) && new Set(productIds).size === normalized.length
    );
  };

  const save = async () => {
    if (!eventName.trim() || !eventDate || !validRows()) {
      setMessage(
        "Choisissez un produit différent par ligne et vérifiez tous les nombres.",
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(apiUrl("accounting"), {
        method: "PUT",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          adminCardNumber,
          eventName: eventName.trim(),
          eventDate,
          rows: normalizedRows(),
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = accountingSchema.parse(await response.json());
      setAccounting(value);
      setPurchasePriceDefaults(
        new Map(
          value.productDefaults.map((entry) => [
            entry.productId,
            entry.purchasePricePerLiter,
          ]),
        ),
      );
      setRows(
        value.rows.map(
          ({
            id,
            productId,
            label,
            liters,
            purchasePricePerLiter,
            revenue,
          }) => ({
            id,
            productId,
            label,
            liters,
            purchasePricePerLiter,
            revenue,
          }),
        ),
      );
      setMessage("Comptabilité enregistrée.");
    } catch {
      setMessage("Impossible d’enregistrer la comptabilité.");
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals(rows);

  const exportCsv = async () => {
    if (!eventName.trim() || !eventDate || !validRows()) {
      setMessage("Corrigez les lignes incomplètes avant l’export CSV.");
      return;
    }
    const filename = `${safeFilename(eventName)}-${eventDate}.csv`;
    const csv = createCsv(eventName.trim(), eventDate, rows, totals);
    const blob = new Blob(["\ufeff", csv], {
      type: "text/csv;charset=utf-8",
    });
    const picker = (window as SavePickerWindow).showSaveFilePicker;

    if (picker) {
      try {
        const handle = await picker({
          suggestedName: filename,
          types: [
            {
              description: "Tableau CSV",
              accept: { "text/csv": [".csv"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setMessage("CSV enregistré à l’emplacement choisi.");
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(
      "CSV téléchargé. Son dossier dépend du réglage de téléchargement de Chromium.",
    );
  };

  if (loading) {
    return (
      <div class="flex flex-1 items-center justify-center">
        <Loader2 class="size-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div class="flex-1 overflow-y-auto p-5 pb-8">
      <div class="mx-auto flex max-w-7xl flex-col gap-5">
        <header class="flex flex-wrap items-end gap-4">
          <div class="mr-auto">
            <h1 class="flex items-center gap-3 text-2xl font-bold">
              <Calculator /> Compta réelle
            </h1>
            <p class="mt-1 text-muted-foreground">
              Choisissez les produits Fouaille, puis saisissez les litres et
              recettes réellement constatés.
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              Les prix d’achat par litre positifs sont mémorisés localement et
              préremplis lors des prochaines soirées.
            </p>
          </div>
          <label class="flex flex-col gap-1 text-sm">
            Nom de l’événement
            <input
              class="border bg-input px-3 py-2 text-base"
              value={eventName}
              onInput={(event) => setEventName(event.currentTarget.value)}
            />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              class="border bg-input px-3 py-2 text-base"
              value={eventDate}
              onInput={(event) => setEventDate(event.currentTarget.value)}
            />
          </label>
        </header>

        <Card class="overflow-x-auto p-0">
          <table class="w-full min-w-[960px] border-collapse text-left">
            <thead class="bg-muted/50">
              <tr>
                <th class="p-3">Produit Fouaille</th>
                <th class="p-3">Litres réels</th>
                <th class="p-3">Prix achat / L</th>
                <th class="p-3">Coût total</th>
                <th class="p-3">Recettes réelles</th>
                <th class="p-3">Résultat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const values = calculateRow(row);
                const selectedElsewhere = new Set(
                  rows.flatMap((item) =>
                    item.id !== row.id && item.productId !== null
                      ? [item.productId]
                      : [],
                  ),
                );
                return (
                  <tr key={row.id} class="border-t">
                    <td class="p-2">
                      <select
                        class="w-full min-w-52 border bg-input px-3 py-2"
                        value={row.productId ?? ""}
                        onChange={(event) =>
                          chooseProduct(row.id, event.currentTarget.value)
                        }
                      >
                        {row.productId === null && (
                          <option value="">Choisir un produit…</option>
                        )}
                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                            disabled={selectedElsewhere.has(product.id)}
                          >
                            {product.name}
                            {!product.available ? " · indisponible" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td class="p-2">
                      <NumberInput
                        value={row.liters}
                        onInput={(value) => updateRow(row.id, "liters", value)}
                      />
                    </td>
                    <td class="p-2">
                      <NumberInput
                        value={row.purchasePricePerLiter}
                        onInput={(value) =>
                          updateRow(row.id, "purchasePricePerLiter", value)
                        }
                      />
                    </td>
                    <td class="p-3 font-medium">
                      {formatMoney(values.cost)}
                    </td>
                    <td class="p-2">
                      <NumberInput
                        value={row.revenue}
                        onInput={(value) => updateRow(row.id, "revenue", value)}
                      />
                    </td>
                    <td
                      class={`p-3 font-bold ${
                        values.result < 0
                          ? "text-destructive"
                          : "text-green-400"
                      }`}
                    >
                      {formatMoney(values.result)}
                    </td>
                    <td class="p-2">
                      <Button
                        aria-label={`Supprimer ${row.label}`}
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setRows((current) =>
                            current.filter((item) => item.id !== row.id),
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot class="border-t-2 bg-muted/40 font-bold">
              <tr>
                <td class="p-3">TOTAL</td>
                <td class="p-3">{formatLiters(totals.liters)}</td>
                <td />
                <td class="p-3">{formatMoney(totals.cost)}</td>
                <td class="p-3">{formatMoney(totals.revenue)}</td>
                <td class="p-3">{formatMoney(totals.result)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          {rows.length === 0 && (
            <p class="p-8 text-center text-muted-foreground">
              Ajoutez un produit du catalogue pour commencer.
            </p>
          )}
        </Card>

        <div class="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center gap-3 border-t bg-background/95 px-2 py-3 backdrop-blur">
          <Button variant="outline" onClick={addProduct}>
            <Plus /> Ajouter un produit
          </Button>
          <Button variant="outline" onClick={() => void exportCsv()}>
            <Download /> Exporter CSV…
          </Button>
          <Button
            class="ml-auto"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 class="animate-spin" /> : <Save />}
            Enregistrer
          </Button>
        </div>
        {message && <p class="text-center text-lg">{message}</p>}
        {accounting && (
          <p class="text-center text-sm text-muted-foreground">
            Dernière sauvegarde :{" "}
            {new Date(accounting.updatedAt).toLocaleString("fr-FR")}
          </p>
        )}
      </div>
    </div>
  );
}

function NumberInput({
  value,
  onInput,
}: {
  value: string;
  onInput: (value: string) => void;
}) {
  return (
    <input
      inputMode="decimal"
      class="w-32 border bg-input px-3 py-2"
      value={value}
      onInput={(event) => onInput(event.currentTarget.value)}
    />
  );
}

function normalizeNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  return /^\d+(?:\.\d+)?$/.test(normalized) &&
    Number.isFinite(Number(normalized))
    ? normalized
    : null;
}

function calculateRow(row: EditableRow) {
  const liters = Number(normalizeNumber(row.liters) ?? 0);
  const cost =
    liters * Number(normalizeNumber(row.purchasePricePerLiter) ?? 0);
  const revenue = Number(normalizeNumber(row.revenue) ?? 0);
  return { liters, cost, revenue, result: revenue - cost };
}

function calculateTotals(rows: EditableRow[]) {
  return rows.reduce(
    (sum, row) => {
      const value = calculateRow(row);
      return {
        liters: sum.liters + value.liters,
        cost: sum.cost + value.cost,
        revenue: sum.revenue + value.revenue,
        result: sum.result + value.result,
      };
    },
    { liters: 0, cost: 0, revenue: 0, result: 0 },
  );
}

function createCsv(
  eventName: string,
  eventDate: string,
  rows: EditableRow[],
  totals: ReturnType<typeof calculateTotals>,
) {
  const lines = [
    ["Événement", eventName],
    ["Date", eventDate],
    [],
    [
      "Produit",
      "Litres réels",
      "Prix achat par litre",
      "Coût total",
      "Recettes réelles",
      "Résultat",
    ],
    ...rows.map((row) => {
      const value = calculateRow(row);
      return [
        row.label,
        csvNumber(value.liters, 3),
        csvNumber(Number(row.purchasePricePerLiter.replace(",", ".")), 4),
        csvNumber(value.cost, 2),
        csvNumber(value.revenue, 2),
        csvNumber(value.result, 2),
      ];
    }),
    [
      "TOTAL",
      csvNumber(totals.liters, 3),
      "",
      csvNumber(totals.cost, 2),
      csvNumber(totals.revenue, 2),
      csvNumber(totals.result, 2),
    ],
  ];
  return lines.map((line) => line.map(csvCell).join(";")).join("\r\n");
}

function csvCell(value: string) {
  const protectedValue = /^[=+\-@]/.test(value.trimStart())
    ? `'${value}`
    : value;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

function csvNumber(value: number, decimals: number) {
  return value.toFixed(decimals).replace(".", ",");
}

function safeFilename(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "compta-marco"
  );
}

function formatMoney(value: number) {
  return `${value.toFixed(2)} €`;
}

function formatLiters(value: number) {
  return `${value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")} L`;
}
