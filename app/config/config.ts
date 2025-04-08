import ButtonDesign from "app/components/ButtonDesign";
// import CarouselSetting from "app/components/CarouselSetting";

export interface buttonsNameTypes {
  index: number;
  link: string;
  name: string;
  component: any;
}

export const buttonsName: buttonsNameTypes[] = [
  {
    index: 1,
    link: "buttonDesign",
    name: "Button Design",
    component: ButtonDesign,
  },
  // {
  //   index: 2,
  //   link: "carouselDesign",
  //   name: "Carousel Settting",
  //   component: CarouselSetting,
  // },
];
