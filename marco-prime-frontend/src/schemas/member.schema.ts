import z from "zod";

// Schema pour un membre (réponse API)
export const memberSchema = z.object({
  id: z.coerce.number(),
  lastName: z.string(),
  firstName: z.string(),
  cardNumber: z.coerce.number(),
  balance: z.string(),
  admin: z.coerce.boolean(),
});

// Type exporté pour utilisation dans les composants
export type MemberSchema = z.infer<typeof memberSchema>;
