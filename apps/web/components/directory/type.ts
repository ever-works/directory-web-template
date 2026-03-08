export interface ProductLink {
  id: string;
  url: string;
  label: string;
  type: "main" | "secondary";
  icon?: string;
}

export interface FormData {
  name: string;
  link: string;
  links: ProductLink[];
  category: string | null;
  tags: string[];
  description: string;
  introduction: string;
  [key: string]: any;
}
