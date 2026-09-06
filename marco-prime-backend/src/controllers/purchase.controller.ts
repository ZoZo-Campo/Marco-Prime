import type { Context } from "hono";
import type { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { MemberRepository } from "../repositories/member.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { catalogSelectionService } from "../services/catalog-selection.service.js";
import {
  purchaseReceiptSchema,
  purchaseRequestSchema,
} from "../validators/purchase.validator.js";

type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
type PurchaseReceiptDTO = z.infer<typeof purchaseReceiptSchema>;

export class PurchaseController {
  private productRepository = new ProductRepository();
  private memberRepository = new MemberRepository();
  private orderRepository = new OrderRepository();

  async createPurchase(c: Context) {
    const { productId, cardNumber, amount } = c.req.valid(
      "json" as never,
    ) as PurchaseRequest;

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new HTTPException(404, {
        message: `Product with identifier '${productId}' not found`,
      });
    }

    if (!product.available) {
      throw new HTTPException(400, {
        message: `Product with ID ${product.id} is not available`,
      });
    }

    if (!(await catalogSelectionService.isSelected(product.id))) {
      throw new HTTPException(400, {
        message: `Product with ID ${product.id} is not selected for sale on Marco`,
      });
    }

    const member = await this.memberRepository.findFullByCardNumber(cardNumber);
    if (!member) {
      throw new HTTPException(404, {
        message: `Member with identifier '${cardNumber}' not found`,
      });
    }

    const totalPrice = (parseFloat(product.price) * amount).toFixed(2);
    const currentBalance = parseFloat(member.balance);
    const totalPriceNum = parseFloat(totalPrice);

    if (currentBalance < totalPriceNum) {
      const errorResponse = new Response(
        JSON.stringify({
          error: "Insufficient balance",
          required: totalPrice,
          available: member.balance,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
      throw new HTTPException(400, { res: errorResponse });
    }

    let purchase;
    try {
      purchase = await this.orderRepository.createPurchaseTransaction(
        product.id,
        member.id,
        product.price,
        amount,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
        throw new HTTPException(400, {
          message: "Insufficient balance",
        });
      }
      throw error;
    }

    return c.json(
      {
        success: true,
        transaction: {
          orderId: purchase.orderId,
          date: purchase.orderDate,
          product: {
            id: product.id,
            name: product.name,
            title: product.title,
            price: product.price,
          },
          member: {
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            cardNumber: member.cardNumber!,
          },
          amount,
          totalPrice,
          previousBalance: purchase.previousBalance,
          newBalance: purchase.newBalance,
        },
      } satisfies PurchaseReceiptDTO,
      201,
    );
  }
}
