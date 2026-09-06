import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { app } from "../src/index.js";
import {
  authenticatedOptions,
  getAvailableProductId,
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
