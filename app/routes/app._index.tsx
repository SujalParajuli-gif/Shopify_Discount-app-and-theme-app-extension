// Main admin home route for the product-discount app.
// Here the merchant can create discounts, see existing ones,
// and now also delete individual discounts or clear all of them.

import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  HeadersFunction,
} from "react-router";
import { useLoaderData, Form } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import {
  createProductDiscount,
  listProductDiscounts,
  deleteProductDiscountById,
  deleteAllDiscountsForShop,
  createBuyXGetYDiscount,
  listBuyXGetYDiscounts,
  deleteBuyXGetYDiscountById,
} from "../models/discount.server";

// Small GraphQL query to load a few products for the select input.
const PRODUCTS_QUERY = `#graphql
  query DiscountAdminProducts {
    products(first: 20) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`;

// Shape of the data that the loader returns to the React component.
type LoaderData = {
  discounts: any[];
  products: { id: string; title: string }[];
  buyXGetYDiscounts: any[];
};

// Loader runs before rendering the page in the admin.
// It fetches the product list and the existing discounts for this shop.
export async function loader({ request }: LoaderFunctionArgs) {
  // Authenticate the admin user and get a GraphQL client.
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  // Load some products for the dropdown.
  const productsResponse = await admin.graphql(PRODUCTS_QUERY);
  const productsJson = await productsResponse.json();

  // Defensive access in case the query returns no products.
  const productsEdges = productsJson.data?.products?.edges || [];
  const products = productsEdges.map((edge: any) => edge.node);

  // Load all stored discounts for this shop from our database.
  const discounts = await listProductDiscounts(shop);

  // Load Buy X Get Y rules from our database.
  const buyXGetYDiscounts = await listBuyXGetYDiscounts(shop);

  const data: LoaderData = {
    discounts,
    products,
    buyXGetYDiscounts,
  };

  return data;
}

// Action runs when a form is submitted from the admin page.
// We use a hidden _action field to know what the user wants to do.
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = String(formData.get("_action") || "");

  if (intent === "create") {
    // Create a new product discount from the main form.
    const title = String(formData.get("title") || "");
    const percentage = Number(formData.get("percentage") || 0);
    const productId = String(formData.get("productId") || "");

    await createProductDiscount({
      shop,
      title,
      percentage,
      productId,
    });
  } else if (intent === "delete-one") {
    // Delete a single discount row by its id.
    const id = String(formData.get("id") || "");

    await deleteProductDiscountById({
      shop,
      id,
    });
  } else if (intent === "delete-all") {
    // Delete all discount rows for this shop.
    await deleteAllDiscountsForShop(shop);
  } else if (intent === "create-buy-x-get-y") {
    // Create a new Buy X Get Y rule from the second form.
    const productXId = String(formData.get("productXId") || "");
    const productYId = String(formData.get("productYId") || "");
    const quantityX = Number(formData.get("quantityX") || 0);
    const percentageOff = Number(formData.get("percentageOff") || 0);

    await createBuyXGetYDiscount({
      shop,
      productXId,
      productYId,
      quantityX,
      percentageOff,
      quantityY: 1,
    });
  } else if (intent === "delete-buy-x-get-y-one") {
    // Delete a single Buy X Get Y rule by its id.
    const id = String(formData.get("id") || "");

    await deleteBuyXGetYDiscountById({
      shop,
      id,
    });
  } else {
    console.log("[app._index action] unknown _action intent", intent);
  }

  // Redirect back to /app so the loader runs again and the UI refreshes.
  return new Response(null, {
    status: 302,
    headers: { Location: "/app" },
  });
}

