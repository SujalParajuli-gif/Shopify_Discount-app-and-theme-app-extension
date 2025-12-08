// Helper functions for the product discount feature.
// These functions are used by routes to talk to the Prisma database.

import invariant from "tiny-invariant";
import db from "../db.server";

// Create one discount row in the ProductDiscount table.
export async function createProductDiscount(input: {
  shop: string;
  title: string;
  percentage: number;
  productId: string;
}) {
  const { shop, title, percentage, productId } = input;

  // Basic safety checks so we do not store broken data.
  invariant(shop, "shop is required");
  invariant(title, "title is required");
  invariant(productId, "productId is required");

  const percentNumber = Number(percentage);
  invariant(!Number.isNaN(percentNumber), "percentage must be a number");

  // Insert one new discount row into the database.
  const discount = await db.productDiscount.create({
    data: {
      shop,
      title,
      percentage: percentNumber,
      productId,
    },
  });

  return discount;
}

// List all discounts for one shop.
// Used in the admin page to show the table of existing discounts.
export async function listProductDiscounts(shop: string) {
  return db.productDiscount.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

// Get a single discount for one product in one shop.
// Used by the public API for the storefront.
export async function getDiscountForProduct(input: {
  shop: string;
  productId: string;
}) {
  const { shop, productId } = input;

  return db.productDiscount.findFirst({
    where: {
      shop,
      productId,
    },
  });
}
