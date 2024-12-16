import { useCallback, useState } from "react";
import {
  TextField,
  Card,
  BlockStack,
  Layout,
  RangeSlider,
  Page,
  Button,
  Checkbox,
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import InputColorPicker from "./InputColorPicker";
import { SaveBar } from "@shopify/app-bridge-react";

const ButtonDesign = ({ buttonSettings: { jsonValue } }: any) => {
  const fetcher = useFetcher();
  console.log(jsonValue, "JSONVLAYU");

  const [borderWidth, setBorderWidth] = useState<number>(
    jsonValue?.borderWidth || 0,
  );

  const [borderColor, setBorderColor] = useState(
    jsonValue?.borderColor || "#ffffff",
  );
  const [turnOnBorder, setTurOnBorder] = useState(
    jsonValue.turnOnBorder || false,
  );
  const [muteSound, setMuteSound] = useState(jsonValue.muteSound || false);
  const [addToCart, setAddToCart] = useState(jsonValue.addTocart || false);
  const [loopVideo, setLoopVideo] = useState(jsonValue.loopVideo || false);
  const [autoPlay, setAutoPlay] = useState(jsonValue.autoPlay || false);

  const handleBorderWidthChange = (value: number) => {
    setBorderWidth(value), shopify.saveBar.show("setting-save-bar");
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("source", "ButtonDesign");
    formData.append("borderWidth", borderWidth.toString());
    formData.append("turnOnBorder", turnOnBorder.toString());
    formData.append("muteSound", muteSound.toString());
    formData.append("borderColor", borderColor);
    formData.append("loopVideo", loopVideo);
    formData.append("autoPlay", autoPlay);
    formData.append("addToCart", addToCart.toString());
    fetcher.submit(formData, { method: "post" });
    shopify.saveBar.hide("setting-save-bar");
  };

  if (fetcher.state === "loading") {
    shopify.toast.show("Button setting saved successfully");
  }

  const handleChange = useCallback((newChecked: boolean) => {
    setTurOnBorder(newChecked);
    shopify.saveBar.show("setting-save-bar");
  }, []);
  const handleMuteChange = useCallback((newChecked: boolean) => {
    setMuteSound(newChecked);
    shopify.saveBar.show("setting-save-bar");
  }, []);

  const handleLoopVideoChange = useCallback((newChecked: boolean) => {
    setLoopVideo(newChecked);
    shopify.saveBar.show("setting-save-bar");
  }, []);

  const handleAutoPlayChange = useCallback((newChecked: boolean) => {
    setAutoPlay(newChecked);
    shopify.saveBar.show("setting-save-bar");
  }, []);

  const handleAddToCartChange = useCallback(
    (newChecked: boolean) => {
      setAddToCart(newChecked), shopify.saveBar.show("setting-save-bar");
    },

    [],
  );
  const handleDiscard = () => {
    // setItems(videoUrls);
    shopify.saveBar.hide("setting-save-bar");
  };
  return (
    <div className="">
      {/* Button Preview */}
      <div className=" pt-6">
        <h2 className="text-lg font-bold mb-2">Button Settings</h2>

        <h2 className="font-bold py-2 ">Customize the Add to cart button</h2>
        <div className="mb-4">
          <Card roundedAbove="lg">
            <p className="font-light">
              <span className="font-semibold">
                {" "}
                This is the button that your customers will click to add the
                product on the cart page.
              </span>{" "}
              Customize here the text and design of your button to fit it with
              your brand style. The button will use the same font of your store
              when it will be generated on your store.
            </p>
          </Card>
        </div>
        <Card>
          <div className=" flex max-w-lg flex-col gap-5">
            <Checkbox
              label="Turn on Border"
              checked={turnOnBorder}
              onChange={handleChange}
            />
            <InputColorPicker
              title="Border Color"
              setState={setBorderColor}
              value={borderColor}
            />

            <RangeSlider
              label="Border width"
              min={0}
              max={15}
              value={borderWidth}
              onChange={handleBorderWidthChange}
              output
            />

            <Checkbox
              label="Mute Sound"
              checked={muteSound}
              onChange={handleMuteChange}
            />
            <Checkbox
              label="Auto Play"
              checked={autoPlay}
              onChange={handleAutoPlayChange}
            />
            <Checkbox
              label="Loop video"
              checked={loopVideo}
              onChange={handleLoopVideoChange}
            />
            <Checkbox
              label="Add to Cart"
              checked={addToCart}
              onChange={handleAddToCartChange}
            />

            <SaveBar id="setting-save-bar">
              <button variant="primary" onClick={handleSubmit}></button>
              <button onClick={handleDiscard}></button>
            </SaveBar>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ButtonDesign;
