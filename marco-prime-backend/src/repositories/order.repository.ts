import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/database.js";
import { members, orders, products } from "../db/schema.js";

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

  async createCartPurchaseTransaction(
    memberId: number,
    requestedItems: Array<{ productId: number; amount: number }>,
    selectedProductIds: number[] | null,
  ): Promise<{
    orderIds: number[];
    orderDate: Date;
    previousBalance: string;
    newBalance: string;
    totalPrice: string;
    items: Array<{
      product: {
        id: number;
        name: string;
        title: string;
        price: string;
      };
      amount: number;
      totalPrice: string;
    }>;
  }> {
    return await db.transaction(async (tx) => {
      const [lockedMember] = await tx
        .select({ balance: members.balance })
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1)
        .for("update");

      if (!lockedMember) throw new Error("Member not found during purchase");

      const productIds = requestedItems.map((item) => item.productId);
      const databaseProducts = await tx
        .select({
          id: products.id,
          name: products.name,
          title: products.title,
          price: products.price,
          available: products.available,
        })
        .from(products)
        .where(inArray(products.id, productIds));
      const productById = new Map(
        databaseProducts.map((product) => [product.id, product]),
      );
      const selectedSet = selectedProductIds
        ? new Set(selectedProductIds)
        : null;

      const receiptItems = requestedItems.map((item) => {
        const product = productById.get(item.productId);
        if (!product) throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
        if (!product.available) {
          throw new Error(`PRODUCT_UNAVAILABLE:${item.productId}`);
        }
        if (selectedSet && !selectedSet.has(item.productId)) {
          throw new Error(`PRODUCT_NOT_SELECTED:${item.productId}`);
        }
        const lineTotalCents = toCents(product.price) * item.amount;
        return {
          product: {
            id: product.id,
            name: product.name,
            title: product.title,
            price: product.price,
          },
          amount: item.amount,
          totalPrice: fromCents(lineTotalCents),
        };
      });

      const totalCents = receiptItems.reduce(
        (total, item) => total + toCents(item.totalPrice),
        0,
      );
      const currentBalanceCents = toCents(lockedMember.balance);
      const newBalance = fromCents(currentBalanceCents - totalCents);

      const orderIds: number[] = [];
      for (const item of receiptItems) {
        const [order] = await tx
          .insert(orders)
          .values({
            productId: item.product.id,
            memberId,
            price: item.product.price,
            amount: item.amount,
          })
          .$returningId();
        orderIds.push(order.id);
      }

      await tx
        .update(members)
        .set({ balance: newBalance })
        .where(eq(members.id, memberId));

      const [createdOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderIds[0]!))
        .limit(1);

      return {
        orderIds,
        orderDate: createdOrder.date,
        previousBalance: lockedMember.balance,
        newBalance,
        totalPrice: fromCents(totalCents),
        items: receiptItems,
      };
    });
  }
}

function toCents(value: string) {
  return Math.round(Number.parseFloat(value) * 100);
}

function fromCents(value: number) {
  return (value / 100).toFixed(2);
}
