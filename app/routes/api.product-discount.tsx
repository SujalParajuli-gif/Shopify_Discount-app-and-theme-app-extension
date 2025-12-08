// app/routes/api.product-discount.tsx
// Public API for the storefront. Returns { discount: ... } or { discount: null }.

import type { LoaderFunctionArgs } from "react-router";
import { getDiscountForProduct } from "../models/discount.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  const productId = url.searchParams.get("productId");
  const shop = url.searchParams.get("shop");

  const headers = {
    "Content-Type": "application/json",
    // allow the theme (shop domain) to read our JSON
    "Access-Control-Allow-Origin": "*",
  };

  // missing params = just say "no discount"
  if (!productId || !shop) {
    console.log("[api.product-discount] missing params", { productId, shop });

    return new Response(JSON.stringify({ discount: null }), {
      status: 200,
      headers,
    });
  }

  // look up discount in our Prisma table
  const discount = await getDiscountForProduct({ shop, productId });

  console.log("[api.product-discount] result", {
    shop,
    productId,
    found: !!discount,
  });

  return new Response(JSON.stringify({ discount }), {
    status: 200,
    headers,
  });
}
