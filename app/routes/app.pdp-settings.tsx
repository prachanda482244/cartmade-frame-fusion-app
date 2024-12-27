import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { SaveBar } from "@shopify/app-bridge-react";
import { Button, EmptyState, LegacyCard, Page } from "@shopify/polaris";
import { apiVersion, authenticate } from "app/shopify.server";
import {
  assignMetafieldToSpecificProduct,
  createGenericFile,
  fetchShopMetafieldsByNamespace,
  getMetafield,
  getMutlipleProductsMetafields,
  getProductMetafield,
  getReadyFileUrl,
  getShopId,
  parseFormData,
  updateMetafield,
  uploadVideo,
} from "app/utils/utils";
import path from "path";
import fs from "fs";
import { useEffect, useRef, useState } from "react";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop, accessToken } = session;
  const shopId = await getShopId(admin);

  if (request.method === "POST") {
    const formData = await request.formData();
    const products = JSON.parse(formData.get("products") as string);
    const productMetafield = await updateMetafield(
      admin,
      shopId,
      "Product_page",
      "product_with_video",
      products,
    );
    return "Products updated";
  } else if (request.method === "PUT") {
    const formData = await parseFormData(request);
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId") as string;
    const video = formData.get("video") as File;
    if (!video && !productId) return;
    const videoPath = path.join(process.cwd(), "public/uploads", video.name);
    const videoBuffer = fs.readFileSync(videoPath);
    const resourceUrl = await uploadVideo(
      videoBuffer,
      shop,
      accessToken,
      apiVersion,
    );
    fs.unlink(videoPath, (err) => {
      if (err) console.error("Error deleting file:", err);
    });

    const genericFile = await createGenericFile(resourceUrl, admin);
    const genericFileId = genericFile.id;
    const actualUrl = await getReadyFileUrl(admin, genericFile.id);

    const getMetadata: any = await getProductMetafield(admin, productId);
    const storedVideo = getMetadata?.metafields?.node.jsonValue["videoUrls"];
    let updatedVideoUrl;
    storedVideo?.length
      ? (updatedVideoUrl = [
          ...storedVideo,
          { videoUrl: actualUrl, videoId: genericFileId },
        ])
      : (updatedVideoUrl = [{ videoUrl: actualUrl, videoId: genericFileId }]);

    const metafieldData = await assignMetafieldToSpecificProduct(
      admin,
      productId,
      updatedVideoUrl,
    );
    if (!metafieldData) {
      return {
        metadata: [],
      };
    }
    return {
      metafieldData,
    };
  }
  return null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const metafield: any[] = await fetchShopMetafieldsByNamespace(
    admin,
    "Product_page",
  );
  const storedProduct = metafield?.[0]?.node?.jsonValue
    ? metafield?.[0]?.node?.jsonValue
    : [];

  const productIds = storedProduct.map(({ id }: any) => id);
  const { products: productInfo } = await getMutlipleProductsMetafields(
    admin,
    productIds,
  );

  return {
    productInfo,
  };
};
const PDPSettings = () => {
  const loaderData: any = useLoaderData();
  const [items, setItems] = useState<any[]>(loaderData?.productInfo || []);

  const [productId, setProductId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

  const addProduct = async () => {
    const selected: any = await shopify.resourcePicker({
      type: "product",
      multiple: false,
      filter: { variants: false, archived: false, draft: false },
    });

    if (selected && selected.length > 0) {
      const product = {
        title: selected[0].title,
        handle: selected[0].handle,
        id: selected[0].id,
        image: selected[0].images.length
          ? selected[0].images[0].originalSrc
          : "",
      };
      const productSet = new Set(items.map((item) => item.handle));
      if (!productSet.has(product.handle)) {
        setItems((prev) => [...prev, product]);
      } else {
        shopify.toast.show("product already exist");
      }
    }
    shopify.saveBar.show("my-save-bar");
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    shopify.saveBar.show("my-save-bar");
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("products", JSON.stringify(items));
    fetcher.submit(formData, { method: "POST" });
    shopify.saveBar.hide("my-save-bar");
  };

  const handleDiscard = () => {
    setItems(loaderData?.productInfo);
    shopify.saveBar.hide("my-save-bar");
  };

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("productId", productId);
      fetcher.submit(formData, {
        method: "PUT",
        encType: "multipart/form-data",
        action: `/app/pdp-settings?productId=${productId}`,
      });
      fileInputRef.current.value = "";
    }
  };

  console.log(loaderData, "loaderdata");
  console.log(items, "itemss");
  return (
    <Page
      title="Product Page"
      primaryAction={{ content: "Add Product", onAction: () => addProduct() }}
    >
      <SaveBar id="my-save-bar">
        <button variant="primary" onClick={handleSubmit}></button>
        <button onClick={handleDiscard}></button>
      </SaveBar>
      {items.length > 0 ? (
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b border-gray-300">Image</th>
                  <th className="px-4 py-2 border-b border-gray-300">Title</th>
                  <th className="px-4 py-2 border-b border-gray-300">Handle</th>
                  <th className="px-4 py-2 border-b border-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-100">
                    <td className="px-4 py-2 border-b border-gray-300">
                      <img
                        src={
                          item.imageUrl ||
                          "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        }
                        alt={item.title}
                        className="h-16 w-16 object-cover"
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-gray-300">
                      {item.title}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-300">
                      {item.handle}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-300">
                      <div className="flex gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="video/*"
                          className="hidden"
                          onChange={handleFileChange}
                          name="video"
                        />
                        <Button
                          onClick={() => {
                            fileInputRef.current?.click();
                            setProductId(item.id);
                          }}
                        >
                          Add Video
                        </Button>
                        <Button
                          tone="critical"
                          onClick={() => handleRemove(item.id)}
                        >
                          Remove
                        </Button>
                      </div>
                      {item.videoUrls.length &&
                        item.videoUrls.map((video: any) => (
                          <div key="12" className="w-12 h-12">
                            <video height={50} width={50}>
                              <source src={video.videoUrl} type="video/mp4" />
                            </video>
                          </div>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <LegacyCard sectioned>
          <EmptyState
            heading="Add your Product"
            action={{
              content: "Add Product",
              loading: false,
              onAction: addProduct,
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Manage and organize your Products with ease, ensuring quick access
              and efficient storage.
            </p>
          </EmptyState>
        </LegacyCard>
      )}
    </Page>
  );
};

export default PDPSettings;
