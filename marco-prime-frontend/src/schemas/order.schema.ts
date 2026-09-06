import z from "zod";
import { paginationSchema } from "./product.schema";

export const orderSchema = z.object({
  id: z.coerce.number(),
  product: z
    .object({
      id: z.coerce.number(),
      name: z.string(),
    })
    .nullable(),
  member: z.object({
    id: z.coerce.number(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  price: z.string(),
  amount: z.coerce.number(),
  date: z.string(),
});

export const orderListResponseSchema = z.object({
  data: z.array(orderSchema),
  pagination: paginationSchema,
});

export type OrderSchema = z.infer<typeof orderSchema>;
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;
