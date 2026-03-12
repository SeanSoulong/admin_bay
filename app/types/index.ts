// src/types.ts

export interface Product {
  id: string;
  itemId?: string;
  name: string;
  category: string;
  price: string | number;
  description: string;
  rating: number;
  review_count: number;
  images: string[];
  unit: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  visibility?: "public" | "hidden";
  moderation?: {
    status?: "clean" | "warned";
    warnedAt?: number;
    expiresAt?: number;
    warnedBy?: string;
    warningMessage?: string;
    resolvedAt?: number;
  };
}

export interface Review {
  id: string;
  reviewId?: string;
  itemId: string;
  userId: string;
  comment: string;
  rating: number;
  createdAt: number;
  updatedAt: number;
  stability?: number;
}

export interface User {
  userId: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  role?: string;
  profileImageUrl?: string;
  createdAt?: number;
  updatedAt?: number;
  lastLogin?: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  userVerified?: boolean;
  online?: boolean; // From user object
  point?: number;
  deviceToken?: string;

  // Moderation fields
  moderation?: {
    status?: "clean" | "warned" | "suspended" | "banned";
    warnedAt?: number;
    expiresAt?: number;
    warnedBy?: string;
    warningMessage?: string;
    suspendedAt?: number;
    suspendedUntil?: number;
    suspendedBy?: string;
    suspensionReason?: string;
    bannedAt?: number;
    bannedBy?: string;
    banReason?: string;
    resolvedAt?: number;
  };
}

// Add this interface for online status
export interface OnlineStatus {
  [userId: string]: boolean;
}

export type ProductCategory = "ផ្លែឈើ" | "បន្លែ" | "ផ្សេងៗ" | "សម្ភារៈ";

export interface LearningCard {
  uuid: string;
  title: string;
  description: string;
  content: string;
  category: string;
  author: string;
  date: string;
  imageUrl: string;
  isSaved: boolean;
  readTime?: string;
  createdAt: string;
}

export interface DashboardPageProps {
  initialProducts: Product[];
  initialReviews: Review[];
  initialLearningCards: LearningCard[];
  initialUsers: User[];
  initialStats: {
    totalProducts: number;
    totalReviews: number;
    totalLearningCards: number;
    totalUsers: number;
    avgRating: number;
  };
}
