export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  getProducts,
  getReviews,
  getLearningCards,
} from "../../lib/data-service";
import AdminDashboardClient from "../../components/AdminDashboardClient";

export default async function AdminDashboardPage() {
  try {
    const [products, reviews, learningCards] = await Promise.all([
      getProducts(),
      getReviews(),
      getLearningCards(),
    ]);

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
