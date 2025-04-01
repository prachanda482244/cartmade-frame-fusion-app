import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { analyticsEventEmitter } from "app/eventsEmitter/eventEmitter";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  analyticsEventEmitter.emit("PRODUCT_ADD_TO_CART", "123", 2);
  return {
    success: true,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const analytics = await request.json();
  console.log(analytics, "analytc");
  if (!analytics?.productVariantId)
    return { success: false, message: "No analytics provided" };
  analyticsEventEmitter.emit(
    "PRODUCT_ADD_TO_CART",
    analytics.productVariantId,
    analytics.count,
  );
  return { success: true };
};
