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

// Delete a single discount row by id for a given shop.
// Using deleteMany instead of delete so we also check the shop field.
export async function deleteProductDiscountById(input: {
  shop: string;
  id: string;
}) {
  const { shop, id } = input;

  if (!id) {
    throw new Error("id is required to delete product discount");
  }

  return db.productDiscount.deleteMany({
    where: {
      id,
      shop,
    },
  });
}

// Delete all discount rows for a given shop.
// This is used for the "Clear all discounts" button in the admin.
export async function deleteAllDiscountsForShop(shop: string) {
  if (!shop) {
    throw new Error("shop is required to delete all discounts");
  }

  return db.productDiscount.deleteMany({
    where: {
      shop,
    },
  });
}

/**
 * Buy X Get Y discount helpers
 * These helpers talk to the BuyXGetYDiscount table that you added in Prisma for the new feature.
 */

// Creates one "Buy X Get Y" discount rule.
export async function createBuyXGetYDiscount(input: {
  shop: string;
  productXId: string; // GraphQL product id for X
  productYId: string; // GraphQL product id for Y
  quantityX: number;
  percentageOff: number; // discount on Y in %
  quantityY?: number; // optional, defaults to 1
}) {
  const { shop, productXId, productYId, quantityX, percentageOff } = input;
  const quantityY = input.quantityY ?? 1;

  invariant(shop, "shop is required");
  invariant(productXId, "productXId is required");
  invariant(productYId, "productYId is required");

  const quantityXNumber = Number(quantityX);
  const quantityYNumber = Number(quantityY);
  const percentageNumber = Number(percentageOff);

  invariant(
    !Number.isNaN(quantityXNumber) && quantityXNumber > 0,
    "quantityX must be a positive number"
  );
  invariant(
    !Number.isNaN(quantityYNumber) && quantityYNumber > 0,
    "quantityY must be a positive number"
  );
  invariant(
    !Number.isNaN(percentageNumber) &&
      percentageNumber > 0 &&
      percentageNumber <= 100,
    "percentageOff must be between 1 and 100"
  );

  const rule = await db.buyXGetYDiscount.create({
    data: {
      shop,
      productXGid: productXId,
      productYGid: productYId,
      quantityX: quantityXNumber,
      quantityY: quantityYNumber,
      percentageOff: percentageNumber,
    },
  });

  return rule;
}

// Lists all Buy X Get Y rules for one shop.
export async function listBuyXGetYDiscounts(shop: string) {
  return db.buyXGetYDiscount.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

// Delete a single Buy X Get Y rule by id for a given shop.
export async function deleteBuyXGetYDiscountById(input: {
  shop: string;
  id: string;
}) {
  const { shop, id } = input;

  if (!id) {
    throw new Error("id is required to delete Buy X Get Y discount");
  }

  return db.buyXGetYDiscount.deleteMany({
    where: {
      id,
      shop,
    },
  });
}
