import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { app } from "../src/index.js";
import {
  authenticatedOptions,
  getAvailableProductId,
  getAvailableProductIds,
  getBalanceByCardNumber,
  getNonAdminCardNumber,
  getUnavailableProductId,
} from "./utils/helpers.js";

describe("Purchase Endpoint", async () => {
  const client = testClient(app);
  const cardNumber = await getNonAdminCardNumber();
  const availableProductId = await getAvailableProductId();
  const unavailableProductId = await getUnavailableProductId();

  it("should create a purchase successfully", async () => {
    const res = await client.api.v1.purchase.$post(
      {
        json: {
          transactionId: crypto.randomUUID(),
          cardNumber,
          items: [{ productId: availableProductId, amount: 1 }],
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("transaction");
    expect(data.transaction).toHaveProperty("transactionId");
    expect(data.transaction).toHaveProperty("orderIds");
    expect(data.transaction).toHaveProperty("date");
    expect(data.transaction).toHaveProperty("items");
    expect(data.transaction).toHaveProperty("member");
    expect(data.transaction).toHaveProperty("totalPrice");
    expect(data.transaction).toHaveProperty("previousBalance");
    expect(data.transaction).toHaveProperty("newBalance");
  });

  it("should process several products and quantities in one cart", async () => {
    const [firstProductId, secondProductId] = await getAvailableProductIds(2);
    const res = await client.api.v1.purchase.$post(
      {
        json: {
          transactionId: crypto.randomUUID(),
          cardNumber,
          items: [
            { productId: firstProductId!, amount: 2 },
            { productId: secondProductId!, amount: 3 },
          ],
        },
      },
      authenticatedOptions,
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.transaction.items).toHaveLength(2);
    expect(data.transaction.orderIds).toHaveLength(2);
    expect(data.transaction.items.map((item) => item.amount)).toEqual([2, 3]);
  });

  it("should return the first receipt without debiting twice on retry", async () => {
    const transactionId = crypto.randomUUID();
    const request = {
      json: {
        transactionId,
        cardNumber,
        items: [{ productId: availableProductId, amount: 1 }],
      },
    };

    const first = await client.api.v1.purchase.$post(request, authenticatedOptions);
    const balanceAfterFirst = await getBalanceByCardNumber(cardNumber);
    const retry = await client.api.v1.purchase.$post(request, authenticatedOptions);
    const balanceAfterRetry = await getBalanceByCardNumber(cardNumber);

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual(await first.json());
    expect(balanceAfterRetry).toBe(balanceAfterFirst);
  });

  it("should reject a reused transaction identifier with a different cart", async () => {
    const transactionId = crypto.randomUUID();
    const first = await client.api.v1.purchase.$post(
      {
        json: {
          transactionId,
          cardNumber,
          items: [{ productId: availableProductId, amount: 1 }],
        },
      },
      authenticatedOptions,
    );
    const conflict = await client.api.v1.purchase.$post(
      {
        json: {
          transactionId,
          cardNumber,
          items: [{ productId: availableProductId, amount: 2 }],
        },
      },
      authenticatedOptions,
    );

    expect(first.status).toBe(201);
    expect(conflict.status).toBe(409);
  });

  it("should roll back the complete cart when one product is invalid", async () => {
    const balanceBefore = await getBalanceByCardNumber(cardNumber);
    const res = await client.api.v1.purchase.$post(
      {
        json: {
          transactionId: crypto.randomUUID(),
          cardNumber,
          items: [
            { productId: availableProductId, amount: 1 },
            { productId: 999999, amount: 1 },
          ],
        },
      },
      authenticatedOptions,
    );
    const balanceAfter = await getBalanceByCardNumber(cardNumber);

    expect(res.status).toBe(404);
    expect(balanceAfter).toBe(balanceBefore);
  });

  it("should return 404 for non-existent product", async () => {
    const res = await client.api.v1.purchase.$post(
      {
        json: {
          transactionId: crypto.randomUUID(),
          cardNumber,
          items: [{ productId: 999999, amount: 1 }],
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 404 for non-existent member", async () => {
    const res = await client.api.v1.purchase.$post(
      {
        json: {
          transactionId: crypto.randomUUID(),
          cardNumber: 999999,
          items: [{ productId: availableProductId, amount: 1 }],
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 400 for unavailable product", async () => {
    const res = await client.api.v1.purchase.$post(
      {
        json: {
          transactionId: crypto.randomUUID(),
          cardNumber,
          items: [{ productId: unavailableProductId, amount: 1 }],
        },
      },
      authenticatedOptions,
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 401 without authentication", async () => {
    const res = await client.api.v1.purchase.$post({
      json: {
        transactionId: crypto.randomUUID(),
        cardNumber,
        items: [{ productId: availableProductId, amount: 1 }],
      },
    });
    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid request body", async () => {
    const res = await client.api.v1.purchase.$post(
      {
        json: {
          transactionId: crypto.randomUUID(),
          cardNumber,
          items: [{ productId: "invalid" as any, amount: 1 }],
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(400);
  });
});
