import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { SaveBar, Modal } from "@shopify/app-bridge-react";
import {
  Button,
  EmptyState,
  LegacyCard,
  Page,
  Layout,
  Card,
  Text,
  Pagination,
} from "@shopify/polaris";
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
import { PlusCircleIcon, ViewIcon, PlayIcon } from "@shopify/polaris-icons";
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
  } else if (request.method === "DELETE") {
    const formData = await request.formData();
    const productId = formData.get("productId") as string;
    await assignMetafieldToSpecificProduct(admin, productId, []);
    return "Product deleted";
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
  const [isUploadingVideo, setIsUploadingVideo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

  const addProduct = async () => {
    const selected: any = await shopify.resourcePicker({
      type: "product",
      multiple: false,
      filter: { variants: false, archived: false, draft: false },
    });

    if (selected && selected.length > 0) {
      console.log("selected items", selected[0]);
      const product = {
        title: selected[0].title,
        handle: selected[0].handle,
        id: selected[0].id,
        imageUrl: selected[0].images.length
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
    const formData = new FormData();
    formData.append("productId", id);
    fetcher.submit(formData, { method: "DELETE" });
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
      setIsUploadingVideo(productId);
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

  const handleModalOpen = (url: string) => {
    setActiveVideoUrl(url);
    shopify.modal.show("video-modal");
  };
  console.log("fetcher", fetcher.data);

  useEffect(() => {
    if (fetcher.data?.metafieldData?.metafields?.[0]?.jsonValue?.videoUrls) {
      setIsUploadingVideo("");
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === productId
            ? {
                ...item,
                videoUrls:
                  fetcher.data.metafieldData.metafields[0].jsonValue.videoUrls,
              }
            : item,
        ),
      );
    }
  }, [fetcher.data]);

  const itemsPerPage = 5;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  console.log(loaderData, "loaderdata");
  console.log(items, "itemss");

  return (
    <Page
      title="PDP Settings"
      subtitle="Add and manage product videos for your store"
      primaryAction={{
        content: "Add Product",
        onAction: addProduct,
        icon: PlusCircleIcon,
      }}
    >
      <Modal id="video-modal">
        {activeVideoUrl && (
          <video
            controls
            autoPlay
            loop={true}
            muted={true}
            className="w-full h-[400px] object-cover"
          >
            <source src={activeVideoUrl} type="video/mp4" />
          </video>
        )}
      </Modal>

      <SaveBar id="my-save-bar">
        <button variant="primary" onClick={handleSubmit}></button>
        <button onClick={handleDiscard}></button>
      </SaveBar>

      {items.length > 0 ? (
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <div className="overflow-hidden rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                        Product
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                        Videos
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={
                                item.imageUrl ||
                                "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                              }
                              alt={item.title}
                              className="h-16 w-16 rounded-md object-cover"
                            />
                            <div>
                              <Text variant="bodyMd" fontWeight="normal">
                                {item.title}
                              </Text>
                              <Text variant="bodySm" color="subdued">
                                {item.handle}
                              </Text>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            {item.videoUrls && item.videoUrls.length > 0 ? (
                              item.videoUrls.map(
                                (video: any, index: number) => (
                                  <div key={index} className="relative group">
                                    <video
                                      className="h-16 w-16 rounded-md object-cover"
                                      controls={false}
                                    >
                                      <source
                                        src={video.videoUrl}
                                        type="video/mp4"
                                      />
                                    </video>
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-md flex items-center justify-center">
                                      <Button
                                        variant="secondary"
                                        size="micro"
                                        onClick={() =>
                                          handleModalOpen(video.videoUrl)
                                        }
                                        icon={PlayIcon}
                                      />
                                    </div>
                                  </div>
                                ),
                              )
                            ) : (
                              <Text color="subdued">No videos added</Text>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 w-[220px] align-middle">
                          <div className="flex items-center justify-end gap-3">
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="video/*"
                              className="hidden"
                              onChange={handleFileChange}
                              name="video"
                            />
                            <Button
                              variant="primary"
                              size="medium"
                              loading={isUploadingVideo === item.id}
                              onClick={() => {
                                fileInputRef.current?.click();
                                setProductId(item.id);
                              }}
                            >
                              Add Video
                            </Button>
                            {isUploadingVideo !== item.id && (
                              <Button
                                variant="secondary"
                                tone="critical"
                                size="medium"
                                onClick={() => handleRemove(item.id)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="flex items-center justify-center mt-4">
              <Pagination
                label={`Page ${currentPage} of ${totalPages}`}
                hasPrevious={currentPage > 1}
                onPrevious={() => setCurrentPage(currentPage - 1)}
                hasNext={currentPage < totalPages}
                onNext={() => setCurrentPage(currentPage + 1)}
              />
            </div>
          </Layout.Section>
        </Layout>
      ) : (
        <Layout.Section>
          <Card>
            <EmptyState
              heading="Add your first product"
              action={{
                content: "Add Product",
                onAction: addProduct,
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Start managing product videos by adding your first product.</p>
            </EmptyState>
          </Card>
        </Layout.Section>
      )}
    </Page>
  );
};

export default PDPSettings;