// React UI for the admin page.
// It shows the create form, a clear all button, and the existing discounts table.
export default function Index() {
  const { discounts, products, buyXGetYDiscounts } =
    useLoaderData() as LoaderData;
  const hasProducts = products.length > 0;

  const hasDiscounts = discounts && discounts.length > 0;
  const hasBuyXGetYDiscounts =
    buyXGetYDiscounts && buyXGetYDiscounts.length > 0;

  return (
    <main style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "20px",
          fontWeight: 600,
          marginBottom: "16px",
        }}
      >
        Product discounts
      </h1>

      {/* Create discount form section */}
      <section
        style={{
          marginBottom: "24px",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "12px",
          }}
        >
          Create discount
        </h2>

        {!hasProducts && (
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              marginBottom: "12px",
            }}
          >
            This store does not have any products yet. Create a product in
            Shopify and then refresh this page.
          </p>
        )}

        {/* Important: using Form from react-router, so its not a plain form tag */}
        <Form method="post">
          {/* Hidden field to tell the action we are creating a discount */}
          <input type="hidden" name="_action" value="create" />

          {/* Title input */}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Title
            </label>
            <input
              name="title"
              placeholder="Winter sale 10 percent off"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          {/* Percentage input */}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Percentage (%)
            </label>
            <input
              name="percentage"
              type="number"
              min={1}
              max={100}
              placeholder="10"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          {/* Product dropdown input */}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Product
            </label>

            <select
              name="productId"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                backgroundColor: hasProducts ? "#ffffff" : "#f9fafb",
              }}
              defaultValue=""
              disabled={!hasProducts}
            >
              <option value="" disabled>
                {hasProducts ? "Select a product..." : "No products available"}
              </option>

              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>

            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              We store the product GraphQL id but you select it by name.
            </p>
          </div>

          <button
            type="submit"
            style={{
              marginTop: "8px",
              padding: "8px 14px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#111827",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Save discount
          </button>
        </Form>

        {/* Clear all discounts button lives under the form */}
        {hasDiscounts && (
          <Form method="post" style={{ marginTop: "12px" }}>
            <input type="hidden" name="_action" value="delete-all" />
            <button
              type="submit"
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #ef4444",
                backgroundColor: "#ffffff",
                color: "#b91c1c",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Clear all discounts
            </button>
          </Form>
        )}
      </section>

      {/* Existing discounts table section */}
      <section>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          Existing discounts
        </h2>

        {!hasDiscounts && (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            No discounts yet. Create one above.
          </p>
        )}

        {hasDiscounts && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e5e7eb",
              fontSize: "14px",
              backgroundColor: "#ffffff",
            }}
          >
            <thead style={{ backgroundColor: "#f9fafb" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>Title</th>
                <th style={{ textAlign: "left", padding: "8px" }}>%</th>
                <th style={{ textAlign: "left", padding: "8px" }}>
                  Product GID
                </th>
                <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d: any) => (
                <tr key={d.id}>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {d.title}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {d.percentage}%
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {d.productId}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {/* Small inline form for deleting one row */}
                    <Form method="post">
                      <input type="hidden" name="_action" value="delete-one" />
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid #ef4444",
                          backgroundColor: "#ffffff",
                          color: "#b91c1c",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Delete
                      </button>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <br></br>
      <br></br>

      {/* Buy X Get Y discount form */}
      <section
        style={{
          marginBottom: "24px",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "12px",
          }}
        >
          Buy X Get Y discount
        </h2>

        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            marginBottom: "12px",
          }}
        >
          Here we write: "When customer buys X (quantity), Y gets a percentage
          discount in the cart."
        </p>

        <Form method="post">
          <input type="hidden" name="_action" value="create-buy-x-get-y" />

          {/* Product X dropdown */}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Product X (customer buys)
            </label>

            <select
              name="productXId"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                backgroundColor: hasProducts ? "#ffffff" : "#f9fafb",
              }}
              defaultValue=""
              disabled={!hasProducts}
            >
              <option value="" disabled>
                {hasProducts ? "Select product X..." : "No products available"}
              </option>

              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>
          </div>

          {/* Product Y dropdown */}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Product Y (gets discount)
            </label>

            <select
              name="productYId"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                backgroundColor: hasProducts ? "#ffffff" : "#f9fafb",
              }}
              defaultValue=""
              disabled={!hasProducts}
            >
              <option value="" disabled>
                {hasProducts ? "Select product Y..." : "No products available"}
              </option>

              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity of X required */}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Quantity of X required
            </label>
            <input
              name="quantityX"
              type="number"
              min={1}
              placeholder="2"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
              }}
            />
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              Example: 2 means "Buy 2 of X".
            </p>
          </div>

          {/* Discount percentage on Y */}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Discount on Y (%)
            </label>
            <input
              name="percentageOff"
              type="number"
              min={1}
              max={100}
              placeholder="50"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
              }}
            />
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              Example: 100 = free, 50 = 50% off Y.
            </p>
          </div>

          <button
            type="submit"
            style={{
              marginTop: "8px",
              padding: "8px 14px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#111827",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Save Buy X Get Y rule
          </button>
        </Form>
      </section>

      {/* Buy X Get Y rules table */}
      <section style={{ marginTop: "24px" }}>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          Buy X Get Y rules
        </h2>

        {!hasBuyXGetYDiscounts && (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            No Buy X Get Y rules yet. Create one above.
          </p>
        )}

        {hasBuyXGetYDiscounts && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e5e7eb",
              fontSize: "14px",
              backgroundColor: "#ffffff",
            }}
          >
            <thead style={{ backgroundColor: "#f9fafb" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>
                  Product X GID
                </th>
                <th style={{ textAlign: "left", padding: "8px" }}>
                  Product Y GID
                </th>
                <th style={{ textAlign: "left", padding: "8px" }}>Qty X</th>
                <th style={{ textAlign: "left", padding: "8px" }}>
                  Discount on Y (%)
                </th>
                <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buyXGetYDiscounts.map((rule: any) => (
                <tr key={rule.id}>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {rule.productXGid}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {rule.productYGid}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {rule.quantityX}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {rule.percentageOff}%
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <Form method="post">
                      <input
                        type="hidden"
                        name="_action"
                        value="delete-buy-x-get-y-one"
                      />
                      <input type="hidden" name="id" value={rule.id} />
                      <button
                        type="submit"
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid #ef4444",
                          backgroundColor: "#ffffff",
                          color: "#b91c1c",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Delete
                      </button>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

// Keep Shopify special headers working for this route.
export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
