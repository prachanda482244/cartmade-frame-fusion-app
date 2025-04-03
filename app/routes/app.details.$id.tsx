import * as tiktokscraper from "tiktok-scraper-ts";

import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import {
  EmptyState,
  LegacyCard,
  Page,
  Select,
  TextField,
} from "@shopify/polaris";
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
import {
  InstagramEmbed,
  TikTokEmbed,
  YouTubeEmbed,
} from "react-social-media-embed";
import ytdl from "ytdl-core";
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
    await deleteGenericFiles(admin, deletedId);
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
  if (request.method === "PATCH") {
    const formData = await request.formData();
    const platFormName = formData.get("platFormName") as string;
    const platFormUrl = formData.get("platFormUrl") as string;
    console.log(`Platform: ${platFormName}, URL: ${platFormUrl}`);

    if (!platFormUrl) {
      return { error: "No URL provided" };
    }

    try {
      let videoUrl = "";
      let videoTitle = "downloaded_video";

      if (
        platFormName.toLowerCase() === "youtube" &&
        platFormUrl.includes("youtube.com")
      ) {
        if (!ytdl.validateURL(videoUrl)) {
          return { error: "Invalid YouTube URL" };
        }
        const videoInfo = await ytdl.getInfo(videoUrl);
        const videoTitle = videoInfo.videoDetails.title.replace(
          /[^a-zA-Z0-9]/g,
          "_",
        );

        const outputPath = path.resolve(`./downloads/${videoTitle}.mp4`);

        await new Promise((resolve, reject) => {
          ytdl(videoUrl, { quality: "highest" })
            .pipe(fs.createWriteStream(outputPath))
            .on("finish", resolve)
            .on("error", reject);
        });

        return { message: "video donwloaaed" };
        // const info = await ytdl.getBasicInfo(platFormUrl);
        // // videoTitle = info.videoDetails.title.replace(/[\/:*?"<>|]/g, "");
        // videoUrl = info.formats[0].url;
      } else if (platFormName.toLowerCase() === "tiktok") {
        const video = await tiktokscraper.fetchVideo(platFormUrl, true);
        // videoUrl = video;
      } else if (platFormName.toLowerCase() === "instagram") {
        console.log("Instagram download logic not implemented");
        return { error: "Instagram download not implemented" };
      }
      if (videoUrl) {
        const outputPath = path.resolve(`./downloads/${videoTitle}.mp4`);

        await new Promise((resolve, reject) => {
          ytdl(videoUrl, { quality: "highest" })
            .pipe(fs.createWriteStream(outputPath))
            .on("finish", resolve)
            .on("error", reject);
        });

        // const videoPath = path.join(process.cwd(), "public", "downloads");
        // console.log(videoPath, "path of the video");
        // const writeStream = fs.createWriteStream(videoPath);
        // const videoStream = ytdl(videoUrl);

        // videoStream.pipe(writeStream);

        return {
          message: `Video downloaded successfully from ${platFormName}`,
          videoUrl,
        };
      }
    } catch (error) {
      console.error("Error downloading video:", error);
      return { error: "Failed to download video" };
    }
  }

  return { error: "Invalid request method" };
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
  useEffect(() => {
    setIsLoading(false);
  }, [fetcher.state === "loading", loaderData]);

  if (fetcher.state === "loading") {
    shopify.toast.show("Setting saved successfully");
  }
  const [embeddedLinkSelected, setEmbeddedLinkSelected] = useState("youtube");

  const handleSelectChange = useCallback(
    (value: string) => setEmbeddedLinkSelected(value),
    [],
  );

  // Download the youtube and insta video and upload on shopify - remanining

  // const handleUploadUrl = async () => {
  //   const formData = new FormData();
  //   formData.append("platFormName", embeddedLinkSelected);
  //   formData.append("platFormUrl", url);
  //   fetcher.submit(formData, { method: "PATCH" });
  // };
  return (
    <Page
      backAction={{ content: "Settings", url: "/app/video-settings" }}
      // actionGroups={[
      //   {
      //     title: "Upload Video",
      //     actions: [
      //       {
      //         content: isLoading ? "Uploading..." : "Upload",
      //         disabled: isLoading,
      //         onAction: () => fileInputRef.current?.click(),
      //       },
      //       { content: "Upload from url", onAction: onCreateNewView },
      //     ],
      //   },
      // ]}
      primaryAction={{
        content: isLoading ? "Uploading..." : "Upload",
        disabled: isLoading,
        onAction: () => fileInputRef.current?.click(),
      }}
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

      {/*
      <Modal id="url">
        <p className="py-2 px-2 flex flex-col gap-2">
          <Select
            label="Embedded link"
            options={[
              {
                label: "Youtube",
                value: "youtube",
              },
              {
                label: "Tiktok",
                value: "tiktok",
              },
              {
                label: "Instagram",
                value: "instagram",
              },
            ]}
            onChange={handleSelectChange}
            value={embeddedLinkSelected}
          />
          <TextField
            label=""
            labelHidden
            value={url}
            onChange={handleChange}
            autoComplete="off"
            autoSize
            placeholder={`link of the ${embeddedLinkSelected}`}
          />
        </p>
        <TitleBar title="Upload Url">
          <button onClick={() => shopify.modal.hide("url")}>Cancel</button>
          <button onClick={handleUploadUrl} variant="primary">
            Upload
          </button>
        </TitleBar>
      </Modal>
      */}

      {loaderData.videoUrls[0]?.url === "" || !loaderData.videoUrls.length ? (
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
