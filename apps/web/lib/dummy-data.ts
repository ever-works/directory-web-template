export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
}

export const dummySubmissions = [
  {
    id: "1",
    title: "Modern E-commerce Platform",
    category: "Web Development",
    status: "approved" as const,
    submittedAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-16T14:20:00Z",
    views: 1250,
    likes: 89,
    tags: ["Next.js", "Stripe", "E-commerce"],
    description: "A full-stack e-commerce solution built with Next.js and Stripe"
  },
  {
    id: "2",
    title: "Task Management App",
    category: "Mobile Development",
    status: "pending" as const,
    submittedAt: "2024-01-20T09:15:00Z",
    updatedAt: "2024-01-20T09:15:00Z",
    views: 567,
    likes: 23,
    tags: ["React", "Firebase", "Real-time"],
    description: "Collaborative task management with real-time updates"
  },
  {
    id: "3",
    title: "Weather Dashboard",
    category: "Web Development",
    status: "rejected" as const,
    submittedAt: "2024-01-18T16:45:00Z",
    updatedAt: "2024-01-19T11:30:00Z",
    views: 890,
    likes: 45,
    tags: ["Vue.js", "Weather API", "Dashboard"],
    description: "Beautiful weather dashboard with location-based forecasts"
  },
  {
    id: "4",
    title: "AI Chat Assistant",
    category: "AI/ML",
    status: "approved" as const,
    submittedAt: "2024-01-22T13:20:00Z",
    updatedAt: "2024-01-23T08:15:00Z",
    views: 2100,
    likes: 156,
    tags: ["AI", "Machine Learning", "Chat"],
    description: "Intelligent chat assistant powered by machine learning"
  },
  {
    id: "5",
    title: "Fitness Tracking App",
    category: "Mobile Development",
    status: "pending" as const,
    submittedAt: "2024-01-25T10:00:00Z",
    updatedAt: "2024-01-25T10:00:00Z",
    views: 432,
    likes: 18,
    tags: ["React Native", "Health", "Social"],
    description: "Comprehensive fitness tracking with social features"
  },
  {
    id: "6",
    title: "Blog Platform",
    category: "Web Development",
    status: "pending" as const,
    submittedAt: "2024-01-26T10:00:00Z",
    updatedAt: "2024-01-26T10:00:00Z",
    views: 0,
    likes: 0,
    tags: ["Next.js", "Content Management", "Blog"],
    description: "A modern blog platform with markdown support and SEO optimization"
  }
];

export const dummyPortfolio = [
  {
    id: "1",
    title: "E-commerce Platform",
    description: "A modern e-commerce platform built with Next.js and Stripe",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
    externalUrl: "https://example.com/project1",
    tags: ["Next.js", "Stripe", "E-commerce"],
    isFeatured: true
  },
  {
    id: "2",
    title: "Task Management App",
    description: "A collaborative task management application with real-time updates",
    imageUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
    externalUrl: "https://example.com/project2",
    tags: ["React", "Firebase", "Real-time"],
    isFeatured: true
  },
  {
    id: "3",
    title: "Weather Dashboard",
    description: "A beautiful weather dashboard with location-based forecasts",
    imageUrl: "https://images.unsplash.com/photo-1592210454359-9043f067919b?w=400&h=300&fit=crop",
    externalUrl: "https://example.com/project3",
    tags: ["Vue.js", "Weather API", "Dashboard"],
    isFeatured: false
  }
]; 