import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { members } from "../db/schema.js";

export class MemberRepository {
  async findByCardNumber(cardNumber: number) {
    const [member] = await db
      .select({
        id: members.id,
        lastName: members.lastName,
        firstName: members.firstName,
        cardNumber: members.cardNumber,
        balance: members.balance,
        admin: members.admin,
      })
      .from(members)
      .where(eq(members.cardNumber, cardNumber))
      .limit(1);

    return member;
  }

  async findFullByCardNumber(cardNumber: number) {
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.cardNumber, cardNumber))
      .limit(1);

    return member;
  }

  async findById(id: number) {
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, id))
      .limit(1);

    return member;
  }

  async updateBalance(memberId: number, newBalance: string) {
    await db
      .update(members)
      .set({ balance: newBalance })
      .where(eq(members.id, memberId));
  }

  async addBalanceInTransaction(
    memberId: number,
    amount: number,
  ): Promise<{ previousBalance: string; newBalance: string }> {
    return await db.transaction(async (tx) => {
      const [lockedMember] = await tx
        .select({ balance: members.balance })
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1)
        .for("update");

      if (!lockedMember) throw new Error("Member not found during recharge");

      const newBalance = (
        Number.parseFloat(lockedMember.balance) + amount
      ).toFixed(2);
      await tx
        .update(members)
        .set({ balance: newBalance })
        .where(eq(members.id, memberId));

      return { previousBalance: lockedMember.balance, newBalance };
    });
  }
}
