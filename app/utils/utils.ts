import {
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import axios from "axios";
import path from "path";

export function generateRandomString() {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 20; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

export const uploadVideo = async (
  videoBuffer: any,
  shop: string,
  accessToken: any,
  apiVersion: string,
) => {
  const stagedUploadsQuery = `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          resourceUrl
          url
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }`;

  const stagedUploadsVariables = {
    input: {
      filename: "video.mp4",
      httpMethod: "POST",
      mimeType: "video/mp4",
      resource: "FILE",
    },
  };

  const stagedUploadsQueryResult = await axios.post(
    `https://${shop}/admin/api/${apiVersion}/graphql.json`,
    {
      query: stagedUploadsQuery,
      variables: stagedUploadsVariables,
    },
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    },
  );

  const target =
    stagedUploadsQueryResult.data.data.stagedUploadsCreate.stagedTargets[0];
  const params = target.parameters;
  const url = target.url;
  const resourceUrl = target.resourceUrl;

  const form = new FormData();
  params.forEach(({ name, value }: any) => {
    form.append(name, value);
  });

  form.append(
    "file",
    new Blob([videoBuffer], { type: "video/mp4" }),
    `video-${Date.now()}.mp4`,
  );

  await axios.post(url, form, {
    headers: {
      "Content-Type": "multipart/form-data",
      "X-Shopify-Access-Token": accessToken,
    },
  });

  return resourceUrl;
};

export const uploadHandler = unstable_createFileUploadHandler({
  directory: path.join(process.cwd(), "public", "uploads"),
  maxPartSize: 9_000_000,
  file: ({ filename }) => filename,
});

export async function parseFormData(request: any) {
  return await unstable_parseMultipartFormData(request, uploadHandler);
}

export async function createGenericFile(resourceUrl: string, admin: any) {
  const mutationQuery = `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          fileStatus
          alt
          createdAt
        }
      }
    }
  `;

  const response = await admin.graphql(mutationQuery, {
    variables: {
      files: {
        alt: "fallback text for a video",
        contentType: "FILE",
        originalSource: resourceUrl,
      },
    },
  });

  const { data: genericFile } = await response.json();
  return genericFile.fileCreate.files[0];
}

export async function getReadyFileUrl(admin: any, genericFileId: string) {
  const queryStatus = `
    query {
      node(id: "${genericFileId}") {
        ... on GenericFile {
          id
          fileStatus
          url
          alt
          createdAt
        }
      }
    }
  `;

  let retries = 5;
  const interval = 3000;

  while (retries > 0) {
    const readyFile = await admin.graphql(queryStatus);
    const { data } = await readyFile.json();

    if (data?.node?.fileStatus === "READY") {
      return data.node.url;
    }

    retries--;
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw new Error("File is not ready after retries.");
}

export async function getShopId(admin: any) {
  const shopQuery = `
    query {
      shop {
        id
      }
    }
  `;
  const response = await admin.graphql(shopQuery);
  const shopData = await response.json();
  return shopData.data.shop.id;
}

export async function getMetafield(admin: any, metafieldId: string) {
  const metaFieldQuery = `
    query GetMetafield($id: ID!) {
      node(id: $id) {
        ... on Metafield {
          id
          namespace
          key
          jsonValue
          ownerType
        }
      }
    }
  `;
  const response = await admin.graphql(metaFieldQuery, {
    variables: { id: metafieldId },
  });
  return (await response.json()).data.node;
}
export async function updateMetafield(
  admin: any,
  shopId: string,
  namespace: string,
  key: string,
  updatedData: any,
) {
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

  const response = await admin.graphql(updateQuery, {
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

  return (await response.json()).data.metafieldsSet.metafields;
}

interface GraphQLResponse<T = any> {
  data: any;
  errors?: any;
}

export async function fetchGraphQLQuery<T>(
  admin: any,
  query: string,
  variables: Record<string, any> = {},
): Promise<GraphQLResponse<T>> {
  try {
    const response = await admin.graphql(query, { variables });
    const responseBody = await response.json();
    return responseBody;
  } catch (error) {
    console.error("Error fetching GraphQL query:", error);
    throw new Error("Error fetching GraphQL query");
  }
}
