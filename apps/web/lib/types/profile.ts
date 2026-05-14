export interface ProfileSkill {
  name: string;
  category: string;
  proficiency: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  externalUrl: string;
  tags: string[];
  isFeatured: boolean;
}

export interface Profile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  location: string;
  company: string;
  jobTitle: string;
  website: string;
  socialLinks: Array<{
    platform: string;
    url: string;
    displayName: string;
  }>;
  skills: ProfileSkill[];
  interests: string[];
  portfolio: PortfolioItem[];
  themeColor: string;
  coverColor: string;
  isPublic: boolean;
  memberSince: string;
  submissions: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    status: "approved" | "pending" | "rejected";
    submittedAt: string;
    updatedAt: string;
    url: string;
    imageUrl?: string;
  }>;
}
