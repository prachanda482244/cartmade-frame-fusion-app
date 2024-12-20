import { useFetcher } from "@remix-run/react";
import { Modal, SaveBar } from "@shopify/app-bridge-react";
import { Button, Icon, Spinner } from "@shopify/polaris";
import { Reorder } from "motion/react";
import { useEffect, useState } from "react";
import {
  DeleteIcon,
  PlayIcon,
  DragHandleIcon,
  MinusCircleIcon,
} from "@shopify/polaris-icons";

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
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const fetcher = useFetcher();

  useEffect(() => {
    setItems(videoUrls);
  }, [videoUrls]);

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

  const handleModalOpen = (url: string) => {
    setActiveVideoUrl(url);
    shopify.modal.show("video-modal");
  };

  const handleDeleteVideo = (url: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.url !== url));
    shopify.saveBar.show("my-save-bar");
  };

  if (fetcher.state === "loading") {
    shopify.toast.show("Setting saved successfully");
  }
  const handleReorder = (newItems: any) => {
    const hasChanged = videoUrls.some((item, index) => {
      return (
        !newItems[index] ||
        JSON.stringify(item) !== JSON.stringify(newItems[index])
      );
    });
    hasChanged
      ? shopify.saveBar.show("my-save-bar")
      : shopify.saveBar.hide("my-save-bar");

    setItems(newItems);
  };

  return (
    <Reorder.Group axis="y" values={items} onReorder={handleReorder}>
      <div className="relative bg-white rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute right-2 top-2">
            <Spinner size="small" />
          </div>
        )}
        <div className="flex flex-col py-2">
          <div className="flex text-left font-semibold border-b p-2">
            <div className="w-[7%] p-2">Drag</div>
            <div className="w-[18%] p-2">Video</div>
            <div className="w-[40%] p-2">Products</div>
            <div className="w-[25%] p-2">Preview</div>
            <div className="w-[10%] p-2">Actions</div>
          </div>

          {items.map((item) => (
            <Reorder.Item value={item} key={item.url}>
              <div className="flex  hover:bg-gray-50 border-b">
                <div className="w-[7%] flex items-center justify-center">
                  <Button
                    icon={DragHandleIcon}
                    size="slim"
                    aria-label="Drag to reorder"
                  />
                </div>
                <div className="w-[18%] p-2">
                  <video
                    loop={settingData.loopVideo}
                    muted={settingData.muteSound}
                    autoPlay
                    className="w-full h-14 object-cover rounded"
                  >
                    <source src={item.url} type="video/mp4" />
                  </video>
                </div>
                <div className="w-[40%] p-2">
                  {item.products.length > 0 ? (
                    item.products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 mb-2 border rounded-lg shadow-sm p-2"
                      >
                        <img
                          src={product.image}
                          alt="Product"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <p className="text-sm w-full">{product.title}</p>
                        <button
                          onClick={() => removeProduct(item.url, product.id)}
                          className="text-red-500 text-lg font-bold"
                        >
                          <Icon source={MinusCircleIcon} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => addProduct(item.url)}
                    >
                      Add product
                    </Button>
                  )}
                </div>
                <div className="w-[25%] p-2">
                  <Button
                    variant="secondary"
                    icon={PlayIcon}
                    onClick={() => handleModalOpen(item.url)}
                  >
                    Preview Video
                  </Button>
                </div>
                <div className="w-[10%] p-2">
                  <Button
                    onClick={() => handleDeleteVideo(item.url)}
                    tone="critical"
                    icon={DeleteIcon}
                    size="slim"
                  />
                </div>
              </div>
            </Reorder.Item>
          ))}
        </div>
      </div>

      <Modal id="video-modal">
        {activeVideoUrl && (
          <video
            controls
            loop={settingData.loopVideo}
            muted={settingData.muteSound}
            autoPlay
            className="w-full h-[400px] object-cover"
          >
            <source src={activeVideoUrl} type="video/mp4" />
          </video>
        )}
      </Modal>

      <SaveBar id="my-save-bar">
        <button variant="primary" onClick={handleSubmit}></button>
        <button onClick={handleDiscard}></button>
      </SaveBar>
    </Reorder.Group>
  );
};

export default VideoCarousel;
