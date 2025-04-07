export const getAllProducts = async (admin: any) => {
  const query = `
   query {
  products(first:250){
    edges{
    node{
      title
      id
      metafield(namespace:"Analytics",key:"product"){
        jsonValue
      }
    }
  }
  }
    }
  `;
  try {
    const response = await admin.graphql(query);
    const result = await response.json();
    if (!result) {
      return { success: false, message: "failed to fetch products" };
    }
    return result?.data?.products?.edges || [];
  } catch (error) {
    return {
      success: false,
      message: `Error fetching products: ${error}`,
    };
  }
};

export const getProductIdFromVariant = async (admin: any, id: string) => {
  const query = `
     query{
  productVariant(id:"gid://shopify/ProductVariant/${id}"){
    product{
      id
    }
  }
}
      `;
  const response = await admin.graphql(query);
  const result = await response.json();
  if (!result)
    return {
      success: false,
    };
  return result?.data?.productVariant?.product?.id;
};

export const getProductMetafield = async (admin: any, productId: string) => {
  const query = `
  query{
  product(id:"${productId}"){
    metafield(namespace:"Analytics",key:"product"){
      jsonValue
    }
  }
}`;

  const response = await admin.graphql(query);
  const result = await response.json();
  if (!result) {
    return {
      success: false,
      message: "Failed to fetch product metafield",
    };
  }
  const metafield = result?.data?.product?.metafield;
  return metafield !== null ? metafield.jsonValue : {};
};

export const getVideoProduct = async (admin: any) => {
  const query = `
   query {
  products(first:250){
    edges{
    node{
      title
      id
      handle
       featuredMedia{
        preview{
          image{
            url
          }
        }
      }
     metafield(namespace:"frame_fusion" key:"products"){
      jsonValue
    }

    }
  }
  }  }`;
  const response = await admin.graphql(query);
  const { data } = await response.json();
  if (!data) {
    return { success: false, message: "Failed to fetch products" };
  }
  const productWithVideo = data?.products?.edges?.map(
    ({ node: { id, handle, title, featuredMedia, metafield } }: any) => ({
      id,
      handle,
      title,
      imageUrl:
        featuredMedia === null
          ? "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          : featuredMedia?.preview?.image?.url,
      videoUrls: metafield === null ? [] : metafield?.jsonValue?.videoUrls,
    }),
  );
  return productWithVideo;
};

export const getSpecificProductMetafield = async (
  admin: any,
  productId: string,
) => {
  const query = `
  query getProductMetafield($id:ID!){
  product(id:$id){
    id
    title
    metafield(namespace:"frame_fusion" key:"products"){
      jsonValue
    }
  }
}
  `;
  const response = await admin.graphql(query, {
    variables: {
      id: productId,
    },
  });

  const { data } = await response.json();
  if (!data) return { success: false, message: "Failed to retrieve product" };
  const metafield = data?.product?.metafield;
  const productMetafield = metafield === null ? [] : metafield?.jsonValue;
  return productMetafield;
};
