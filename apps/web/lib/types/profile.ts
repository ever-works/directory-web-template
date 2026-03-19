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
  skills: { name: string; level: number; }[];
  interests: string[];
  portfolio: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    externalUrl: string;
    tags: string[];
    isFeatured: boolean;
  }>;
  themeColor: string;
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