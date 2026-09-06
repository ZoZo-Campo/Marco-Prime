import z from "zod";

export const purchaseResponseSchema = z.object({
  success: z.boolean(),
  transaction: z.object({
    orderId: z.coerce.number(),
    date: z.string(),
    product: z.object({
      id: z.coerce.number(),
      name: z.string(),
      title: z.string(),
      price: z.string(),
    }),
    member: z.object({
      id: z.coerce.number(),
      firstName: z.string(),
      lastName: z.string(),
      cardNumber: z.coerce.number(),
    }),
    amount: z.coerce.number(),
    totalPrice: z.string(),
    previousBalance: z.string(),
    newBalance: z.string(),
  }),
});

export type PurchaseResponse = z.infer<typeof purchaseResponseSchema>;
