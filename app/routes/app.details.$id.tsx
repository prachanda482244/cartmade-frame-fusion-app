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
import { uploadVideo } from "app/utils/utils";
import VideoCarousel from "app/components/VideoCarousel";
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop, accessToken } = session;
  if (request.method === "POST" || request.method === "post") {
    const url = new URL(request.url);
    const id = Number(url.pathname.split("/").pop());
    const uploadHandler = unstable_createFileUploadHandler({
      directory: path.join(process.cwd(), "public", "uploads"),
      maxPartSize: 9_000_000,
      file: ({ filename }) => filename,
    });

    const formData = await unstable_parseMultipartFormData(
      request,
      uploadHandler,
    );

    const video = formData.get("video") as File;
    const videoPath = path.join(process.cwd(), "public/uploads", video.name);
    const videoBuffer = fs.readFileSync(videoPath);

    const resourceUrl = await uploadVideo(
      videoBuffer,
      shop,
      accessToken,
      apiVersion,
    );
    console.log(resourceUrl, "resoururl");

    fs.unlink(videoPath, (err) => {
      if (err) {
        console.error("file deleted successfully");
      }
    });
    const shopQuery = `
    query {
        shop {
          id
        }
      }
    `;
    const shopData = await admin.graphql(shopQuery);
    const shopResponse = await shopData.json();
    const shopId = shopResponse.data.shop.id;

    const metaFieldQuery = `
    query GetMetafield($id: ID!) {
  node(id: $id) {
    ... on Metafield {
      id
      namespace
      key
      value
      jsonValue
      ownerType
    }
  }
}
`;
    const response = await admin.graphql(metaFieldQuery, {
      variables: {
        id: `gid://shopify/Metafield/${id}`,
      },
    });
    const metaFieldResponse = await response.json();
    const namespace = metaFieldResponse.data.node.namespace;
    const key = metaFieldResponse.data.node.key;

    const currentJsonValue = metaFieldResponse.data.node.jsonValue;
    const updatedData = {
      ...currentJsonValue,
      videoUrls: [
        ...(currentJsonValue.videoUrls || []).filter((item: any) => item.url),
        { url: resourceUrl, products: [] },
      ],
    };
    const updateQuery = `
       mutation UpdateShopMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
          type
        }
        userErrors {
          field
          message
        }
      }
    }
    `;

    const updateResponse = await admin.graphql(updateQuery, {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace,
            key,
            value: JSON.stringify(updatedData),
            type: "json",
          },
        ],
      },
    });

    const metaDataresponse = await updateResponse.json();
    const actualData = metaDataresponse.data.metafieldsSet.metafields;
    console.log(actualData, "ACTUAL DATA");
    return { data: actualData };

    // const createFileQuery = `mutation fileCreate($files: [FileCreateInput!]!) {
    //   fileCreate(files: $files) {
    //     files {
    //       alt
    //        fileStatus
    //       id
    //     }
    //     userErrors {
    //       field
    //       message
    //     }
    //   }
    // }`;

    // const createFileVariables = {
    //   files: {
    //     alt: "fallback for a video",
    //     contentType: "VIDEO",
    //     originalSource: resourceUrl,
    //   },
    // };
    // const createFileQueryResult = await axios.post(
    //   `https://${shop}/admin/api/${apiVersion}/graphql.json`,
    //   {
    //     query: createFileQuery,
    //     variables: createFileVariables,
    //   },
    //   {
    //     headers: {
    //       "X-Shopify-Access-Token": `${accessToken}`,
    //     },
    //   },
    // );

    //   const fileIds = createFileQueryResult.data.data.fileCreate;
    //   const GET_FILE_QUERY = `
    //   query GetFilePreviews($ids: [ID!]!) {
    //     nodes(ids: $ids) {
    //       ... on File {
    //         fileStatus
    //         preview {
    //         image {
    //           url
    //         }
    //       }
    //     }
    //   }
    // }
    // `;
    //   const response = await admin.graphql(GET_FILE_QUERY, {
    //     variables: {
    //       ids: fileIds,
    //     },
    //   });
    //   const { data } = await response.json();
    //   console.log(data, "Data recive");
  }
  if (request.method === "PUT" || request.method === "put") {
    const url = new URL(request.url);
    const id = Number(url.pathname.split("/").pop());

    const formData = await request.formData();

    const videoProducts = formData.get("videoProducts") as string;
    const shopQuery = `
    query {
        shop {
          id
        }
      }
    `;
    const shopData = await admin.graphql(shopQuery);
    const shopResponse = await shopData.json();
    const shopId = shopResponse.data.shop.id;
    const incomingData = JSON.parse(videoProducts);
    const metaFieldQuery = `
    query GetMetafield($id: ID!) {
  node(id: $id) {
    ... on Metafield {
      id
      namespace
      key
      value
      jsonValue
      ownerType
    }
  }
}
`;
    const response = await admin.graphql(metaFieldQuery, {
      variables: {
        id: `gid://shopify/Metafield/${id}`,
      },
    });

    const metaFieldResponse = await response.json();

    const namespace = metaFieldResponse.data.node.namespace;
    const key = metaFieldResponse.data.node.key;

    const currentJsonValue = metaFieldResponse.data.node.jsonValue;

    const updatedData = {
      ...currentJsonValue,
      videoUrls: incomingData,
    };
    console.log(updatedData, "UPDATE DATA");
    const updateQuery = `
       mutation UpdateShopMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
          type
        }
        userErrors {
          field
          message
        }
      }
    }
    `;

    const updateResponse = await admin.graphql(updateQuery, {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace,
            key,
            value: JSON.stringify(updatedData),
            type: "json",
          },
        ],
      },
    });
    const metaDataresponse = await updateResponse.json();
    console.log(metaDataresponse.data.metafieldsSet, "Metadata");
    console.log(metaDataresponse.data.metafieldsSet.metafields, "metafields");
    const actualData = metaDataresponse.data.metafieldsSet.metafields;
    console.log(actualData);

    return { data: actualData };
  }
};
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  const {
    admin,
    session: { shop },
  } = await authenticate.admin(request);
  const metafieldId = `gid://shopify/Metafield/${id}`;
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
  const response = await admin.graphql(META_FIELD_QUERY, {
    variables: {
      id: metafieldId,
    },
  });
  {
    try {
      const { data } = await response.json();
      if (!data) {
        console.warn("No  metafield found.");
        return { error: "Data not found." };
      }
      if (data.node.jsonValue.videoUrls.length === 0) {
        return {
          videoUrls: [],
        };
      }
      return { videoUrls: data.node.jsonValue.videoUrls };
    } catch (error) {
      console.error("Error fetching  metafields:", error);
      return { error: "Unexpected error occurred while fetching metafield." };
    }
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
  console.log(loaderData, "Detail page fkin");
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
  }, [fetcher.state === "loading"]);
  console.log(loaderData.videoUrls, ":videoooso");
  return (
    <Page
      backAction={{ content: "Settings", url: "/app/video-settings" }}
      actionGroups={[
        {
          title: "Upload Video",
          actions: [
            {
              content: "Upload",
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
            placeholder="Carousel Title"
          />
        </p>
        <TitleBar title="Upload Url">
          <button onClick={() => shopify.modal.hide("url")}>Cancel</button>
          <button variant="primary">Upload</button>
        </TitleBar>
      </Modal>
      {!loaderData ||
      loaderData.videoUrls.length === 0 ||
      loaderData.videoUrls[0].url === "" ? (
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
        <VideoCarousel videoUrls={loaderData.videoUrls} isLoading={isLoading} />
      )}
    </Page>
  );
};

export default VideoSettingPage;
