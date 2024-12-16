import { useFetcher } from "@remix-run/react";
import { SaveBar } from "@shopify/app-bridge-react";
import {
  Button,
  Icon,
  MediaCard,
  Spinner,
  VideoThumbnail,
} from "@shopify/polaris";
import { Reorder } from "motion/react";
import { useEffect, useState } from "react";
import { DeleteIcon, XIcon } from "@shopify/polaris-icons";
const VideoCarousel = ({
  videoUrls,
  settingData,
  isLoading,
}: {
  videoUrls: { url: string; products: any[] }[];
  settingData: any;
  isLoading: boolean;
}) => {
  const [items, setItems] = useState(videoUrls);
  useEffect(() => {
    setItems(videoUrls);
  }, [videoUrls]);
  const fetcher = useFetcher();

  const addProduct = async (url: string) => {
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

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.url === url
            ? { ...item, products: [...(item.products || []), product] }
            : item,
        ),
      );
    }
    shopify.saveBar.show("my-save-bar");
  };

  const removeProduct = (url: string, productId: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.url === url
          ? {
              ...item,
              products: item.products.filter(
                (product) => product.id !== productId,
              ),
            }
          : item,
      ),
    );
    shopify.saveBar.show("my-save-bar");
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("videoProducts", JSON.stringify(items));
    formData.append("flag", "videoProduct");
    fetcher.submit(formData, { method: "PUT" });
    shopify.saveBar.hide("my-save-bar");
  };

  const handleDiscard = () => {
    setItems(videoUrls);
    shopify.saveBar.hide("my-save-bar");
  };

  return (
    <Reorder.Group axis="x" values={items} onReorder={setItems}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 ">
        {isLoading ? (
          <div className="absolute right-0 top-0">
            <Spinner size="small" />
          </div>
        ) : null}
        {items.map(({ url, products }) => (
          <Reorder.Item key={url} value={url}>
            <div className="overflow-hidden rounded-lg p-4 border border-gray-300 bg-white relative">
              <video
                controls
                loop={settingData.loopVideo}
                muted={settingData.muteSound}
                autoPlay
                className="w-full h-full object-cover rounded-t-lg"
              >
                <source src={url} type="video/mp4" />
              </video>

              <div className="mt-4">
                {products.length > 0 ? (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className="flex cursor-pointer items-center gap-2 justify-between mb-2"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <img
                          src={product.image}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <p className=" w-full py-2 px-4 rounded-sm ">
                          {product.title}
                        </p>
                      </div>
                      <button
                        onClick={() => removeProduct(url, product.id)}
                        className="text-red-500 text-lg font-bold"
                      >
                        <Icon source={XIcon} />
                      </button>
                    </div>
                  ))
                ) : (
                  <Button variant="primary" onClick={() => addProduct(url)}>
                    Add product
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-center  border-t border-none py-2">
                <Button
                  onClick={() => {
                    setItems((prevItems) =>
                      prevItems.filter((item) => item.url !== url),
                    );
                    shopify.saveBar.show("my-save-bar");
                  }}
                  tone="critical"
                  icon={DeleteIcon}
                />
              </div>
            </div>
            {/* 
            <MediaCard
              portrait
              title={products.map((product) => product.title) || ""}
              primaryAction={{
                content: "",
                icon: DeleteIcon,

                onAction: () => {},
              }}
              description=""
              onDismiss={handleDiscard}
            >
              <video
                controls
                loop
                muted
                autoPlay
                className="w-full h-full object-cover rounded-t-lg"
              >
                <source src={url} type="video/mp4" />
              </video>
            </MediaCard> */}
          </Reorder.Item>
        ))}
      </div>
      <SaveBar id="my-save-bar">
        <button variant="primary" onClick={handleSubmit}></button>
        <button onClick={handleDiscard}></button>
      </SaveBar>
    </Reorder.Group>
  );
};

export default VideoCarousel;
