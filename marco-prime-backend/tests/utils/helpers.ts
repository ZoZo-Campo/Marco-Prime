import { eq } from "drizzle-orm";
import { db } from "../../src/config/database.js";
import { members, products } from "../../src/db/schema.js";

export const authenticatedOptions = {
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`,
    "Content-Type": "application/json",
  },
};

export const getAdminCardNumber = async () => {
  const admin = await db
    .select()
    .from(members)
    .where(eq(members.admin, true))
    .limit(1);

  if (admin.length === 0) {
    throw new Error("No admin user found in the database.");
  }
  if (!admin[0].cardNumber) {
    throw new Error("Admin user does not have a card number.");
  }

  return admin[0].cardNumber;
};

export const getNonAdminCardNumber = async () => {
  const admin = await db
    .select()
    .from(members)
    .where(eq(members.admin, false))
    .limit(1);

  if (admin.length === 0) {
    throw new Error("No non-admin user found in the database.");
  }
  if (!admin[0].cardNumber) {
    throw new Error("Non-admin user does not have a card number.");
  }

  return admin[0].cardNumber;
};

export const getAvailableProductId = async () => {
  const product = await db
    .select()
    .from(products)
    .where(eq(products.available, true))
    .limit(1);

  if (product.length === 0) {
    throw new Error("No available product found in the database.");
  }

  return product[0].id;
};

export const getUnavailableProductId = async () => {
  const product = await db
    .select()
    .from(products)
    .where(eq(products.available, false))
    .limit(1);

  if (product.length === 0) {
    throw new Error("No unavailable product found in the database.");
  }

  return product[0].id;
};
