import { count, desc, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { members, orders } from "../db/schema.js";

export class OrderRepository {
  async countAll() {
    const [{ total }] = await db.select({ total: count() }).from(orders);
    return total;
  }

  async findMany(limit: number, offset: number) {
    return await db
      .select()
      .from(orders)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(orders.date));
  }

  async create(data: {
    productId: number;
    memberId: number;
    price: string;
    amount: number;
  }) {
    const [order] = await db.insert(orders).values(data).$returningId();
    return order;
  }

  async findById(orderId: number) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    return order;
  }

  async createPurchaseTransaction(
    productId: number,
    memberId: number,
    price: string,
    amount: number,
  ): Promise<{
    orderId: number;
    orderDate: Date;
    previousBalance: string;
    newBalance: string;
  }> {
    return await db.transaction(async (tx) => {
      const [lockedMember] = await tx
        .select({ balance: members.balance })
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1)
        .for("update");

      if (!lockedMember) throw new Error("Member not found during purchase");

      const totalPrice = Number.parseFloat(price) * amount;
      const currentBalance = Number.parseFloat(lockedMember.balance);
      if (currentBalance < totalPrice) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const newBalance = (currentBalance - totalPrice).toFixed(2);
      const [order] = await tx
        .insert(orders)
        .values({
          productId,
          memberId,
          price,
          amount,
        })
        .$returningId();

      await tx
        .update(members)
        .set({ balance: newBalance })
        .where(eq(members.id, memberId));

      const [createdOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, order.id))
        .limit(1);

      return {
        orderId: order.id,
        orderDate: createdOrder.date,
        previousBalance: lockedMember.balance,
        newBalance,
      };
    });
  }
}
