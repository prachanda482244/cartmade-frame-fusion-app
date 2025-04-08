import { Select } from "@shopify/polaris";

const CarouselSetting = () => {
  return (
    <div>
      <div className="flex items-center gap-5">
        <Select
          label="Pages:"
          labelInline
          options={[
            {
              label: "Home Page",
              value: "homePage",
            },
            {
              label: "Product Page",
              value: "productPage",
            },
            {
              label: "Collection Page",
              value: "collectionPage",
            },
          ]}
        />
      </div>
      <div className=""></div>
    </div>
  );
};

export default CarouselSetting;
