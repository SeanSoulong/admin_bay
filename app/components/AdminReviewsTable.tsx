"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Review, Product } from "../types";
import { getDatabase, ref, get } from "firebase/database";

interface AdminReviewsTableProps {
  reviews: Review[];
  onDelete: (id: string) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Review>) => Promise<void>;
  loading: boolean;
  products?: Product[]; // Changed from Record<string, { name: string }> to Product[]
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

export default function AdminReviewsTable({
  reviews,
  onDelete,
  loading,
  products = [], // Changed default to empty array
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
      // Use itemId if available, otherwise use id
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

  // Function to get product name with debugging
  const getProductName = useCallback(
    (itemId: string) => {
      console.log("Looking for product with itemId:", itemId);
      console.log("Total products:", products.length);

      // Log first few products for comparison
      if (products.length > 0) {
        console.log("Sample products:", products.slice(0, 3));
      }

      // Try multiple lookup strategies
      let productName = "Unknown Product";
      let foundProduct = null;

      // Strategy 1: Look in productMap (itemId match)
      productName = productMap[itemId] || "Unknown Product";

      if (productName === "Unknown Product") {
        // Strategy 2: Find by product.id
        foundProduct = products.find((p) => p.id === itemId);
        if (foundProduct) {
          productName = foundProduct.name;
          console.log(`Found by product.id: ${foundProduct.name}`);
        }
      }

      if (productName === "Unknown Product") {
        // Strategy 3: Find by product.itemId
        foundProduct = products.find((p) => p.itemId === itemId);
        if (foundProduct) {
          productName = foundProduct.name;
          console.log(`Found by product.itemId: ${foundProduct.name}`);
        }
      }

      // Log if still not found
      if (productName === "Unknown Product") {
        console.log(`Product not found for itemId: ${itemId}`);
        console.log(
          "Available product IDs:",
          products.map((p) => ({
            id: p.id,
            itemId: p.itemId,
            name: p.name,
          }))
        );
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
        // Remove from selected reviews if present
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
      // Search filter
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch =
        !debouncedSearchTerm ||
        review.comment.toLowerCase().includes(searchLower) ||
        review.itemId.toLowerCase().includes(searchLower) ||
        getUserDisplayName(review.userId).toLowerCase().includes(searchLower) ||
        getUserEmail(review.userId).toLowerCase().includes(searchLower) ||
        getProductName(review.itemId).toLowerCase().includes(searchLower);

      // Rating filter
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="sr-only">Loading reviews...</span>
      </div>
    );
  }

  return (
    <>
      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in font-['Kantumruy_Pro']">
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
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden font-['Kantumruy_Pro']">
        {/* Header with Controls */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Reviews Management
              </h2>
              <p
                className="text-sm text-gray-600 mt-1 flex items-center gap-2.5
              "
              >
                Showing {paginatedReviews.length} of {filteredReviews.length}{" "}
                {/* <svg
                  className="h-3.5 w-3.5 text-red-400"
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
                </svg>{" "}
                • {Object.keys(userData).length}{" "}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="32" cy="20" r="12" fill="#808080" />

                  <path
                    d="M12 54C12 42.95 21.4 36 32 36C42.6 36 52 42.95 52 54"
                    fill="#808080"
                  />
                </svg>
                • {products.length}
                <svg
                  className="h-3.5 w-3.5 text-blue-400"
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
                </svg> */}
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
                <input
                  type="text"
                  placeholder="Search reviews, users, or products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-[#0D1B2A] block sm:text-sm px-3 py-2 border border-[#D1D5DB] 
                        rounded-lg 
                        focus:border-[#0E4123] 
                        focus:ring-2 focus:ring-[#0E4123]/20 
                        w-full sm:w-64
                        text-[13px] sm:text-[14px] pl-10"
                  aria-label="Search reviews"
                />
              </div>

              {selectedReviews.length > 0 && (
                <button
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
                </button>
              )}

              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Filter by rating:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setRatingFilter(null)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    !ratingFilter
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  All
                </button>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
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
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-700">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="text-sm border text-[#0D1B2A] border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
          </div>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
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
          </div>
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
                      <div className="flex items-center">
                        Review
                        {sortField === "comment" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("rating")}
                    >
                      <div className="flex items-center">
                        Rating
                        {sortField === "rating" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("productName")}
                    >
                      <div className="flex items-center">
                        Product
                        {sortField === "productName" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("userName")}
                    >
                      <div className="flex items-center">
                        Review By
                        {sortField === "userName" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center">
                        Date
                        {sortField === "createdAt" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
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
                  {paginatedReviews.map((review) => {
                    const userFullName = getUserDisplayName(review.userId);
                    const userEmail = getUserEmail(review.userId);
                    const productName = getProductName(review.itemId);

                    return (
                      <tr
                        key={review.id}
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
                            <div className="line-clamp-2">{review.comment}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {review.id.substring(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
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
                              <img
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
                          <button
                            onClick={() => handleDelete(review.id)}
                            disabled={deletingId === review.id}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-95"
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
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-700 mb-4 sm:mb-0">
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
                  <span className="font-medium">{filteredReviews.length}</span>{" "}
                  results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
