"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { adminSignOut, firestoreService } from "../lib/firebase";
import AdminProductsTable from "./AdminProductsTable";
import AdminReviewsTable from "./AdminReviewsTable";
import LearningHubTable from "./LearningHubTable";
import { DashboardPageProps, Product, Review } from "../types";

export default function AdminDashboardClient({
  initialProducts,
  initialReviews,
  initialLearningCards,
  initialStats,
}: DashboardPageProps) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "products" | "reviews" | "learninghub"
  >("products");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [learningCards, setLearningCards] = useState(initialLearningCards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [stats, setStats] = useState(initialStats);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/admin/login");
    }
  }, [user, isAdmin, authLoading, router]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError("");

    try {
      const [productsData, reviewsData, cardsData] = await Promise.all([
        firestoreService.getProducts(),
        firestoreService.getReviews(),
        firestoreService.getLearningCards(),
      ]);

      setProducts(productsData);
      setReviews(reviewsData);
      setLearningCards(cardsData);

      const totalRating = productsData.reduce(
        (sum, product) => sum + (product.rating || 0),
        0
      );
      const avgRating =
        productsData.length > 0 ? totalRating / productsData.length : 0;

      setStats({
        totalProducts: productsData.length,
        totalReviews: reviewsData.length,
        totalLearningCards: cardsData.length,
        avgRating: parseFloat(avgRating.toFixed(1)),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleDeleteProduct = async (id: string) => {
    try {
      await firestoreService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      await refreshData();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Delete error:", err);
      throw err;
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      // First get the review details
      const reviewToDelete = reviews.find((r) => r.id === id);
      if (!reviewToDelete) {
        throw new Error("Review not found");
      }

      // Get the product that this review belongs to
      const product = products.find(
        (p) =>
          p.itemId === reviewToDelete.itemId || p.id === reviewToDelete.itemId
      );

      if (!product) {
        throw new Error("Product not found for this review");
      }

      // Calculate new review count and rating
      const newReviewCount = Math.max(0, product.review_count - 1);
      let newRating = 0;

      if (newReviewCount > 0) {
        // Calculate new average: (old_total - deleted_rating) / new_count
        const oldTotalRating = product.rating * product.review_count;
        const newTotalRating = oldTotalRating - reviewToDelete.rating;
        newRating = parseFloat((newTotalRating / newReviewCount).toFixed(1));
      }

      // Delete the review from the database
      await firestoreService.deleteReview(id);

      // Update the product in the database
      await firestoreService.updateProduct(product.id, {
        review_count: newReviewCount,
        rating: newRating,
        updatedAt: Date.now(),
      });

      // Update local state
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? {
                ...p,
                review_count: newReviewCount,
                rating: newRating,
                updatedAt: Date.now(),
              }
            : p
        )
      );

      // Update stats
      setStats((prev) => ({
        ...prev,
        totalReviews: prev.totalReviews - 1,
        avgRating: prev.avgRating, // Note: This might need recalculating from all products
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Delete error:", err);
      throw err;
    }
  };

  const handleDeleteLearningCard = async (uuid: string) => {
    try {
      await firestoreService.deleteLearningCard(uuid);
      setLearningCards((prev) => prev.filter((c) => c.uuid !== uuid));
      await refreshData();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Delete error:", err);
      throw err;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateLearningCard = async (uuid: string, updates: any) => {
    try {
      await firestoreService.updateLearningCard(uuid, updates);
      setLearningCards((prev) =>
        prev.map((c) => (c.uuid === uuid ? { ...c, ...updates } : c))
      );
      await refreshData();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Update error:", err);
      alert(`Failed to update card: ${err.message}`);
      throw err;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreateLearningCard = async (cardData: any) => {
    try {
      const newCard = await firestoreService.createLearningCard(cardData);
      setLearningCards((prev) => [newCard, ...prev]);
      await refreshData();
      return newCard;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Create error:", err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      await adminSignOut();
      router.push("/admin/login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-['Kantumruy_Pro']">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Kantumruy_Pro']">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
              </div>
              <nav className="ml-10 flex space-x-4">
                <button
                  onClick={() => setActiveTab("products")}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === "products"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  Products
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === "reviews"
                      ? "bg-red-100 text-red-700"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  Reviews
                </button>
                <button
                  onClick={() => setActiveTab("learninghub")}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === "learninghub"
                      ? "bg-[#CCFFFF] text-[#0A817F]"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  Learning Hub
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user?.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Products
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalProducts}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Reviews
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalReviews}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-[#0A817F]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Learning Cards
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalLearningCards}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-yellow-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Average Rating
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.avgRating.toFixed(1)}/5
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {activeTab === "products" ? (
          <AdminProductsTable
            products={products}
            onDelete={handleDeleteProduct}
            loading={loading}
          />
        ) : activeTab === "reviews" ? (
          <AdminReviewsTable
            reviews={reviews}
            onDelete={handleDeleteReview}
            products={products}
            loading={loading}
          />
        ) : (
          <LearningHubTable
            cards={learningCards}
            onDelete={handleDeleteLearningCard}
            onUpdate={handleUpdateLearningCard}
            onCreate={handleCreateLearningCard}
            loading={loading}
          />
        )}
      </main>
    </div>
  );
}
