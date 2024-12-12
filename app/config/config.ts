import ButtonDesign from "app/components/ButtonDesign";

export interface buttonsNameTypes {
  index: number;
  link: string;
  name: string;
  component: any;
}

export const buttonsName: buttonsNameTypes[] = [
  {
    index: 2,
    link: "buttonDesign",
    name: "Button Design",
    component: ButtonDesign,
  },
];
