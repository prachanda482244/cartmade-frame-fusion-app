export interface pageInformation {
  endCursor: string;
  startCursor: string;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface JsonValue {
  title: string;
}

export interface carouselTypes {
  id: string;
  namespace: string;
  key: string;
  jsonValue: JsonValue;
  type: string;
}

export interface LoaderResponse {
  pageInfo: pageInformation;
  videoMetafields: carouselTypes[];
  query: string;
}
