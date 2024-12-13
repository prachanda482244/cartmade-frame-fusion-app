import ButtonDesign from "app/components/ButtonDesign";
import CarouselDesign from "app/components/CarouselDesign";

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
  {
    index: 2,
    link: "carouselDesign",
    name: "Carousel Design",
    component: CarouselDesign,
  },
];
