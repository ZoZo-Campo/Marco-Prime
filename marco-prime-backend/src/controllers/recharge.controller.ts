import type { Context } from "hono";
import type { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { MemberRepository } from "../repositories/member.repository.js";
import {
  rechargeReceiptSchema,
  rechargeRequestSchema,
} from "../validators/recharge.validator.js";

type RechargeRequest = z.infer<typeof rechargeRequestSchema>;
type RechargeReceiptDTO = z.infer<typeof rechargeReceiptSchema>;

export class RechargeController {
  private memberRepository = new MemberRepository();

  async createRecharge(c: Context) {
    const { cardNumber, adminCardNumber, amount } = c.req.valid(
      "json" as never,
    ) as RechargeRequest;

    const member = await this.memberRepository.findFullByCardNumber(cardNumber);
    if (!member) {
      throw new HTTPException(404, {
        message: `Member with identifier '${cardNumber}' not found`,
      });
    }

    let adminMember = null;

    if (!member.admin) {
      if (!adminCardNumber) {
        throw new HTTPException(403, {
          message: "Admin card number required for non-admin member recharge",
        });
      }

      const admin =
        await this.memberRepository.findFullByCardNumber(adminCardNumber);
      if (!admin) {
        throw new HTTPException(404, {
          message: `Admin member with identifier '${adminCardNumber}' not found`,
        });
      }

      if (!admin.admin) {
        throw new HTTPException(403, {
          message: "Provided card number is not an admin",
        });
      }

      adminMember = admin;
    }

    const rechargeAmount = parseFloat(amount.toFixed(2));
    const balances = await this.memberRepository.addBalanceInTransaction(
      member.id,
      rechargeAmount,
    );

    return c.json(
      {
        success: true,
        transaction: {
          date: new Date(),
          member: {
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            cardNumber: member.cardNumber!,
          },
          processedBy: adminMember
            ? {
                id: adminMember.id,
                firstName: adminMember.firstName,
                lastName: adminMember.lastName,
                cardNumber: adminMember.cardNumber!,
                isAdmin: adminMember.admin,
              }
            : undefined,
          amount: rechargeAmount.toFixed(2),
          previousBalance: balances.previousBalance,
          newBalance: balances.newBalance,
        },
      } satisfies RechargeReceiptDTO,
      201,
    );
  }
}
