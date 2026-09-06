import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { app } from "../src/index.js";
import {
  authenticatedOptions,
  getAdminCardNumber,
  getNonAdminCardNumber,
} from "./utils/helpers.js";

describe("Recharge Endpoint", async () => {
  const client = testClient(app);
  const adminCardNumber = await getAdminCardNumber();
  const nonAdminCardNumber = await getNonAdminCardNumber();

  it("should create a recharge successfully without admin card", async () => {
    const res = await client.api.v1.recharge.$post(
      {
        json: {
          cardNumber: nonAdminCardNumber,
          adminCardNumber,
          amount: 10.5,
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("transaction");
    expect(data.transaction).toHaveProperty("date");
    expect(data.transaction).toHaveProperty("member");
    expect(data.transaction).toHaveProperty("processedBy");
    expect(data.transaction).toHaveProperty("amount");
    expect(data.transaction).toHaveProperty("previousBalance");
    expect(data.transaction).toHaveProperty("newBalance");
  });

  it("should create a recharge successfully when member is admin", async () => {
    const res = await client.api.v1.recharge.$post(
      {
        json: {
          cardNumber: adminCardNumber,
          amount: 10.5,
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data).toHaveProperty("success", true);
    expect(data.transaction).not.toHaveProperty("processedBy");
  });

  it("should return 404 for non-existent member", async () => {
    const res = await client.api.v1.recharge.$post(
      {
        json: {
          cardNumber: 999999,
          adminCardNumber,
          amount: 10,
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 404 for non-existent admin", async () => {
    const res = await client.api.v1.recharge.$post(
      {
        json: {
          cardNumber: nonAdminCardNumber,
          adminCardNumber: 999999,
          amount: 10,
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 403 when non-admin tries to recharge another member", async () => {
    const res = await client.api.v1.recharge.$post(
      {
        json: {
          cardNumber: nonAdminCardNumber,
          adminCardNumber: nonAdminCardNumber,
          amount: 10,
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 403 when non-admin member tries to recharge without admin card", async () => {
    const res = await client.api.v1.recharge.$post(
      {
        json: {
          cardNumber: nonAdminCardNumber,
          amount: 10,
        },
      },
      authenticatedOptions,
    );
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 401 without authentication", async () => {
    const res = await client.api.v1.recharge.$post({
      json: {
        cardNumber: nonAdminCardNumber,
        adminCardNumber,
        amount: 10,
      },
    });
    expect(res.status).toBe(401);
  });
});
