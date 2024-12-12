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
import axios from "axios";
import fs from "fs";
import path from "path";
import { useCallback, useRef, useState } from "react";
import { uploadVideo } from "utils/utils";
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop, accessToken } = session;
  if (request.method === "POST" || request.method === "post") {
    const uploadHandler = unstable_createFileUploadHandler({
      directory: path.join(process.cwd(), "public", "uploads"),
      maxPartSize: 5_000_000,
      file: ({ filename }) => filename,
    });

    const formData = await unstable_parseMultipartFormData(
      request,
      uploadHandler,
    );
    const video = formData.get("video") as File;
    const videoPath = path.join(process.cwd(), "public/uploads", video.name);
    console.log(video);
    const videoBuffer = fs.readFileSync(videoPath);
    const resourceUrl = await uploadVideo(
      videoBuffer,
      shop,
      accessToken,
      apiVersion,
    );
    console.log(resourceUrl, "resoururl");
    const createFileQuery = `mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          alt
           fileStatus
          id
          preview{
          image{
              url
              id
              height
              width
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`;

    const createFileVariables = {
      files: [
        { alt: "alt-tag", contentType: "VIDEO", originalSource: resourceUrl },
      ],
    };
    const createFileQueryResult = await axios.post(
      `https://${shop}/admin/api/${apiVersion}/graphql.json`,
      {
        query: createFileQuery,
        variables: createFileVariables,
      },
      {
        headers: {
          "X-Shopify-Access-Token": `${accessToken}`,
        },
      },
    );
    console.log(createFileQueryResult.data, "files");
    const fileIds = createFileQueryResult.data.data.fileCreate;
    const GET_FILE_QUERY = `
    query GetFilePreviews($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on File {
          fileStatus
          preview {
          image {
            url
          }
        }
      }
    }
  }
  `;
    const response = await admin.graphql(GET_FILE_QUERY, {
      variables: {
        ids: fileIds,
      },
    });
    const { data } = await response.json();
    console.log(data, "Data recive");
    return 1;
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
        value
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
        console.warn("No PDF metafield found.");
        return { error: "Pdf not found." };
      }
      const carouselData = {
        id: data.node.id,
        title: data.node.jsonValue.title,
      };
      return { carouselData };
    } catch (error) {
      console.error("Error fetching PDF metafields:", error);
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
  console.log(loaderData, "Detail page");

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
        accept="application/video"
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

      <LegacyCard sectioned>
        <EmptyState
          heading="Manage your Carousel"
          action={{
            content: "Upload Video     ",
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
    </Page>
  );
};

export default VideoSettingPage;
