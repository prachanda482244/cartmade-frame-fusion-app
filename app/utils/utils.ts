import {
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import axios from "axios";
import { Console } from "console";
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

export async function fetchShopMetafieldsByNamespace(
  admin: any,
  namespace: string,
  first: number = 10,
) {
  const query = `
      query GetShopMetafieldsByNamespace($namespace: String!, $first: Int = 10) {
        shop {
          metafields(first: $first, namespace: $namespace) {
            edges {
              node {
                ownerType
                id
                namespace
                key
                jsonValue
                type
              }
            }
          }
        }
      }
    `;

  const variables = { namespace, first };

  try {
    const response = await admin.graphql(query, { variables });
    const responseBody = await response.json();
    return responseBody.data.shop.metafields.edges;
  } catch (error) {
    console.error("Error fetching shop metafields by namespace:", error);
    return [];
  }
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
export async function deleteGenericFiles(admin: any, deleteIds: string[]) {
  const deleteQuery = `
   mutation {
      fileDelete(fileIds: ${JSON.stringify(deleteIds)}) {
        deletedFileIds
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(deleteQuery);

  const result = await response.json();
  if (result.data?.fileDelete?.userErrors?.length > 0) {
    console.error(
      "Errors occurred during file deletion:",
      result.data.fileDelete.userErrors,
    );
    return result.fileDelete;
  }
  return result.data.fileDelete.deletedFileIds;
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

export async function getMultipleMetafields(
  admin: any,
  metafieldIds: string[],
) {
  const metaFieldQuery = `
    query GetMultipleMetafields($ids: [ID!]!) {
      nodes(ids: $ids) {
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
    variables: { ids: metafieldIds },
  });

  return (await response.json()).data.nodes;
}
export const assignMetafieldToSpecificProduct = async (
  admin: any,
  productId: string,
  videoUrls: string[],
) => {
  const productAssignQuery = `
    mutation SetProductMetafield($productId: ID!, $videoUrl: String!) {
      metafieldsSet(metafields: [
        {
          namespace: "frame_fusion"
          key: "products"
          value: $videoUrl
          type: "json"
          ownerId: $productId
        }
      ]) {
        metafields {
          id
          namespace
          key
          jsonValue
          type
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(productAssignQuery, {
      variables: {
        productId: productId,
        videoUrl: JSON.stringify({ videoUrls: videoUrls }),
      },
    });

    const { data, errors } = await response.json();

    if (errors) {
      console.error("GraphQL Error:", errors);
      return { success: false, errors };
    }

    if (data.metafieldsSet.userErrors.length > 0) {
      console.error("User Errors:", data.metafieldsSet.userErrors);
      return { success: false, userErrors: data.metafieldsSet.userErrors };
    }

    return { metafields: data.metafieldsSet.metafields };
  } catch (error) {
    console.error("An error occurred:", error);
    return { success: false, error };
  }
};

export const getProductMetafield = async (admin: any, productId: string) => {
  const productQuery = `
query GetProductMetafields($productId: ID!) {
  product(id: $productId) {
    id
    title
    metafields(first: 10, namespace: "frame_fusion") {
      edges {
        node {
          id
          namespace
          key
          value
          jsonValue
          type
        }
      }
    }
  }
}
`;
  try {
    const response = await admin.graphql(productQuery, {
      variables: {
        productId: productId,
      },
    });

    const { data, errors } = await response.json();
    if (errors) {
      console.error("GraphQL Error:", errors);
      return { success: false, errors };
    }

    if (!data.product.metafields.edges?.[0]) {
      console.error("User Errors");
      return { success: false, userErrors: "Error occured" };
    }
    return { metafields: data.product.metafields.edges?.[0] };
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getMutlipleProductsMetafields = async (
  admin: any,
  productIds: string[],
) => {
  const productQuery = `
  query GetProductMetafields($productIds: [ID!]!) {
    nodes(ids: $productIds) {
      ... on Product {
        id
        title
        handle
        featuredMedia{
        preview{
          image{
            url
          }
        }
      }
        metafields(first: 10, namespace: "frame_fusion") {
          edges {
            node {
              id
              namespace
              key
              jsonValue
              type
            }
          }
        }
      }
    }
  }
  `;

  try {
    const response = await admin.graphql(productQuery, {
      variables: {
        productIds: productIds,
      },
    });

    const { data, errors } = await response.json();
    if (errors) {
      console.error("GraphQL Error:", errors);
      return { success: false, errors };
    }

    if (!data.nodes || data.nodes.length === 0) {
      console.error("No products found.");
      return { success: false, userErrors: "No products found." };
    }

    const productsWithMetafields = data.nodes.map((node: any) => {
      return {
        id: node.id,
        title: node.title,
        handle: node?.handle,
        imageUrl:
          node.featuredMedia != null
            ? node.featuredMedia["preview"]["image"]["url"]
            : "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
        videoUrls: node.metafields.edges.length
          ? node.metafields.edges[0]["node"]?.jsonValue.videoUrls
          : [],
      };
    });

    return { products: productsWithMetafields };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Error fetching products" };
  }
};
export async function getShopMetafield(
  admin: any,
  namespace: string,
  key: string,
) {
  const shopMetafieldQuery = `
    query GetShopMetafield($namespace: String!, $key: String!) {
      shop {
        metafield(namespace: $namespace, key: $key) {
          id
          jsonValue
          type
        }
      }
    }
  `;

  try {
    if (!namespace || !key) {
      return { error: "Both namespace and key must be provided." };
    }

    const response = await admin.graphql(shopMetafieldQuery, {
      variables: { namespace, key },
    });
    const result = await response.json();
    const metafield = result.data.shop.metafield;
    return metafield;
  } catch (error: any) {
    console.error("Error fetching shop metafield:", error.message);
    throw error;
  }
}
