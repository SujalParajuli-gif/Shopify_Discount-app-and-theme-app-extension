// Main home page for our app.
// Here we show a simple "Product discount" admin screen.
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
} from "../models/discount.server";

// very small GraphQL query to load some products for the dropdown
const PRODUCTS_QUERY = `#graphql
  query DiscountAdminProducts {
    products(first: 30) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`;

// shape of the data we send to the React component
type LoaderData = {
  discounts: any[]; // rows from ProductDiscount table
  products: { id: string; title: string }[]; // simple list for dropdown
};

// this runs on the server before the page renders
export async function loader({ request }: LoaderFunctionArgs) {
  // check admin session and give us Admin API client
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  //get some products for the select input
  const productsResponse = await admin.graphql(PRODUCTS_QUERY);
  const productsJson = await productsResponse.json();

  // defensive access in case data is empty
  const productsEdges = productsJson.data?.products?.edges || [];
  const products = productsEdges.map((edge: any) => edge.node);

  //get all discounts from our own DB table for this shop
  const discounts = await listProductDiscounts(shop);

  const data: LoaderData = {
    discounts,
    products,
  };

  return data;
}

// this runs when the form does a POST (Form method="post")
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // read values from FormData
  const formData = await request.formData();
  const title = String(formData.get("title") || "");
  const percentage = Number(formData.get("percentage") || 0);
  const productId = String(formData.get("productId") || "");

  // save one new row in ProductDiscount table
  await createProductDiscount({
    shop,
    title,
    percentage,
    productId,
  });

  // simple redirect back to /app so loader runs again
  return new Response(null, {
    status: 302,
    headers: { Location: "/app" },
  });
}

// React UI that admin sees
export default function Index() {
  const { discounts, products } = useLoaderData() as LoaderData;
  const hasProducts = products.length > 0;

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

      {/* ----- create discount form ----- */}
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
            This store doesn&apos;t have any products yet. Create a product
            first in Shopify, then refresh this page.
          </p>
        )}

        {/* important: use Form from react-router, not plain <form> */}
        <Form method="post">
          {/* title input */}
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
              placeholder="Winter sale 10% off"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          {/* percentage input */}
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

          {/* product dropdown (picker) */}
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
              Works like the QR demo picker: we store the product's GraphQL ID
              but you only choose the name.
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
      </section>

      {/* ----- list existing discounts ----- */}
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

        {(!discounts || discounts.length === 0) && (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            No discounts yet. Create one above.
          </p>
        )}

        {discounts && discounts.length > 0 && (
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

// keep Shopify special headers working for this route
export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
