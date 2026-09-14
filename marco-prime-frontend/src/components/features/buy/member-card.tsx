import type z from "zod";
import { useMember } from "../../../contexts/member-context";
import { shopping } from "../../../contexts/shopping-context";
import { cn } from "../../../utils/cn";
import { hasInsufficientBalance } from "../../../utils/validation";
import type { memberSchema } from "../../../schemas/member.schema";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { MemberSearch } from "../member/member-search";

export function MemberCard() {
  const { data, loading, error, inputLength, retry, clear } = useMember();

  if (loading) return <MemberCardLoading />;
  if (error) return <MemberCardError retry={retry} clear={clear} />;
  if (!data) return <NoMemberCard inputLength={inputLength} />;

  return <MemberCardLoaded member={data} />;
}

function MemberCardError({
  retry,
  clear,
}: {
  retry: () => Promise<void>;
  clear: () => void;
}) {
  return (
    <div>
      <Alert variant="destructive">
        <AlertTitle>Carte non reconnue</AlertTitle>
        <AlertDescription class="flex flex-col gap-2">
          <span>Vérifiez la carte ou la connexion au serveur.</span>
          <div class="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void retry()}>
              Réessayer
            </Button>
            <Button size="sm" onClick={clear}>Autre carte</Button>
          </div>
        </AlertDescription>
      </Alert>
      <MemberSearch />
    </div>
  );
}

function NoMemberCard({ inputLength }: { inputLength: number }) {
  return (
    <div>
      <Alert variant={inputLength > 0 ? "default" : "destructive"}>
        <AlertDescription>
          {inputLength > 0
            ? `Saisie en cours : ${inputLength} chiffre${inputLength > 1 ? "s" : ""}. Appuyez sur Entrée.`
            : "Veuillez scanner une carte ou saisir son numéro puis appuyer sur Entrée."}
        </AlertDescription>
      </Alert>
      <MemberSearch />
    </div>
  );
}

function MemberCardLoaded({
  member,
}: {
  member: z.infer<typeof memberSchema>;
}) {
  const notEnoughMoney = hasInsufficientBalance(
    shopping.total.value,
    member.balance,
  );
  const missingAmount = Math.max(
    0,
    Math.round((shopping.total.value - Number(member.balance)) * 100) / 100,
  );
  return (
    <>
      <Alert>
        <AlertTitle>
          {member.firstName} {member.lastName}
        </AlertTitle>
        <AlertDescription class={cn("space-y-1", notEnoughMoney && "text-destructive")}>
          <p>Solde : {member.balance}€</p>
          {notEnoughMoney && (
            <p class="font-semibold">
              Paiement impossible — il manque {missingAmount.toFixed(2)}€.
            </p>
          )}
        </AlertDescription>
      </Alert>
    </>
  );
}

function MemberCardLoading() {
  return (
    <Alert class="flex flex-col gap-3.5 py-4">
      <Skeleton class="h-5 w-28" />
      <Skeleton class="h-4 w-16" />
    </Alert>
  );
}
