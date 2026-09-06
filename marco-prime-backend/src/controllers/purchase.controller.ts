import type { Context } from "hono";
import type { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { MemberRepository } from "../repositories/member.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { catalogSelectionService } from "../services/catalog-selection.service.js";
import {
  purchaseReceiptSchema,
  purchaseRequestSchema,
} from "../validators/purchase.validator.js";

type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
type PurchaseReceiptDTO = z.infer<typeof purchaseReceiptSchema>;

const completedPurchases = new Map<string, PurchaseReceiptDTO>();
const purchasesInProgress = new Map<string, Promise<PurchaseReceiptDTO>>();
const MAX_COMPLETED_PURCHASES = 1_000;

export class PurchaseController {
  private memberRepository = new MemberRepository();
  private orderRepository = new OrderRepository();

  async createPurchase(c: Context) {
    const request = c.req.valid(
      "json" as never,
    ) as PurchaseRequest;
    const completed = completedPurchases.get(request.transactionId);
    if (completed) return c.json(completed, 200);

    let purchasePromise = purchasesInProgress.get(request.transactionId);
    if (!purchasePromise) {
      purchasePromise = this.processPurchase(request);
      purchasesInProgress.set(request.transactionId, purchasePromise);
    }

    try {
      const receipt = await purchasePromise;
      completedPurchases.set(request.transactionId, receipt);
      trimCompletedPurchases();
      return c.json(receipt, 201);
    } finally {
      purchasesInProgress.delete(request.transactionId);
    }
  }

  private async processPurchase({
    transactionId,
    cardNumber,
    items,
  }: PurchaseRequest): Promise<PurchaseReceiptDTO> {

    const member = await this.memberRepository.findFullByCardNumber(cardNumber);
    if (!member) {
      throw new HTTPException(404, {
        message: `Member with identifier '${cardNumber}' not found`,
      });
    }

    let purchase;
    try {
      const selectedProductIds =
        await catalogSelectionService.getSelectedProductIds();
      purchase = await this.orderRepository.createCartPurchaseTransaction(
        member.id,
        items,
        selectedProductIds,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.startsWith("PRODUCT_NOT_FOUND:")) {
          throw new HTTPException(404, { message: "Product not found" });
        }
        if (
          error.message.startsWith("PRODUCT_UNAVAILABLE:") ||
          error.message.startsWith("PRODUCT_NOT_SELECTED:")
        ) {
          throw new HTTPException(400, {
            message: "A product is no longer available on this Marco",
          });
        }
      }
      throw error;
    }

    return {
      success: true,
      transaction: {
        transactionId,
        orderIds: purchase.orderIds,
        date: purchase.orderDate,
        items: purchase.items,
        member: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          cardNumber: member.cardNumber!,
        },
        totalPrice: purchase.totalPrice,
        previousBalance: purchase.previousBalance,
        newBalance: purchase.newBalance,
      },
    } satisfies PurchaseReceiptDTO;
  }
}

function trimCompletedPurchases() {
  while (completedPurchases.size > MAX_COMPLETED_PURCHASES) {
    const oldestTransactionId = completedPurchases.keys().next().value;
    if (!oldestTransactionId) return;
    completedPurchases.delete(oldestTransactionId);
  }
}
