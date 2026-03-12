/* eslint-disable react-hooks/error-boundaries */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  getProducts,
  getReviews,
  getLearningCards,
  getUsers, // Add this import
} from "../../lib/data-service";
import AdminDashboardClient from "../../components/AdminDashboardClient";

export default async function AdminDashboardPage() {
  try {
    // Fetch all data including users
    const [products, reviews, learningCards, users] = await Promise.all([
      getProducts(),
      getReviews(),
      getLearningCards(),
      getUsers(), // Add this
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
      totalUsers: users.length, // Add this
      avgRating: parseFloat(avgRating.toFixed(1)),
    };

    console.log("Server-side stats:", stats); // Debug log
    console.log("Users fetched:", users.length); // Debug log

    return (
      <AdminDashboardClient
        initialProducts={products}
        initialReviews={reviews}
        initialLearningCards={learningCards}
        initialUsers={users} // Add this
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
        initialUsers={[]} // Add this
        initialStats={{
          totalProducts: 0,
          totalReviews: 0,
          totalLearningCards: 0,
          totalUsers: 0, // Add this
          avgRating: 0,
        }}
      />
    );
  }
}
