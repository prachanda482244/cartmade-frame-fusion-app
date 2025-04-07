import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Button, Page } from "@shopify/polaris";
import { apiVersion, authenticate } from "app/shopify.server";
import {
  assignMetafieldToSpecificProduct,
  createGenericFile,
  deleteGenericFiles,
  fetchGraphQLQuery,
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
import Preview from "app/components/Preview";
import {
  getSpecificProductMetafield,
  getVideoProduct,
} from "app/helper/productHelper";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop, accessToken } = session;
  const shopId = await getShopId(admin);

  if (request.method === "POST") {
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
    const formData = await request.formData();
    const productId = formData.get("productId") as string;
    const incomingData = JSON.parse(formData.get("videoProducts") as string);

    const productMetafield: {
      videoUrls: [
        {
          videoUrl: string;
          videoId: string;
        },
      ];
    } = await getSpecificProductMetafield(admin, productId);
    const incomingVideoIds = incomingData?.map((item: any) => item.videoId);

    const deletedIds = productMetafield?.videoUrls
      ?.filter((item) => !incomingVideoIds.includes(item.videoId))
      ?.map((item) => item.videoId);

    if (deletedIds?.length !== 0) {
      await deleteGenericFiles(admin, deletedIds);
    }
    const updatedData = {
      videoUrls: incomingData,
    };

    await updateMetafield(
      admin,
      productId,
      "frame_fusion",
      "products",
      updatedData,
    );

    return { success: true, message: "Setting saved successfully" };
  }
  return null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const productInfo = await getVideoProduct(admin);

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
  console.log(loaderData?.productInfo, "prodictysts");
  useEffect(() => {
    setIsLoading(false);
    setItems(loaderData?.productInfo || []);
  }, [loaderData?.productInfo]);

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("video", file);
      formData.append("productId", productId);
      fetcher.submit(formData, {
        method: "POST",
        encType: "multipart/form-data",
        action: `/app/pdp-settings?productId=${productId}`,
      });
      fileInputRef.current.value = "";
    }
  };

  return (
    <Page title="Product Page">
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
                    {item?.videoUrls?.length !== 0 && (
                      <span className="absolute top-1 text-black/50 ">
                        Total video : {item?.videoUrls?.length}
                      </span>
                    )}

                    <Button
                      onClick={() => {
                        setShowModal(true);
                        setProductId(item?.id);
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
                        loading={isLoading && item.id === productId}
                        onClick={() => {
                          fileInputRef.current?.click();
                          setProductId(item.id);
                        }}
                      >
                        Add Video
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <Preview
          isLoading={isLoading}
          settingData={loaderData?.settingData}
          videoUrls={currentVideoUrls}
          setShowModal={setShowModal}
          productId={productId}
        />
      )}
    </Page>
  );
};

export default PDPSettings;
