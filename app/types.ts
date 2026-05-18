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

export interface Project {
  id: string;
  name: string;
  createdDate: string;
}

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
  logoUrl: string;
  imageUrls: [string, string, string];
  tags: Tag[];
  websiteUrl: string;
  projectId: string;
}
