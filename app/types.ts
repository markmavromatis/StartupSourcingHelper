export type Tag =
  | "AI"
  | "BCI"
  | "Enterprise"
  | "Media"
  | "Mobility"
  | "Sustainability"
  | "Fintech"
  | "Healthtech"
  | "Climate"
  | "Web3"
  | "Robotics"
  | "Space";

export interface Startup {
  id: string;
  addedDate: string;
  companyName: string;
  shortDescription: string;
  longDescription: string;
  hq: string;
  foundingYear: number | null;
  employees: string;
  investments: string;
  videoUrl: string;
  imageUrls: [string, string, string];
  tags: Tag[];
  websiteUrl: string;
}
