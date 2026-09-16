import type { Context } from "hono";
import type { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { MemberRepository } from "../repositories/member.repository.js";
import { cardNumberParamSchema, memberSearchSchema } from "../validators/members.validator.js";

type MemberParamRequest = z.infer<typeof cardNumberParamSchema>;
type MemberSearchRequest = z.infer<typeof memberSearchSchema>;

export class MemberController {
  private memberRepository = new MemberRepository();

  async getMemberByCardNumber(c: Context) {
    const { card_number } = c.req.valid("param" as never) as MemberParamRequest;

    const member = await this.memberRepository.findByCardNumber(card_number);

    if (!member) {
      throw new HTTPException(404, {
        message: "Carte membre inconnue",
      });
    }

    return c.json(member);
  }

  async searchMembers(c: Context) {
    const { adminCardNumber, query, promotion } = c.req.valid(
      "json" as never,
    ) as MemberSearchRequest;
    const admin = await this.memberRepository.findFullByCardNumber(
      adminCardNumber,
    );
    if (!admin?.admin) {
      throw new HTTPException(403, {
        message: "Une carte administrateur est requise",
      });
    }

    return c.json(await this.memberRepository.search(query, 20, promotion));
  }
}
