"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Review, Product } from "../types";
import { getDatabase, ref, get } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import ReviewDetailModal from "./ReviewDetailModal";

interface AdminReviewsTableProps {
  reviews: Review[];
  onDelete: (id: string) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Review>) => Promise<void>;
  loading: boolean;
  products?: Product[];
}

interface UserData {
  [userId: string]: {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
    location?: string;
    phone?: string;
    profileImageUrl?: string;
  };
}

type SortField = keyof Review | "userName" | "productName";
type SortDirection = "asc" | "desc";

// Custom hook for user data fetching
const useUserData = (userIds: string[]) => {
  const [userData, setUserData] = useState<UserData>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userIds.length === 0) return;

      setLoading(true);
      try {
        const db = getDatabase();
        const userPromises = userIds.map(async (userId) => {
          if (!userId) return null;
          const userRef = ref(db, `users/${userId}`);
          const snapshot = await get(userRef);
          return snapshot.exists() ? { userId, data: snapshot.val() } : null;
        });

        const results = await Promise.all(userPromises);
        const userDataMap: UserData = {};
        results.forEach((result) => {
          if (result && result.data) {
            userDataMap[result.userId] = result.data;
          }
        });
        setUserData(userDataMap);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userIds]);

  return { userData, loading };
};

// Skeleton Loader Component
const ReviewRowSkeleton = () => {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="animate-pulse"
    >
      <td className="px-6 py-4">
        <div className="h-4 w-4 bg-gray-200 rounded"></div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 w-4 bg-gray-200 rounded mr-1"></div>
            ))}
          </div>
          <div className="ml-2 h-4 bg-gray-200 rounded w-8"></div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full"></div>
          <div className="ml-3">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-8 bg-gray-200 rounded w-36"></div>
      </td>
    </motion.tr>
  );
};

