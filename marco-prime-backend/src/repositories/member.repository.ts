import { and, asc, eq, isNotNull, like, or, sql } from "drizzle-orm";
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

  async search(query: string, limit = 12) {
    const pattern = `%${query.trim()}%`;
    return await db
      .select({
        id: members.id,
        lastName: members.lastName,
        firstName: members.firstName,
        cardNumber: members.cardNumber,
        balance: members.balance,
        admin: members.admin,
      })
      .from(members)
      .where(
        and(
          isNotNull(members.cardNumber),
          or(
          like(members.firstName, pattern),
          like(members.lastName, pattern),
          sql`concat(${members.firstName}, ' ', ${members.lastName}) like ${pattern}`,
          sql`concat(${members.lastName}, ' ', ${members.firstName}) like ${pattern}`,
          ),
        ),
      )
      .orderBy(asc(members.lastName), asc(members.firstName))
      .limit(limit);
  }

}
