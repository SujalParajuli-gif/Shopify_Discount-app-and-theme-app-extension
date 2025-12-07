// tiny API route that returns { discount: ... } as JSON

import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { getDiscountForProduct } from "../models/discount.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    // no product specified → no discount
    return new Response(JSON.stringify({ discount: null }), {
      headers: { "content-type": "application/json" },
    });
  }

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const discount = await getDiscountForProduct({ shop, productId });

  return new Response(JSON.stringify({ discount }), {
    headers: { "content-type": "application/json" },
  });
}
