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
  try {
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

    const responseBody = await response.json();

    if (responseBody.errors) {
      const errorMessages = responseBody.errors
        .map((err: any) => err.message)
        .join(", ");
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }

    const userErrors = responseBody.data.metafieldsSet.userErrors;
    if (userErrors && userErrors.length > 0) {
      return [];
    }

    const metafields = responseBody.data.metafieldsSet.metafields;
    if (!metafields || metafields.length === 0) {
      throw new Error("No metafields returned from GraphQL API.");
    }

    return metafields;
  } catch (error: any) {
    console.error("Error in updateMetafield:", error);
    return [];
  }
}
