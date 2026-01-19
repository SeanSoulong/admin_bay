import { Metadata } from "next";
import {
  getProducts,
  getReviews,
  getLearningCards,
} from "../../lib/data-service";
import AdminDashboardClient from "../../components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin Dashboard - Marketplace",
  description:
    "Admin dashboard for managing products, reviews, and learning content",
};

export default async function AdminDashboardPage() {
  try {
    // Fetch all data on the server in parallel
    const [products, reviews, learningCards] = await Promise.all([
      getProducts(),
      getReviews(),
      getLearningCards(),
    ]);

    // Calculate stats on the server
    const totalRating = products.reduce(
      (sum, product) => sum + (product.rating || 0),
      0
    );
    const avgRating = products.length > 0 ? totalRating / products.length : 0;

    const stats = {
      totalProducts: products.length,
      totalReviews: reviews.length,
      totalLearningCards: learningCards.length,
      avgRating: parseFloat(avgRating.toFixed(1)),
    };

    return (
      // eslint-disable-next-line react-hooks/error-boundaries
      <AdminDashboardClient
        initialProducts={products}
        initialReviews={reviews}
        initialLearningCards={learningCards}
        initialStats={stats}
      />
    );
  } catch (error) {
    console.error("Error in dashboard page:", error);

    // Fallback to empty data
    return (
      <AdminDashboardClient
        initialProducts={[]}
        initialReviews={[]}
        initialLearningCards={[]}
        initialStats={{
          totalProducts: 0,
          totalReviews: 0,
          totalLearningCards: 0,
          avgRating: 0,
        }}
      />
    );
  }
}
