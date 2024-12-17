import { Button, ButtonGroup, Page } from "@shopify/polaris";
import { useCallback, useState } from "react";
import { buttonsName } from "app/config/config";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { apiVersion, authenticate } from "app/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { accessToken, shop }: any = session;

  if (request.method === "POST") {
    const formData = await request.formData();
    const source = formData.get("source");
    if (source === "ButtonDesign") {
      const borderWidth = formData.get("borderWidth") as string;
      const borderColor = formData.get("borderColor") as string;
      const turnOnBorder = formData.get("turnOnBorder") as string;
      const muteSound = formData.get("muteSound") as string;
      const loopVideo = formData.get("loopVideo") as string;
      const autoPlay = formData.get("autoPlay") as string;
      const centerVideo = formData.get("centerVideo") as string;
      const addToCart = formData.get("addToCart") as string;
      const metafieldData = {
        namespace: "cartmade",
        key: "video_carousel_setting",
        value: JSON.stringify({
          borderWidth: parseInt(borderWidth),
          turnOnBorder: turnOnBorder === "true" ? true : false,
          muteSound: muteSound === "true" ? true : false,
          borderColor,
          addToCart: addToCart === "true" ? true : false,
          loopVideo: loopVideo === "true" ? true : false,
          autoPlay: autoPlay === "true" ? true : false,
          centerVideo: centerVideo === "true" ? true : false,
        }),
        type: "json",
        owner_resource: "shop",
      };

      const response = await fetch(
        `https://${shop}/admin/api/${apiVersion}/metafields.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({ metafield: metafieldData }),
        },
      );

      const responseData = await response.json();
      if (!response.ok) {
        return json(
          { error: responseData.errors || "Failed to save metafield" },
          { status: response.status },
        );
      }
      return json({
        message: "Public metafield saved successfully",
        data: responseData,
      });
    } else if (source === "TooltipSettings") {
      const backgroundColor = formData.get("backgroundColor");
      const fontColor = formData.get("fontColor");
      const priceColor = formData.get("priceColor");
      const metafieldData = {
        namespace: "cartmade",
        key: "cod_tooltip_settings",
        value: JSON.stringify({
          backgroundColor,
          fontColor,
          priceColor,
        }),
        type: "json",
        owner_resource: "shop",
      };

      const response = await fetch(
        `https://${shop}/admin/api/${apiVersion}/metafields.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({ metafield: metafieldData }),
        },
      );

      const responseData = await response.json();
      if (!response.ok) {
        return json(
          { error: responseData.errors || "Failed to save metafield" },
          { status: response.status },
        );
      }
      return json({
        message: "Public metafield saved successfully",
        data: responseData,
      });
    }
    return 1;
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const fetchMetafield = async (namespace: string, key: string) => {
    const query = `
      query GetMetafield {
        shop {
          metafield(namespace: "${namespace}", key: "${key}") {
            id
            key
            value
            jsonValue
            type
            updatedAt
          }
        }
      }
    `;
    try {
      const response = await admin.graphql(query);
      const data = await response.json();
      return data?.data?.shop?.metafield || null;
    } catch (error) {
      console.error(`Error fetching metafield (${key}):`, error);
      return null;
    }
  };

  try {
    const [buttonSettings] = await Promise.all([
      fetchMetafield("cartmade", "video_carousel_setting"),
    ]);

    if (!buttonSettings) {
      return { error: "No metafield data found." };
    }

    return {
      buttonSettings,
    };
  } catch (error) {
    console.error("Error fetching metafields:", error);
    return { error: "Unexpected error occurred while fetching metafields." };
  }
};

const GlobalSettings = () => {
  const [activeButton, setActiveButton] = useState<string>("buttonDesign");
  const loaderData = useLoaderData<any>();
  const handleButtonClick = useCallback(
    (link: string) => {
      if (activeButton === link) return;
      setActiveButton(link);
    },
    [activeButton],
  );

  const buttonSettings = loaderData?.buttonSettings || {};

  const ActiveComponent = buttonsName.find(
    ({ link }) => link === activeButton,
  )?.component;

  return (
    <Page title="Global Settings">
      <ButtonGroup variant="segmented" gap="loose">
        {buttonsName &&
          buttonsName.length &&
          buttonsName.map(({ index, name, link }) => (
            <Button
              key={index}
              onClick={() => handleButtonClick(link)}
              pressed={link === activeButton}
            >
              {name}
            </Button>
          ))}
      </ButtonGroup>

      <div className="mt-6">
        {ActiveComponent && (
          <ActiveComponent
            {...(activeButton === "buttonDesign" ? { buttonSettings } : {})}
          />
        )}
      </div>
    </Page>
  );
};

export default GlobalSettings;
