import { signal } from "@preact/signals";
import type { PurchaseResponse } from "../schemas/purchase.schema";
import type { RechargeResponse } from "../schemas/recharge.schema";
import type { ProductInCart } from "./shopping-context";

export type PurchaseTicketData = {
  type: "purchase";
  transactions: PurchaseResponse["transaction"][];
  products: ProductInCart[];
  totalPrice: number;
  memberName: string;
  newBalance: string;
  date: string;
};

export type RechargeTicketData = {
  type: "recharge";
  transaction: RechargeResponse["transaction"];
  memberName: string;
  amount: string;
  previousBalance: string;
  newBalance: string;
  processedBy?: string;
  date: string;
};

export type TicketData = PurchaseTicketData | RechargeTicketData;

export const ticketSignal = signal<TicketData | null>(null);

export function setTicket(data: TicketData) {
  ticketSignal.value = data;
}

export function clearTicket() {
  ticketSignal.value = null;
}
