// Public endpoint for the storefront JavaScript.
// It receives shop and productId as query parameters
// and returns either one discount row or null wrapped in JSON.

import type { LoaderFunctionArgs } from "react-router";
import { getDiscountForProduct } from "../models/discount.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // These two values come from the theme app extension
  // through query parameters.
  const productId = url.searchParams.get("productId");
  const shop = url.searchParams.get("shop");

  // Default headers for JSON response.
  const headers = {
    "Content-Type": "application/json",
    // Allow the Online Store domain to call this endpoint.
    "Access-Control-Allow-Origin": "*",
  };

  // If we did not get the required parameters we just answer
  // with "no discount" so the storefront does not break.
  if (!productId || !shop) {
    console.log("[api.product-discount] missing params", { productId, shop });

    return new Response(JSON.stringify({ discount: null }), {
      status: 200,
      headers,
    });
  }

  // Look up the discount in our own database.
  const discount = await getDiscountForProduct({ shop, productId });

  console.log("[api.product-discount] result", {
    shop,
    productId,
    found: !!discount,
  });

  // We always return status 200 because from the storefront side
  // "no discount" is not an error, it just means data.discount is null.
  return new Response(JSON.stringify({ discount }), {
    status: 200,
    headers,
  });
}