export default function AdminReviewsTable({
  reviews,
  onDelete,
  loading,
  products = [],
}: AdminReviewsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [detailReview, setDetailReview] = useState<Review | null>(null);
  const [selectedProductForReview, setSelectedProductForReview] = useState<
    Product | undefined
  >(undefined);

  // Get unique user IDs from reviews
  const uniqueUserIds = useMemo(
    () =>
      [...new Set(reviews.map((r) => r.userId).filter(Boolean))] as string[],
    [reviews]
  );

  // Fetch user data
  const { userData, loading: loadingUsers } = useUserData(uniqueUserIds);

  // Create a product map for easy lookup by ID
  const productMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((product) => {
      const productId = product.itemId || product.id;
      map[productId] = product.name;
    });
    return map;
  }, [products]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, ratingFilter, reviews]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("km-KH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  // Function to get user display name
  const getUserDisplayName = useCallback(
    (userId: string) => {
      const user = userData[userId];
      if (!user) {
        return loadingUsers ? "Loading..." : "Unknown User";
      }
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      }
      if (user.first_name) {
        return user.first_name;
      }
      if (user.email) {
        return user.email.split("@")[0];
      }
      return "User";
    },
    [userData, loadingUsers]
  );

  // Function to get user email
  const getUserEmail = useCallback(
    (userId: string) => {
      const user = userData[userId];
      return user?.email || "No email";
    },
    [userData]
  );

  const getProductName = useCallback(
    (itemId: string) => {
      let productName = productMap[itemId] || "Unknown Product";

      if (productName === "Unknown Product") {
        const foundProduct = products.find((p) => p.id === itemId);
        if (foundProduct) {
          productName = foundProduct.name;
        }
      }

      if (productName === "Unknown Product") {
        const foundProduct = products.find((p) => p.itemId === itemId);
        if (foundProduct) {
          productName = foundProduct.name;
        }
      }

      return productName;
    },
    [productMap, products]
  );

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      setDeletingId(id);
      try {
        await onDelete(id);
        setSelectedReviews((prev) =>
          prev.filter((reviewId) => reviewId !== id)
        );
        showSuccess("Review deleted successfully!");
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete review");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReviews.length === 0) return;

    if (window.confirm(`Delete ${selectedReviews.length} selected reviews?`)) {
      try {
        await Promise.all(selectedReviews.map((id) => onDelete(id)));
        setSelectedReviews([]);
        showSuccess(`${selectedReviews.length} reviews deleted successfully!`);
      } catch (error) {
        console.error("Bulk delete error:", error);
        alert("Failed to delete some reviews");
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedReviews.length === filteredReviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(filteredReviews.map((review) => review.id));
    }
  };

  const handleSelectReview = (id: string) => {
    setSelectedReviews((prev) =>
      prev.includes(id)
        ? prev.filter((reviewId) => reviewId !== id)
        : [...prev, id]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    const result = reviews.filter((review) => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch =
        !debouncedSearchTerm ||
        review.comment.toLowerCase().includes(searchLower) ||
        review.itemId.toLowerCase().includes(searchLower) ||
        getUserDisplayName(review.userId).toLowerCase().includes(searchLower) ||
        getUserEmail(review.userId).toLowerCase().includes(searchLower) ||
        getProductName(review.itemId).toLowerCase().includes(searchLower);

      const matchesRating = ratingFilter
        ? review.rating === ratingFilter
        : true;

      return matchesSearch && matchesRating;
    });

    // Sorting
    result.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let aValue: any, bValue: any;

      if (sortField === "userName") {
        aValue = getUserDisplayName(a.userId);
        bValue = getUserDisplayName(b.userId);
      } else if (sortField === "productName") {
        aValue = getProductName(a.itemId);
        bValue = getProductName(b.itemId);
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return result;
  }, [
    reviews,
    debouncedSearchTerm,
    ratingFilter,
    sortField,
    sortDirection,
    getUserDisplayName,
    getUserEmail,
    getProductName,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    const csvContent = [
      [
        "Comment",
        "Rating",
        "Product ID",
        "Product Name",
        "User",
        "Email",
        "Date",
        "Review ID",
      ],
      ...filteredReviews.map((review) => [
        `"${review.comment.replace(/"/g, '""')}"`,
        review.rating,
        review.itemId,
        getProductName(review.itemId),
        getUserDisplayName(review.userId),
        getUserEmail(review.userId),
        formatDate(review.createdAt),
        review.id,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviews-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccess(`Exported ${filteredReviews.length} reviews to CSV`);
  };

  if (loading) {
    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden font-['Kantumruy_Pro']">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-gray-200 rounded w-64"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[...Array(7)].map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <ReviewRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Success Notification */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 animate-slide-in font-['Kantumruy_Pro']"
          >
            <div className="rounded-lg shadow-lg p-4 flex items-center space-x-3 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Successfully Deleted
                </p>
                <p className="text-sm text-gray-600">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage("")}
                className="ml-auto text-gray-400 hover:text-gray-600"
                aria-label="Dismiss notification"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white shadow-md rounded-lg overflow-hidden font-['Kantumruy_Pro']">
        {/* Header with Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="px-6 py-4 border-b border-gray-200"
        >
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Reviews Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {paginatedReviews.length} of {filteredReviews.length}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B7280]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <motion.input
                  type="text"
                  placeholder="Search reviews, users, or products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-[#0D1B2A] block sm:text-sm px-3 py-2 border border-[#D1D5DB] 
                        rounded-full 
                        focus:border-[#0E4123] 
                        focus:ring-2 focus:ring-[#0E4123]/20 
                        w-full sm:w-64
                        text-[13px] sm:text-[14px] pl-10"
                  aria-label="Search reviews"
                  whileFocus={{ scale: 1.01 }}
                />
              </div>

              <AnimatePresence>
                {selectedReviews.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBulkDelete}
                    disabled={deletingId !== null}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete Selected ({selectedReviews.length})
                  </motion.button>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportToCSV}
                className="inline-flex rounded-full items-center px-4 py-2 border border-gray-300 text-sm font-medium  text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export CSV
              </motion.button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Filter by rating:</span>
              <div className="flex gap-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRatingFilter(null)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    !ratingFilter
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  All
                </motion.button>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <motion.button
                    key={rating}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRatingFilter(rating)}
                    className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                      ratingFilter === rating
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {rating}{" "}
                    <svg
                      className="h-3.5 w-3.5 text-yellow-400"
                      fill=" currentColor"
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
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-700">Show:</span>
              <motion.select
                whileFocus={{ scale: 1.01 }}
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="text-sm border text-[#0D1B2A] border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </motion.select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
          </div>
        </motion.div>

        {filteredReviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No reviews found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {debouncedSearchTerm || ratingFilter
                ? "Try adjusting your search or filter criteria"
                : "No reviews have been posted yet."}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedReviews.length === filteredReviews.length &&
                          filteredReviews.length > 0
                        }
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        aria-label="Select all reviews"
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("comment")}
                    >
                      <motion.div
                        className="flex items-center"
                        whileHover={{ scale: 1.02 }}
                      >
                        Review
                        {sortField === "comment" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </motion.div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("rating")}
                    >
                      <motion.div
                        className="flex items-center"
                        whileHover={{ scale: 1.02 }}
                      >
                        Rating
                        {sortField === "rating" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </motion.div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("productName")}
                    >
                      <motion.div
                        className="flex items-center"
                        whileHover={{ scale: 1.02 }}
                      >
                        Product
                        {sortField === "productName" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </motion.div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("userName")}
                    >
                      <motion.div
                        className="flex items-center"
                        whileHover={{ scale: 1.02 }}
                      >
                        Review By
                        {sortField === "userName" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </motion.div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("createdAt")}
                    >
                      <motion.div
                        className="flex items-center"
                        whileHover={{ scale: 1.02 }}
                      >
                        Date
                        {sortField === "createdAt" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </motion.div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <AnimatePresence>
                    {paginatedReviews.map((review, index) => {
                      const userFullName = getUserDisplayName(review.userId);
                      const userEmail = getUserEmail(review.userId);
                      const productName = getProductName(review.itemId);

                      return (
                        <motion.tr
                          key={review.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`hover:bg-gray-50 transition-all duration-200 ${
                            deletingId === review.id ? "opacity-50" : ""
                          } ${
                            selectedReviews.includes(review.id)
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedReviews.includes(review.id)}
                              onChange={() => handleSelectReview(review.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              aria-label={`Select review by ${userFullName}`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs">
                              <div className="line-clamp-2">
                                {review.comment}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {review.id.substring(0, 8)}...
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <motion.svg
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </motion.svg>
                                ))}
                              </div>
                              <span className="ml-2 text-sm font-medium text-gray-900">
                                {review.rating}/5
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="text-gray-900 font-medium">
                                {productName}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {review.itemId.substring(0, 12)}...
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {loadingUsers ? (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <div className="animate-pulse h-5 w-5 bg-gray-300 rounded"></div>
                                </div>
                              ) : userData[review.userId]?.profileImageUrl ? (
                                <motion.img
                                  whileHover={{ scale: 1.1 }}
                                  src={userData[review.userId].profileImageUrl}
                                  alt={userFullName}
                                  className="h-8 w-8 rounded-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">
                                    {userFullName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {userFullName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {userEmail}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(review.createdAt)}
                            </div>
                            {review.updatedAt !== review.createdAt && (
                              <div className="text-xs text-gray-500">
                                Updated: {formatDate(review.updatedAt)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  const productForReview = products.find(
                                    (p) =>
                                      p.id === review.itemId ||
                                      p.itemId === review.itemId
                                  );
                                  setSelectedProductForReview(productForReview);
                                  setDetailReview(review);
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                                aria-label={`View details of review by ${userFullName}`}
                              >
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                                View Details
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDelete(review.id)}
                                disabled={deletingId === review.id}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all duration-200"
                                aria-label={`Delete review by ${userFullName}`}
                              >
                                {deletingId === review.id ? (
                                  <>
                                    <svg
                                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-4 h-4 mr-1"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                    Delete
                                  </>
                                )}
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-4 border-t border-gray-200"
              >
                {/* Mobile pagination */}
                <div className="sm:hidden flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
                      aria-label="Previous page"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      <span className="sr-only sm:not-sr-only">Prev</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
                      aria-label="Next page"
                    >
                      <span className="sr-only sm:not-sr-only">Next</span>
                      <svg
                        className="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </motion.button>
                  </div>
                </div>

                {/* Desktop pagination */}
                <div className="hidden sm:flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredReviews.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {filteredReviews.length}
                    </span>{" "}
                    reviews
                  </div>

                  <div className="flex items-center space-x-1 lg:space-x-2">
                    {/* First Page Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="text-gray-700 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hidden lg:inline-flex items-center"
                      title="First Page"
                      aria-label="Go to first page"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                        />
                      </svg>
                    </motion.button>

                    {/* Previous Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
                      aria-label="Previous page"
                    >
                      <svg
                        className="text-gray-700 w-4 h-4 mr-1 hidden sm:inline"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      <span className="sm:inline text-gray-700">Previous</span>
                    </motion.button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {/* Show first page and ellipsis if needed */}
                      {currentPage > 3 && totalPages > 5 && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setCurrentPage(1)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 min-w-[2.5rem]"
                          >
                            1
                          </motion.button>
                          {currentPage > 4 && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                        </>
                      )}

                      {/* Show surrounding pages */}
                      {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let startPage = Math.max(
                          1,
                          currentPage - Math.floor(maxVisible / 2)
                        );
                        const endPage = Math.min(
                          totalPages,
                          startPage + maxVisible - 1
                        );

                        // Adjust start page if we're near the end
                        if (endPage - startPage + 1 < maxVisible) {
                          startPage = Math.max(1, endPage - maxVisible + 1);
                        }

                        for (
                          let pageNum = startPage;
                          pageNum <= endPage;
                          pageNum++
                        ) {
                          pages.push(
                            <motion.button
                              key={pageNum}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1.5 text-sm border rounded-md min-w-[2.5rem] ${
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white border-blue-600 font-semibold"
                                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
                              }`}
                              aria-label={`Go to page ${pageNum}`}
                              aria-current={
                                currentPage === pageNum ? "page" : undefined
                              }
                            >
                              {pageNum}
                            </motion.button>
                          );
                        }
                        return pages;
                      })()}

                      {/* Show last page and ellipsis if needed */}
                      {currentPage < totalPages - 2 && totalPages > 5 && (
                        <>
                          {currentPage < totalPages - 3 && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 min-w-[2.5rem]"
                          >
                            {totalPages}
                          </motion.button>
                        </>
                      )}
                    </div>

                    {/* Next Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
                      aria-label="Next page"
                    >
                      <span className="sm:inline text-gray-700">Next</span>
                      <svg
                        className="text-gray-700 w-4 h-4 ml-1 hidden sm:inline"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </motion.button>

                    {/* Last Page Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="text-gray-700 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hidden lg:inline-flex items-center"
                      title="Last Page"
                      aria-label="Go to last page"
                    >
                      <svg
                        className="text-gray-700 w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 5l7 7-7 7M5 5l7 7-7 7"
                        />
                      </svg>
                    </motion.button>
                  </div>
                </div>

                {/* Mobile page indicator dots */}
                <div className="sm:hidden flex justify-center mt-3">
                  <div className="flex space-x-1">
                    {(() => {
                      const maxDots = Math.min(5, totalPages);
                      const dots = [];

                      let startDot = 1;
                      if (currentPage > 3) {
                        startDot = currentPage - 1;
                      }
                      if (startDot + maxDots - 1 > totalPages) {
                        startDot = totalPages - maxDots + 1;
                      }

                      for (let i = 0; i < maxDots; i++) {
                        const pageNum = startDot + i;
                        if (pageNum > totalPages) break;

                        dots.push(
                          <motion.div
                            key={pageNum}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              currentPage === pageNum
                                ? "bg-blue-600"
                                : "bg-gray-300"
                            }`}
                            animate={{
                              scale: currentPage === pageNum ? 1.2 : 1,
                            }}
                            aria-hidden="true"
                          />
                        );
                      }
                      return dots;
                    })()}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Review Detail Modal */}
      {detailReview && (
        <ReviewDetailModal
          review={detailReview}
          product={selectedProductForReview}
          isOpen={!!detailReview}
          onClose={() => {
            setDetailReview(null);
            setSelectedProductForReview(undefined);
          }}
        />
      )}
    </>
  );
}
