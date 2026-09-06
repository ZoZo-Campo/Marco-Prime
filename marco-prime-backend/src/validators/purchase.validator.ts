import { z } from "zod";

export const purchaseRequestSchema = z.object({
  productId: z.number().positive(),
  cardNumber: z.number().positive(),
  amount: z.number().positive().int().default(1),
});

export const purchaseReceiptSchema = z.object({
  success: z.boolean(),
  transaction: z.object({
    orderId: z.number(),
    date: z.date(),
    product: z.object({
      id: z.number(),
      name: z.string(),
      title: z.string(),
      price: z.string(),
    }),
    member: z.object({
      id: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      cardNumber: z.number(),
    }),
    amount: z.number(),
    totalPrice: z.string(),
    previousBalance: z.string(),
    newBalance: z.string(),
  }),
});
