import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Modal, SaveBar } from "@shopify/app-bridge-react";
import { Button, EmptyState, LegacyCard, Page } from "@shopify/polaris";
import { apiVersion, authenticate } from "app/shopify.server";
import {
  assignMetafieldToSpecificProduct,
  createGenericFile,
  deleteGenericFiles,
  fetchGraphQLQuery,
  fetchShopMetafieldsByNamespace,
  getMetafield,
  getMutlipleProductsMetafields,
  getProductMetafield,
  getReadyFileUrl,
  getShopId,
  getShopMetafield,
  parseFormData,
  updateMetafield,
  uploadVideo,
} from "app/utils/utils";
import path from "path";
import fs from "fs";
import { useEffect, useRef, useState } from "react";
import VideoCarousel from "app/components/VideoCarousel";
import Preview from "app/components/Preview";

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
    return {
      success: true,
      message: "Product updated successfully",
    };
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
  if (request.method === "PATCH") {
    const url = new URL(request.url);
    const metafieldId = `gid://shopify/Metafield/${url.pathname.split("/").pop()}`;
    const formData = await request.formData();
    const videoProducts = formData.get("videoProducts") as string;
    console.log(videoProducts, "video prodycts");
    const shopId = await getShopId(admin);
    const incomingData = JSON.parse(videoProducts);
    const metafield = await getShopMetafield(
      admin,
      "Product_page",
      "product_with_video",
    );
    console.log(metafield, "metafied");
    console.log(metafield?.jsonValue, "jvalu");
    const ids = new Set(incomingData.map((item: any) => item.videoId));
    const deletedId = metafield?.jsonValue
      ?.filter((item: any) => {
        return item?.videoUrls?.some((video: any) => !ids.has(video?.videoId));
      })
      .map((data: any) => data.videoUrls?.map((video: any) => video.videoId))
      .flat();
    console.log(deletedId, "delted id");
    if (deletedId) {
      await deleteGenericFiles(admin, deletedId);
    }
    const currentJsonValue = metafield.jsonValue;
    const updatedData = [
      {
        ...currentJsonValue,
        videoUrls: incomingData,
      },
    ];
    console.log(updatedData, "updated datat");
    // const updateMetafiled = await updateMetafield(
    //   admin,
    //   shopId,
    //   "Product_page",
    //   "product_with_video",
    //   updatedData,
    // );
    return { data: "updateMetafiled" };
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
  const VideoSettingQuery = `
      query GetMetafield {
        shop {
          metafield(namespace: "cartmade", key: "video_carousel_setting") {
            id
            key
            jsonValue
            type
            updatedAt
          }
        }
      }
    `;
  const videoData = await fetchGraphQLQuery(admin, VideoSettingQuery);
  const settingData =
    videoData.data.shop.metafield !== null
      ? videoData.data.shop.metafield.jsonValue
      : {};
  return {
    productInfo,
    settingData,
  };
};
const PDPSettings = () => {
  const loaderData: any = useLoaderData(),
    [items, setItems] = useState<any[]>(loaderData?.productInfo || []),
    [isLoading, setIsLoading] = useState<boolean>(false),
    [showModal, setShowModal] = useState<boolean>(false),
    [productId, setProductId] = useState<string>(""),
    fileInputRef = useRef<HTMLInputElement>(null),
    [currentVideoUrls, setCurrentVideoUrls] = useState<any[]>([]),
    fetcher = useFetcher();
  useEffect(() => {
    setItems(loaderData?.productInfo || []);
  }, [loaderData?.productInfo]);

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
                  <th className="px-4 text-left w-[10%] py-2 border-b border-gray-300">
                    Image
                  </th>
                  <th className="px-4 text-left w-[25%] py-2 border-b border-gray-300">
                    Title
                  </th>
                  <th className="px-4 text-left  w-[20%] py-2 border-b border-gray-300">
                    Handle
                  </th>
                  <th className="px-4 text-left w-[20%]  py-2 border-b border-gray-300">
                    Preview
                  </th>
                  <th className="px-4 w-[25%] text-left py-2 border-b border-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-100">
                    <td className="px-4 py-2 w-[10%] border-b border-gray-300">
                      <img
                        src={
                          item.imageUrl ||
                          "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        }
                        alt={item.title}
                        className="h-16 w-16 object-cover"
                      />
                    </td>
                    <td className="px-4 w-[25%] py-2 border-b border-gray-300">
                      {item.title}
                    </td>
                    <td className="px-4   w-[20%] py-2 border-b border-gray-300">
                      {item?.handle || "No handle"}
                    </td>
                    <td className="px-4 relative w-[20%] py-2 border-b border-gray-300">
                      {item?.videoUrls?.length && (
                        <span className="absolute top-1 text-black/50 ">
                          Total video : {item?.videoUrls?.length}
                        </span>
                      )}

                      <Button
                        onClick={() => {
                          setShowModal(true);
                          setCurrentVideoUrls(item?.videoUrls);
                        }}
                        disabled={!item?.videoUrls?.length}
                      >
                        Preview video
                      </Button>
                    </td>
                    <td className="px-4 w-[25%] py-2 border-b border-gray-300">
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

      {showModal && (
        <Preview
          isLoading={isLoading}
          settingData={loaderData?.settingData}
          videoUrls={currentVideoUrls}
          setShowModal={setShowModal}
        />
      )}
    </Page>
  );
};

export default PDPSettings;
