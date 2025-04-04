import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import {
  EmptyState,
  IndexTable,
  LegacyCard,
  Page,
  Spinner,
  TextField,
  useBreakpoints,
  useIndexResourceState,
} from "@shopify/polaris";
import { apiVersion, authenticate } from "app/shopify.server";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { LoaderResponse } from "app/types/type";
import {
  deleteGenericFiles,
  generateRandomString,
  getMetafield,
  getMultipleMetafields,
  getShopId,
  updateMetafield,
} from "app/utils/utils";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop, accessToken } = session;
  if (!accessToken) return { error: true, message: "Access token not found" };

  if (request.method === "POST" || request.method === "post") {
    const formData = await request.formData();
    const title = formData.get("carousel-title") as string;
    const key = generateRandomString();
    const date = new Date().toLocaleDateString();
    const metafieldData = {
      namespace: "carousel-title",
      key,
      value: JSON.stringify({
        title,
        date,
        videoUrls: [{ url: "", products: [] }],
      }),
      type: "json",
      owner_resource: "shop",
    };
    try {
      const { data } = await axios.post(
        `https://${shop}/admin/api/${apiVersion}/metafields.json`,
        { metafield: metafieldData },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
        },
      );
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error(error.response.data, "Something went wrong");
      return {
        error: true,
        message: "Something went wrong",
      };
    }
  }
  if (request.method === "DELETE" || request.method === "delete") {
    const formData = await request.formData();
    const metafieldIds: any = formData.get("metafieldIds");
    const query = formData.get("query") as string;

    if (!metafieldIds) {
      return { error: "No metafieldId provided" };
    }
    const idsArray = JSON.parse(metafieldIds);
    console.log(idsArray, "array");

    if (!Array.isArray(idsArray) || idsArray.length === 0) {
      return { error: "Invalid metafieldIds provided" };
    }
    const metaFields = await getMultipleMetafields(admin, idsArray);
    const deleteIds = metaFields.flatMap(({ jsonValue }: any) =>
      jsonValue?.videoUrls[0]?.videoId
        ? jsonValue.videoUrls.flatMap(({ videoId }: any) => videoId)
        : [],
    );

    if (deleteIds.length) await deleteGenericFiles(admin, deleteIds);

    const DELETE_META_FIELD = `
      mutation DeleteMetafield($id: ID!) {
        metafieldDelete(input: { id: $id }) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `;
    const deletePromises = idsArray.map((id: any) => {
      return admin.graphql(DELETE_META_FIELD, {
        variables: {
          id: id,
        },
      });
    });
    const results = await Promise.all(deletePromises);
    results.forEach(async (response) => {
      const data = await response.json();
      if (!data) {
        return { error: "Unable to remove metafield" };
      }
    });
    const data = await admin.graphql(query);

    if (!data) {
      console.error("Failed to fetch  metafield");
      return { error: "Failed to fetch  metafield." };
    }
    const response = await data.json();
    const pageInfo = response.data.shop.metafields.pageInfo;
    const videoMetafields = response.data.shop.metafields.edges.map(
      (edge: any) => edge.node,
    );
    if (!videoMetafields.length) {
      console.warn("No Video metafields found.");
      return {
        videoMetafields: [],
        pageInfo,
        query: query,
      };
    }
    return {
      videoMetafields,
      pageInfo,
      query: query,
    };
  }
  if (request.method === "PUT" || request.method === "put") {
    const formData = await request.formData();
    const metaFieldId = formData.get("metafieldId") as string;
    const carouselTitle = formData.get("carousel-title") as string;
    const shopId = await getShopId(admin);
    const metafield = await getMetafield(admin, metaFieldId);
    const currentJsonValue = metafield.jsonValue;
    const updatedData = {
      ...currentJsonValue,
      title: carouselTitle,
    };
    const updateMetafiled = await updateMetafield(
      admin,
      shopId,
      metafield.namespace,
      metafield.key,
      updatedData,
    );

    if (!updateMetafiled) {
      return {
        error: true,
        message: "Failed to update metafield",
      };
    }
    return {
      success: true,
      message: "Metafield updated successfully",
    };
  }
  return {
    error: true,
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const valueToFetch = 10;

  const GET_CAROUSEL_TITLE = `
      query GetPDFQuery {
        shop {
          metafields(first: ${valueToFetch}, namespace: "carousel-title" reverse:true) {
              pageInfo {
              hasPreviousPage
              hasNextPage
              startCursor
              endCursor
          }
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
    `;
  const data = await admin.graphql(GET_CAROUSEL_TITLE);
  if (!data) {
    console.error("Failed to fetch PDF metafield");
    return { error: "Failed to fetch PDF metafield." };
  }
  const response = await data.json();
  const pageInfo = response.data.shop.metafields.pageInfo;
  const videoMetafields = response.data.shop.metafields.edges.map(
    (edge: any) => edge.node,
  );

  return {
    pageInfo,
    videoMetafields,
    query: GET_CAROUSEL_TITLE,
  };
};
const VideoSettingPage = () => {
  const fetcher = useFetcher();
  const { videoMetafields, query } = useLoaderData<LoaderResponse>();
  const navigate = useNavigate();
  const onCreateNewView = () => {
    shopify.modal.show("add-carousel");
  };
  const [title, setTitle] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [addLoading, setAddLoading] = useState<boolean>(false);
  const handleChange = useCallback((newValue: string) => {
    setTitle(newValue);
  }, []);

  const handleEditChange = useCallback((newValue: string) => {
    setEditTitle(newValue);
  }, []);
  const handleSubmit = async () => {
    setAddLoading(true);

    const formData = new FormData();
    formData.append("carousel-title", title);
    fetcher.submit(formData, { method: "POST" });
    setTitle("");
    shopify.modal.hide("add-carousel");
  };

  const handleEditSubmit = async () => {
    setAddLoading(true);
    const formData = new FormData();

    formData.append("carousel-title", editTitle);
    formData.append("metafieldId", selectedResources[0]);
    fetcher.submit(formData, { method: "PUT" });
    setEditTitle("");
    shopify.modal.hide("edit-carousel");
  };
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(key);
      shopify.toast.show("Copied to clipboard");
      setTimeout(() => {
        setCopiedKey(null);
      }, 2000);
    });
  };

  const editModal = () => {
    shopify.modal.show("edit-carousel");
  };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(videoMetafields);
  const rowMarkup = videoMetafields.map(
    ({ id, key, jsonValue: { title, date, videoUrls } }: any, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <span
            onClick={() =>
              navigate(
                `/app/details/${id.split("/")[id.split("/").length - 1]}`,
              )
            }
            className="hover:underline"
          >
            {`${title} (${videoUrls && videoUrls[0]?.url !== "" ? videoUrls.length : 0} video)` ||
              "Title"}
          </span>
        </IndexTable.Cell>
        <IndexTable.Cell>{date}</IndexTable.Cell>
        <IndexTable.Cell>
          {" "}
          <p
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleCopyKey(key)}
          >
            <span className="p-1 relative px-2 shadow-md text-xs text-black rounded-md cursor-pointer hover:bg-black hover:text-white capitalize transition-colors">
              {copiedKey === key ? "copied" : "copy key "}
            </span>
          </p>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  const resourceName = {
    singular: "order",
    plural: "orders",
  };

  const promotedBulkActions = [
    {
      content: "Edit",
      onAction: editModal,
      disabled: selectedResources.length > 1,
    },
    {
      destructive: true,
      content: "Delete",
      onAction: () => shopify.modal.show("delete-modal"),
    },
  ];

  const handleVideoDelete = () => {
    setDeleteLoading(true);
    const formData = new FormData();
    formData.append("metafieldIds", JSON.stringify(selectedResources));
    formData.append("query", query);
    fetcher.submit(formData, { method: "delete" });
    selectedResources.splice(0, selectedResources.length);
    shopify.modal.hide("delete-modal");
  };

  useEffect(() => {
    setDeleteLoading(false);
    setAddLoading(false);
  }, [fetcher.state === "loading"]);
  return (
    <Page
      backAction={{ content: "Settings", url: "/app" }}
      primaryAction={{
        content: "Add ",
        loading: addLoading,
        onAction: onCreateNewView,
      }}
      title="Carousel"
    >
      {!videoMetafields || !videoMetafields.length ? (
        <LegacyCard sectioned>
          <EmptyState
            heading="Manage your Carousel"
            action={{
              content: "Add new carousel",
              loading: addLoading,
              onAction: onCreateNewView,
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Manage and organize your Carousel with ease, ensuring quick access
              and efficient storage.
            </p>
          </EmptyState>
        </LegacyCard>
      ) : (
        <LegacyCard>
          {deleteLoading ? (
            <div className=" absolute z-[999] right-2 top-2">
              <Spinner size="small" />
            </div>
          ) : null}
          <IndexTable
            // condensed={useBreakpoints()?.smDown}
            resourceName={resourceName}
            itemCount={videoMetafields.length || 0}
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            promotedBulkActions={promotedBulkActions}
            headings={[{ title: "Title" }, { title: "Date" }, { title: "Key" }]}
          >
            {rowMarkup}
          </IndexTable>
        </LegacyCard>
      )}

      <Modal id="delete-modal">
        <p className="py-2 text-red-500">
          Are you sure you want to remove this carousel.?
        </p>
        <TitleBar title="Delete carousel">
          <button onClick={() => shopify.modal.hide("delete-modal")}>
            Cancel
          </button>
          <button variant="primary" tone="critical" onClick={handleVideoDelete}>
            Delete
          </button>
        </TitleBar>
      </Modal>

      <Modal id="add-carousel">
        <p className="py-3 px-4">
          <TextField
            label=""
            labelHidden
            value={title}
            onChange={handleChange}
            autoComplete="off"
            autoSize
            placeholder="Carousel Title"
          />
        </p>

        <TitleBar title={"Add carousel"}>
          <button onClick={() => shopify.modal.hide("add-carousel")}>
            Cancel
          </button>
          <button variant="primary" onClick={handleSubmit}>
            Add
          </button>
        </TitleBar>
      </Modal>

      <Modal id="edit-carousel">
        <p className="py-3 px-4">
          <TextField
            label=""
            labelHidden
            value={editTitle}
            onChange={handleEditChange}
            autoComplete="off"
            autoSize
            placeholder="Edit Title"
          />
        </p>

        <TitleBar title="Edit carousel">
          <button onClick={() => shopify.modal.hide("edit-carousel")}>
            Cancel
          </button>
          <button
            disabled={editTitle === ""}
            variant="primary"
            onClick={handleEditSubmit}
          >
            Edit
          </button>
        </TitleBar>
      </Modal>
    </Page>
  );
};

export default VideoSettingPage;
