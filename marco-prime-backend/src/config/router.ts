import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { MemberController } from "../controllers/member.controller.js";
import { OrderController } from "../controllers/order.controller.js";
import { ProductController } from "../controllers/product.controller.js";
import { PurchaseController } from "../controllers/purchase.controller.js";
import { RechargeController } from "../controllers/recharge.controller.js";
import { cardNumberParamSchema } from "../validators/members.validator.js";
import { paginationQuerySchema } from "../validators/orders.validator.js";
import {
  catalogSelectionRequestSchema,
  productPaginationQuerySchema,
  productTypeParamSchema,
} from "../validators/products.validator.js";
import { purchaseRequestSchema } from "../validators/purchase.validator.js";
import { rechargeRequestSchema } from "../validators/recharge.validator.js";

const memberController = new MemberController();
const productController = new ProductController();
const orderController = new OrderController();
const purchaseController = new PurchaseController();
const rechargeController = new RechargeController();

const router = new Hono()
  .get(
    "/member/:card_number",
    zValidator("param", cardNumberParamSchema),
    (c) => memberController.getMemberByCardNumber(c),
  )
  .get("/products", (c) => productController.getAllProducts(c))
  .get("/catalog-selection", (c) => productController.getCatalogSelection(c))
  .put(
    "/catalog-selection",
    zValidator("json", catalogSelectionRequestSchema),
    (c) => productController.updateCatalogSelection(c),
  )
  .get("/product-types", (c) => productController.getProductTypes(c))
  .get(
    "/products/:product_type_id",
    zValidator("param", productTypeParamSchema),
    zValidator("query", productPaginationQuerySchema),
    (c) => productController.getProductsByType(c),
  )
  .get("/history", zValidator("query", paginationQuerySchema), (c) =>
    orderController.getOrdersHistory(c),
  )
  .post("/purchase", zValidator("json", purchaseRequestSchema), (c) =>
    purchaseController.createPurchase(c),
  )
  .post("/recharge", zValidator("json", rechargeRequestSchema), (c) =>
    rechargeController.createRecharge(c),
  );

export { router };
