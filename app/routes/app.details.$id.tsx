import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import { EmptyState, LegacyCard, Page, TextField } from "@shopify/polaris";
import { apiVersion, authenticate } from "app/shopify.server";
import fs from "fs";
import path from "path";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGenericFile,
  deleteGenericFiles,
  fetchGraphQLQuery,
  getMetafield,
  getReadyFileUrl,
  getShopId,
  parseFormData,
  updateMetafield,
  uploadVideo,
} from "app/utils/utils";
import VideoCarousel from "app/components/VideoCarousel";
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop, accessToken } = session;
  if (request.method === "POST" || request.method === "post") {
    const url = new URL(request.url);
    const metafieldId = `gid://shopify/Metafield/${url.pathname.split("/").pop()}`;
    const formData = await parseFormData(request);
    const video = formData.get("video") as File;
    if (!video) return;
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
    const actualUrl = await getReadyFileUrl(admin, genericFile.id);
    const shopId = await getShopId(admin);
    const metafield = await getMetafield(admin, metafieldId);

    const updatedData = {
      ...metafield.jsonValue,
      videoUrls: [
        ...(metafield.jsonValue.videoUrls || []).filter(
          (item: any) => item.url,
        ),
        { url: actualUrl, products: [], videoId: genericFile.id },
      ],
    };
    console.log(updatedData, "UPDATED DATA");

    return await updateMetafield(
      admin,
      shopId,
      metafield.namespace,
      metafield.key,
      updatedData,
    );
  }
  if (request.method === "PUT" || request.method === "put") {
    const url = new URL(request.url);
    const metafieldId = `gid://shopify/Metafield/${url.pathname.split("/").pop()}`;
    const formData = await request.formData();
    const videoProducts = formData.get("videoProducts") as string;
    const shopId = await getShopId(admin);
    const incomingData = JSON.parse(videoProducts);
    const metafield = await getMetafield(admin, metafieldId);
    const ids = new Set(incomingData.map((item: any) => item.videoId));
    const deletedId = metafield.jsonValue.videoUrls
      .filter((item: any) => !ids.has(item.videoId))
      .map((data: any) => data.videoId);
    const deletedGenericFiles = await deleteGenericFiles(admin, deletedId);
    const currentJsonValue = metafield.jsonValue;
    const updatedData = {
      ...currentJsonValue,
      videoUrls: incomingData,
    };
    const updateMetafiled = await updateMetafield(
      admin,
      shopId,
      metafield.namespace,
      metafield.key,
      updatedData,
    );
    return { data: updateMetafiled };
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const metafieldId = `gid://shopify/Metafield/${url.pathname.split("/").pop()}`;
  const { admin } = await authenticate.admin(request);

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

  const META_FIELD_QUERY = `
  query getMetafield($id: ID!) {
    node(id: $id) {
      ... on Metafield {
        id
        namespace
        key
        jsonValue
        type
      }
    }
  }
`;

  try {
    const [metafieldData, videoCarouselData] = await Promise.all([
      fetchGraphQLQuery(admin, META_FIELD_QUERY, { id: metafieldId }),
      fetchGraphQLQuery(admin, VideoSettingQuery),
    ]);

    const videoUrls =
      metafieldData.data.node.jsonValue !== null
        ? metafieldData.data.node.jsonValue.videoUrls
        : [];
    const settingData =
      videoCarouselData.data.shop.metafield !== null
        ? videoCarouselData.data.shop.metafield.jsonValue
        : {};

    return {
      videoUrls,
      settingData,
    };
  } catch (error) {
    console.error("Error fetching metafields:", error);
    return {
      error: "Unexpected error occurred while fetching metafield." + error,
    };
  }
};

const VideoSettingPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fetcher = useFetcher();
  const [url, setUrl] = useState<string>("");
  const onCreateNewView = () => {
    shopify.modal.show("url");
  };
  const handleChange = useCallback((newValue: string) => {
    setUrl(newValue);
  }, []);
  const loaderData: any = useLoaderData();
  console.log(loaderData, "loaderda+");
  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("video", file);
      fetcher.submit(formData, {
        method: "post",
        encType: "multipart/form-data",
      });
      fileInputRef.current.value = "";
    }
  };
  console.log(loaderData, "loaderdata");
  useEffect(() => {
    setIsLoading(false);
  }, [fetcher.state === "loading", loaderData]);

  if (fetcher.state === "loading") {
    shopify.toast.show("Setting saved successfully");
  }
  return (
    <Page
      backAction={{ content: "Settings", url: "/app/video-settings" }}
      actionGroups={[
        {
          title: "Upload Video",
          actions: [
            {
              content: isLoading ? "Uploading..." : "Upload",
              disabled: isLoading,
              onAction: () => fileInputRef.current?.click(),
            },
            { content: "Upload from url", onAction: onCreateNewView },
          ],
        },
      ]}
      title="Video"
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
        name="video"
      />

      <Modal id="url">
        <p className="py-3 px-4">
          <TextField
            label=""
            labelHidden
            value={url}
            onChange={handleChange}
            autoComplete="off"
            autoSize
            placeholder="Link/url of the video"
          />
        </p>
        <TitleBar title="Upload Url">
          <button onClick={() => shopify.modal.hide("url")}>Cancel</button>
          <button variant="primary">Upload</button>
        </TitleBar>
      </Modal>
      {loaderData.videoUrls[0]?.url === "" ? (
        <LegacyCard sectioned>
          <EmptyState
            heading="Manage your Carousel"
            action={{
              content: "Upload Video",
              loading: isLoading,
              onAction: () => {
                fileInputRef.current?.click();
              },
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Manage and organize your Carousel documents with ease, ensuring
              quick access and efficient storage.
            </p>
          </EmptyState>
        </LegacyCard>
      ) : (
        <VideoCarousel
          videoUrls={loaderData.videoUrls}
          settingData={loaderData.settingData}
          isLoading={isLoading}
        />
      )}
    </Page>
  );
};

export default VideoSettingPage;
