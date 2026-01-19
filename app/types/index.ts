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

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
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

export interface LearningCategory {
  [key: string]: string;
}

// Props for server components
export interface DashboardPageProps {
  initialProducts: Product[];
  initialReviews: Review[];
  initialLearningCards: LearningCard[];
  initialStats: {
    totalProducts: number;
    totalReviews: number;
    totalLearningCards: number;
    avgRating: number;
  };
}
