import { useCallback, useEffect, useState } from "react";
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

  // Initial state
  const initialState = {
    borderWidth: jsonValue?.borderWidth || 0,
    borderColor: jsonValue?.borderColor || "#ffffff",
    turnOnBorder: jsonValue?.turnOnBorder || false,
    muteSound: jsonValue?.muteSound || false,
    addToCart: jsonValue?.addTocart || false,
    loopVideo: jsonValue?.loopVideo || false,
    autoPlay: jsonValue?.autoPlay || false,
    centerVideo: jsonValue?.centerVideo || false,
  };

  const [settings, setSettings] = useState(initialState);

  useEffect(() => {
    const hasChanges =
      JSON.stringify(settings) !== JSON.stringify(initialState);
    if (hasChanges) {
      shopify.saveBar.show("setting-save-bar");
    } else {
      shopify.saveBar.hide("setting-save-bar");
    }
  }, [settings]);

  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("source", "ButtonDesign");
    Object.entries(settings).forEach(([key, value]) =>
      formData.append(key, value.toString()),
    );
    fetcher.submit(formData, { method: "post" });
    shopify.saveBar.hide("setting-save-bar");
  };

  const handleDiscard = () => {
    setSettings(initialState);
    shopify.saveBar.hide("setting-save-bar");
  };

  // Toast on successful save
  useEffect(() => {
    if (fetcher.state === "loading") {
      shopify.toast.show("Button setting saved successfully");
    }
  }, [fetcher.state]);

  return (
    <div className="pt-6">
      {/* <h2 className="text-lg font-bold mb-2">Button Settings</h2>

      <h2 className="font-bold py-2">Customize the Add to Cart Button</h2>
      <div className="mb-4">
        <Card roundedAbove="lg">
          <p className="font-light">
            <span className="font-semibold">
              This is the button that your customers will click to add the
              product to the cart page.
            </span>{" "}
            Customize here the text and design of your button to fit it with
            your brand style. The button will use the same font of your store
            when it will be generated on your store.
          </p>
        </Card>
      </div> */}

      <Card>
        <div className="flex max-w-lg flex-col gap-5">
          <Checkbox
            label="Turn on Border"
            checked={settings.turnOnBorder}
            onChange={(value) => handleSettingChange("turnOnBorder", value)}
          />
          <InputColorPicker
            title="Border Color"
            setState={(value) => handleSettingChange("borderColor", value)}
            value={settings.borderColor}
          />
          <RangeSlider
            label="Border width"
            min={0}
            max={15}
            value={settings.borderWidth}
            onChange={(value) => handleSettingChange("borderWidth", value)}
            output
          />
          <Checkbox
            label="Mute Sound"
            checked={settings.muteSound}
            onChange={(value) => handleSettingChange("muteSound", value)}
          />
          <Checkbox
            label="Auto Play"
            checked={settings.autoPlay}
            onChange={(value) => handleSettingChange("autoPlay", value)}
          />
          <Checkbox
            label="Loop Video"
            checked={settings.loopVideo}
            onChange={(value) => handleSettingChange("loopVideo", value)}
          />
          <Checkbox
            label="Add to Cart"
            checked={settings.addToCart}
            onChange={(value) => handleSettingChange("addToCart", value)}
          />
          <Checkbox
            label="Center Video"
            checked={settings.centerVideo}
            onChange={(value) => handleSettingChange("centerVideo", value)}
          />

          <SaveBar id="setting-save-bar">
            <button variant="primary" onClick={handleSubmit}>
              Save
            </button>
            <button onClick={handleDiscard}>Discard</button>
          </SaveBar>
        </div>
      </Card>
    </div>
  );
};

export default ButtonDesign;
