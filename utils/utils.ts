import axios from "axios";

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
