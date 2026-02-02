"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { adminSignOut, firestoreService } from "../lib/firebase";
import AdminProductsTable from "./AdminProductsTable";
import AdminReviewsTable from "./AdminReviewsTable";
import LearningHubTable from "./LearningHubTable";
import { DashboardPageProps, Product, Review } from "../types";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboardClient({
  initialProducts,
  initialReviews,
  initialLearningCards,
  initialStats,
}: DashboardPageProps) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "products" | "reviews" | "learninghub" | "Map" | "Comunity"
  >("products");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [learningCards, setLearningCards] = useState(initialLearningCards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [stats, setStats] = useState(initialStats);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/admin/login");
    }
  }, [user, isAdmin, authLoading, router]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        avgRating: prev.avgRating,
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
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-gray-600"
          >
            Loading dashboard...
          </motion.p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dotted font-['Kantumruy_Pro']">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-100 shadow sticky top-0 z-30"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <img
                  src="/logo_bay.svg"
                  alt="logo"
                  width={45}
                  height={45}
                  className="hidden sm:flex"
                />
                <h1 className="text-lg sm:text-xl font-medium text-gray-900 hidden lg:flex">
                  BayEcosystem
                </h1>
              </div>

              {/* Mobile menu button - visible on mobile and tablet */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="ml-3 md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-label="Toggle navigation menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </motion.button>

              {/* Desktop Navigation - visible on md and up */}
              <nav className="hidden rounded-3xl border border-gray-200 bg-gray-50 p-1.5 md:ml-6 lg:ml-10 xl:ml-40 md:flex md:space-x-1 lg:space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab("products")}
                  className={`px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-3xl text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "products"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Products
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab("reviews")}
                  className={`px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-3xl text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "reviews"
                      ? "bg-red-100 text-red-700"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Reviews
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab("learninghub")}
                  className={`px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-3xl text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "learninghub"
                      ? "bg-[#CCFFFF] text-[#0A817F]"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Learning Hub
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab("Map")}
                  className={`px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-3xl text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "Map"
                      ? "bg-[#CCFFFF] text-[#0A817F]"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Map
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab("Comunity")}
                  className={`px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-3xl text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "Comunity"
                      ? "bg-[#CCFFFF] text-[#0A817F]"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Community
                </motion.button>
              </nav>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3 lg:space-x-4">
              <div className="hidden text-[11px] sm:text-[12px] text-gray-600 md:block">
                <span className="font-medium truncate max-w-[120px] md:max-w-[150px] lg:max-w-[180px]">
                  {user?.email}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                className="inline-flex items-center rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 border border-transparent text-xs sm:text-sm font-medium shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <svg
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 md:mr-2 md:hidden"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="hidden md:inline">Sign Out</span>
              </motion.button>
            </div>
          </div>

          {/* Mobile Navigation Menu - visible on md and below */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden overflow-hidden"
              >
                <div className="border-t border-gray-200 pt-4 pb-3">
                  <div className="grid grid-cols-2 gap-2 px-2">
                    {[
                      { key: "products", label: "Products" },
                      { key: "reviews", label: "Reviews" },
                      { key: "learninghub", label: "Learning Hub" },
                      { key: "Map", label: "Map" },
                      { key: "Comunity", label: "Community", colSpan: 2 },
                    ].map((item) => (
                      <motion.button
                        key={item.key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          setActiveTab(item.key as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium text-center ${
                          activeTab === item.key
                            ? item.key === "products"
                              ? "bg-blue-100 text-blue-700"
                              : item.key === "reviews"
                              ? "bg-red-100 text-red-700"
                              : "bg-[#CCFFFF] text-[#0A817F]"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        } ${item.colSpan === 2 ? "col-span-2" : ""}`}
                      >
                        {item.label}
                      </motion.button>
                    ))}
                  </div>
                  <div className="pt-4 pb-3 border-t border-gray-200 mt-2">
                    <div className="px-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium truncate block">
                          {user?.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Stats - Optimized for tablet */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-7xl mx-auto px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 mt-4 sm:mt-5 md:mt-6"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {[
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              ),
              color: "text-blue-400",
              title: "Total Products",
              value: stats.totalProducts,
            },
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              ),
              color: "text-red-400",
              title: "Total Reviews",
              value: stats.totalReviews,
            },
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              ),
              color: "text-[#0A817F]",
              title: "Learning Cards",
              value: stats.totalLearningCards,
            },
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              ),
              color: "text-yellow-400",
              title: "Avg Rating",
              value: `${stats.avgRating.toFixed(1)}/5`,
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-3 sm:p-4 md:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <motion.svg
                      className={`h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 ${stat.color}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      animate={{ rotate: [0, 10, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 3,
                        delay: index * 0.5,
                      }}
                    >
                      {stat.icon}
                    </motion.svg>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <dl>
                      <dt className="text-xs sm:text-sm md:text-sm font-medium text-gray-500 truncate">
                        {stat.title}
                      </dt>
                      <motion.dd
                        key={stat.value}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-base sm:text-lg md:text-xl font-medium text-gray-900"
                      >
                        {stat.value}
                      </motion.dd>
                    </dl>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 py-4 sm:py-5 md:py-6 lg:py-8">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 sm:mb-5 md:mb-6 rounded-md bg-red-50 p-3 sm:p-4"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5 text-red-400"
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
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-red-800 truncate">
                    {error}
                  </h3>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
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
            ) : activeTab === "learninghub" ? (
              <LearningHubTable
                cards={learningCards}
                onDelete={handleDeleteLearningCard}
                onUpdate={handleUpdateLearningCard}
                onCreate={handleCreateLearningCard}
                loading={loading}
              />
            ) : activeTab === "Map" ? (
              <div className="bg-white shadow rounded-lg p-4 md:p-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-4">
                  Map Management
                </h2>
                <p className="text-gray-600">
                  Map management content coming soon...
                </p>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-4 md:p-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-4">
                  Community Management
                </h2>
                <p className="text-gray-600">
                  Community management content coming soon...
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
