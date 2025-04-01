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
