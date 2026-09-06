import type z from "zod";
import { useMember } from "../../../contexts/member-context";
import { shopping } from "../../../contexts/shopping-context";
import { cn } from "../../../utils/cn";
import { hasInsufficientBalance } from "../../../utils/validation";
import type { memberSchema } from "../../../schemas/member.schema";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Skeleton } from "../../ui/skeleton";

export function MemberCard() {
  const { data, loading } = useMember();

  if (!data) return <NoMemberCard />;
  if (loading) return <MemberCardLoading />;

  return <MemberCardLoaded member={data} />;
}

function NoMemberCard() {
  return (
    <Alert variant="destructive">
      <AlertDescription>Veuillez scanner une carte</AlertDescription>
    </Alert>
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
  return (
    <>
      <Alert>
        <AlertTitle>
          {member.firstName} {member.lastName}
        </AlertTitle>
        <AlertDescription class={cn(notEnoughMoney && "text-destructive")}>
          {member.balance}€
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
