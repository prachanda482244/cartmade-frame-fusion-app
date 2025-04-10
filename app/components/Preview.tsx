import { useFetcher } from "@remix-run/react";
import { Button, Spinner } from "@shopify/polaris";
import {
  DeleteIcon,
  DragHandleIcon,
  PlayIcon,
  XIcon,
} from "@shopify/polaris-icons";
import { Reorder, motion } from "motion/react";
import { useEffect, useState } from "react";

const Preview = ({
  setShowModal,
  productId,
  videoUrls,
  settingData,
  isLoading,
}: {
  setShowModal: any;
  productId: string;
  videoUrls: { videoUrl: string }[];
  settingData: any;
  isLoading: boolean;
}) => {
  const [items, setItems] = useState(videoUrls),
    [activeVideoUrl, setActiveVideoUrl] = useState<string>(""),
    [isOpen, setIsOpen] = useState<boolean>(true),
    [loading, setLoading] = useState<boolean>(false),
    fetcher = useFetcher();
  useEffect(() => {
    setLoading(false);
    setItems(videoUrls);
  }, [videoUrls]);
  const handleSubmit = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("videoProducts", JSON.stringify(items));
    formData.append("flag", "videoProduct");
    fetcher.submit(formData, { method: "PATCH" });
  };
  const handleDiscard = () => {
    setItems(videoUrls);
    setShowActionButtons(false);
  };
  const handleDeleteVideo = (url: string) => {
    setShowActionButtons(true);
    setItems((prevItems) => prevItems.filter((item) => item.videoUrl !== url));
    shopify.saveBar.show("my-save-bar");
  };

  if (fetcher.state === "loading") {
    shopify.toast.show("Setting saved successfully");
  }
  const handleModalOpen = (url: string) => {
    setActiveVideoUrl(url);
  };
  const [showActionsButtons, setShowActionButtons] = useState<boolean>(false);
  const handleReorder = (newItems: any) => {
    const hasChanged = videoUrls.some((item, index) => {
      return (
        !newItems[index] ||
        JSON.stringify(item) !== JSON.stringify(newItems[index])
      );
    });
    hasChanged ? setShowActionButtons(true) : setShowActionButtons(false);

    setItems(newItems);
  };
  return isOpen ? (
    <div
      onClick={(e) => {
        setIsOpen(false);
        setShowModal(false);
      }}
      className="fixed inset-0 bg-[#2223277a]  flex justify-center items-center"
    >
      <div className="w-[70%] flex justify-center items-center min-h-screen ">
        {activeVideoUrl && (
          <div className="relative w-full h-[95vh] overflow-hidden ">
            <video
              onClick={(e) => e.stopPropagation()}
              src={activeVideoUrl}
              controls
              autoPlay
              muted
              autoFocus
              className="w-full h-full object-contain"
            ></video>
          </div>
        )}
      </div>

      <div className="w-[30%] h-full">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-l-lg h-full shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative p-4">
            <motion.div
              className="absolute top-4 right-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2">
                {showActionsButtons && (
                  <>
                    <Button
                      onClick={handleDiscard}
                      tone="critical"
                      variant="primary"
                    >
                      Discard
                    </Button>
                    <Button
                      loading={loading && fetcher.state === "submitting"}
                      onClick={handleSubmit}
                      variant="primary"
                    >
                      Save
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    setShowModal(false);
                  }}
                  icon={XIcon}
                />
              </div>
            </motion.div>

            {isLoading && (
              <div className="absolute right-4 top-4">
                <Spinner size="small" />
              </div>
            )}

            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Video List
              </h2>
            </div>

            <Reorder.Group axis="y" values={items} onReorder={handleReorder}>
              <div className="space-y-2">
                {items?.map((item: any) => (
                  <Reorder.Item value={item} key={item?.videoUrl}>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="w-[10%] flex items-center justify-center">
                        <Button
                          icon={DragHandleIcon}
                          size="slim"
                          aria-label="Drag to reorder"
                        />
                      </div>

                      <div className="w-[70%]">
                        <video
                          onClick={() => handleModalOpen(item.videoUrl)}
                          loop={settingData.loopVideo}
                          muted={settingData.muteSound}
                          autoPlay
                          className="w-full h-20 object-cover rounded-lg shadow-sm"
                        >
                          <source src={item.videoUrl} type="video/mp4" />
                        </video>
                      </div>

                      <div className="w-[20%] flex justify-center items-center">
                        <Button
                          onClick={() => handleDeleteVideo(item.videoUrl)}
                          tone="critical"
                          icon={DeleteIcon}
                          size="slim"
                        />
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </div>
            </Reorder.Group>
          </div>
        </motion.div>
      </div>
    </div>
  ) : null;
};

export default Preview;
