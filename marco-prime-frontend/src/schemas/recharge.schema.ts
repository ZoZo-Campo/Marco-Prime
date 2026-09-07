import z from "zod";

export const rechargeResponseSchema = z.object({
  success: z.boolean(),
  transaction: z.object({
    transactionId: z.string().uuid(),
    date: z.string(),
    member: z.object({
      id: z.coerce.number(),
      firstName: z.string(),
      lastName: z.string(),
      cardNumber: z.coerce.number(),
    }),
    processedBy: z.object({
      id: z.coerce.number(),
      firstName: z.string(),
      lastName: z.string(),
      cardNumber: z.coerce.number(),
      isAdmin: z.boolean(),
    }).optional(),
    amount: z.string(),
    previousBalance: z.string(),
    newBalance: z.string(),
  }),
});

export type RechargeResponse = z.infer<typeof rechargeResponseSchema>;
