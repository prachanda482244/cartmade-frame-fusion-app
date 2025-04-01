import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { updateMetafield } from "app/utils/utils";
import {
  getProductIdFromVariant,
  getProductMetafield,
} from "app/helper/productHelper";
import { analyticsEventEmitter } from "app/eventsEmitter/eventEmitter";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  analyticsEventEmitter.on("PRODUCT_ADD_TO_CART", async (variantId, count) => {
    try {
      const productId = await getProductIdFromVariant(admin, variantId);
      let storedAnalytics = await getProductMetafield(admin, productId);
      storedAnalytics = {
        ...storedAnalytics,
        count: (storedAnalytics?.count || 0) + count,
      };
      await updateMetafield(
        admin,
        productId,
        "Analytics",
        "product",
        storedAnalytics,
      );
    } catch (error) {
      console.error("Error in PRODUCT_ADD_TO_CART handler:", error);
    }
  });

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/video-settings">Settings</Link>
        <Link to="/app/pdp-settings">PDP Settings</Link>
        <Link to="/app/analytics">Analytics</Link>
        <Link to="/app/global-settings">Global Settings</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
