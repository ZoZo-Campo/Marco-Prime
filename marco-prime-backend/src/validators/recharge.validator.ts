import { z } from "zod";

export const rechargeRequestSchema = z.object({
  transactionId: z.string().uuid(),
  cardNumber: z.number().positive(),
  adminCardNumber: z.number().positive().optional(),
  amount: z.number().positive(),
});

export const rechargeReceiptSchema = z.object({
  success: z.boolean(),
  transaction: z.object({
    transactionId: z.string().uuid(),
    date: z.date(),
    member: z.object({
      id: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      cardNumber: z.number(),
    }),
    processedBy: z
      .object({
        id: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        cardNumber: z.number(),
        isAdmin: z.boolean(),
      })
      .optional(),
    amount: z.string(),
    previousBalance: z.string(),
    newBalance: z.string(),
  }),
});
