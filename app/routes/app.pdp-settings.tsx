import { useFetcher } from "@remix-run/react";
import { Button, EmptyState, LegacyCard, Page } from "@shopify/polaris";
import { useRef, useState } from "react";

const PDPSettings = () => {
  const [items, setItems] = useState<any>([]);

  const addProduct = async () => {
    const selected: any = await shopify.resourcePicker({
      type: "product",
      multiple: 1,
      filter: { variants: false, archived: false, draft: false },
    });

    if (selected && selected.length > 0) {
      const product = {
        title: selected[0].title,
        handle: selected[0].handle,
        id: selected[0].id,
        image: selected[0].images.length
          ? selected[0].images[0].originalSrc
          : "",
      };
      setItems((prev: any) => [...prev, product]);
    }
    shopify.saveBar.show("my-save-bar");
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      //   setIsLoading(true);
      const formData = new FormData();
      formData.append("video", file);
      fetcher.submit(formData, {
        method: "post",
        encType: "multipart/form-data",
      });
      fileInputRef.current.value = "";
    }
  };
  console.log(items);
  return (
    <Page
      title="Product Page"
      primaryAction={{ content: "Add Product", onAction: () => addProduct() }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
        name="video"
      />

      {items && items.length ? (
        <div className="flex items-center justify-center gap-2">
          {items.map((item: any) => (
            <div
              key={item.id}
              className="bg-white shadow-md rounded-lg overflow-hidden border"
            >
              <div className="h-20 w-20">
                <img
                  src={
                    item.image ||
                    "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  }
                  height={200}
                  width={200}
                  alt={item.title}
                  className="h-full w-full "
                />
              </div>

              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  {item.title}
                </h2>
                <div className="flex items-center justify-between px-10">
                  <p className="text-gray-600 text-sm mt-2">{item.handle}</p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Add video
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <LegacyCard sectioned>
          <EmptyState
            heading="Add your Product"
            action={{
              content: "Add Product",
              loading: false,
              onAction: () => {
                addProduct();
              },
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Manage and organize your Products with ease, ensuring quick access
              and efficient storage.
            </p>
          </EmptyState>
        </LegacyCard>
      )}
    </Page>
  );
};

export default PDPSettings;
