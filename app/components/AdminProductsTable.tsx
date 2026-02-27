"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Product } from "../types";
import ProductDetailModal from "./ProductDetailModal";
import { User } from "lucide-react";
import { getDatabase, ref, get } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { firestoreService } from "../lib/firebase";
import ProductWarningModal from "./ProductWarningModal";

interface AdminProductsTableProps {
  products: Product[];
  onDelete: (id: string) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Product>) => Promise<void>;
  loading: boolean;

  // ✅ NEW
  adminId: string;
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

type SortField = keyof Product | "userName";
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
const ProductRowSkeleton = () => {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="animate-pulse"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-lg"></div>
          <div className="ml-4">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
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
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full"></div>
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
        <div className="flex space-x-2">
          <div className="h-8 bg-gray-200 rounded w-16"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      </td>
    </motion.tr>
  );
};

export default function AdminProductsTable({
  products,
  onDelete,
  onUpdate,
  loading,
  adminId,
}: AdminProductsTableProps) {
  // ✅ Local UI state so updates show instantly (no refresh)
  const [productsUI, setProductsUI] = useState<Product[]>(products);
  useEffect(() => {
    setProductsUI(products);
  }, [products]);

  const [userData, setUserData] = useState<UserData>({});
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [operationType, setOperationType] = useState<"delete" | "update">(
    "delete"
  );

  // ✅ warning modal states
  const [warningProduct, setWarningProduct] = useState<Product | null>(null);
  const [sendingWarning, setSendingWarning] = useState(false);

  // sorting/pagination/search
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const uniqueUserIds = useMemo(
    () =>
      [...new Set(productsUI.map((p) => p.userId).filter(Boolean))] as string[],
    [productsUI]
  );

  const { userData: fetchedUserData, loading: usersLoading } =
    useUserData(uniqueUserIds);

  useEffect(() => {
    setUserData(fetchedUserData);
  }, [fetchedUserData]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, categoryFilter, productsUI]);

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("km-KH", {
      style: "currency",
      currency: "KHR",
      minimumFractionDigits: 0,
    })
      .format(numPrice)
      .replace("KHR", "៛");
  };

  const showSuccess = (message: string, type: "delete" | "update") => {
    setSuccessMessage(message);
    setOperationType(type);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      setDeletingId(id);
      try {
        await onDelete(id);

        // ✅ update UI instantly
        setProductsUI((prev) => prev.filter((p) => p.id !== id));

        showSuccess("Product deleted successfully!", "delete");
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete product");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getUserDisplayName = useCallback(
    (userId: string) => {
      const user = userData[userId];
      if (!user) return usersLoading ? "Loading..." : "Unknown User";
      if (user.first_name && user.last_name)
        return `${user.first_name} ${user.last_name}`;
      if (user.first_name) return user.first_name;
      if (user.email) return user.email.split("@")[0];
      return "User";
    },
    [userData, usersLoading]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field)
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const categories = useMemo(() => {
    const uniqueCats = Array.from(new Set(productsUI.map((p) => p.category)));
    return ["all", ...uniqueCats];
  }, [productsUI]);

  // ✅ match your DB: visibility "hidden" = warned, visibility "visible" = normal
  const isWarnedProduct = (p: Product) =>
    (p.visibility ?? "visible") === "hidden" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p as any)?.moderation?.status === "warned";

  // ✅ your DB warning text field: moderation.warningMessage
  const getWarnMessage = (p: Product) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = (p as any)?.moderation;
    return m?.warningMessage || "";
  };

  const filteredAndSortedProducts = useMemo(() => {
    const result = productsUI.filter((product) => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch =
        !debouncedSearchTerm ||
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        getUserDisplayName(product.userId).toLowerCase().includes(searchLower);

      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let aValue: any, bValue: any;

      if (sortField === "userName") {
        aValue = getUserDisplayName(a.userId);
        bValue = getUserDisplayName(b.userId);
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortField === "price") {
        const aNum = typeof aValue === "string" ? parseFloat(aValue) : aValue;
        const bNum = typeof bValue === "string" ? parseFloat(bValue) : bValue;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      if (sortField === "rating" || sortField === "review_count") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (sortField === "createdAt" || sortField === "updatedAt") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (sortDirection === "asc")
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });

    return result;
  }, [
    productsUI,
    debouncedSearchTerm,
    categoryFilter,
    sortField,
    sortDirection,
    getUserDisplayName,
  ]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ✅ warn/edit handler
  const handleSendWarning = async (productId: string, reason: string) => {
    if (!adminId) {
      alert("Missing adminId");
      return;
    }

    const product = productsUI.find((p) => p.id === productId);
    if (!product?.userId) {
      alert("Product user not found");
      return;
    }

    setSendingWarning(true);
    try {
      await firestoreService.warnProduct(productId, {
        userId: product.userId,
        adminId,
        message: reason,
      });

      const now = Date.now();
      const expiresAt = now + 168 * 60 * 60 * 1000;

      // ✅ update UI instantly
      setProductsUI((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          return {
            ...p,
            visibility: "hidden",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            moderation: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(p as any).moderation,
              status: "warned",
              warnedAt: now,
              expiresAt,
              warnedBy: adminId,
              warningMessage: reason,
            },
            updatedAt: now,
          } as Product;
        })
      );

      // optional callback to parent
      try {
        await onUpdate?.(productId, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          visibility: "hidden" as any,
          moderation: {
            status: "warned",
            warnedAt: now,
            expiresAt,
            warnedBy: adminId,
            warningMessage: reason,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          updatedAt: now,
        });
      } catch {}

      showSuccess(
        isWarnedProduct(product)
          ? "Warning updated successfully!"
          : "Warning sent. Product hidden for 7 days.",
        "update"
      );

      setWarningProduct(null);
    } catch (err) {
      console.error("Warn error:", err);
      alert("Failed to send warning");
      throw err;
    } finally {
      setSendingWarning(false);
    }
  };

  // ✅ delete warning handler
  const handleDeleteWarning = async (productId: string) => {
    const ok = window.confirm("Delete this warning and restore product?");
    if (!ok) return;

    setSendingWarning(true);
    try {
      await firestoreService.deleteProductWarning(productId);

      const now = Date.now();

      // ✅ update UI instantly
      setProductsUI((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          return {
            ...p,
            visibility: "visible",

            moderation: {
              status: "clean",
              resolvedAt: now,
            },
            updatedAt: now,
          } as unknown as Product;
        })
      );

      // optional callback to parent
      try {
        await onUpdate?.(productId, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          visibility: "visible" as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          moderation: { status: "clean", resolvedAt: now } as any,
          updatedAt: now,
        });
      } catch {}

      showSuccess("Warning deleted. Product restored.", "update");
      setWarningProduct(null);
    } catch (err) {
      console.error("Delete warning error:", err);
      alert("Failed to delete warning");
      throw err;
    } finally {
      setSendingWarning(false);
    }
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
            <div className="h-4 bg-gray-200 rounded w-24"></div>
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
                <ProductRowSkeleton key={i} />
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
            className="fixed top-4 right-4 z-50 font-['Kantumruy_Pro']"
          >
            <div
              className={`rounded-lg shadow-lg p-4 flex items-center space-x-3 ${
                operationType === "delete"
                  ? "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500"
                  : "bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500"
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  operationType === "delete" ? "bg-red-100" : "bg-green-100"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    operationType === "delete"
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
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
                  {operationType === "delete"
                    ? "Successfully Deleted"
                    : "Successfully Updated"}
                </p>
                <p className="text-sm text-gray-600">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage("")}
                className="ml-auto text-gray-400 hover:text-gray-600"
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="px-6 py-4 border-b border-gray-200"
        >
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Products Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {paginatedProducts.length} of{" "}
                {filteredAndSortedProducts.length}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString("km-KH")}
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
                  placeholder="Search products, descriptions, or users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 text-[#0D1B2A] pr-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  whileFocus={{ scale: 1.01 }}
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <motion.select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 text-[#0D1B2A] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                whileFocus={{ scale: 1.01 }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </motion.select>

              <motion.select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 text-[#0D1B2A] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                whileFocus={{ scale: 1.01 }}
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

        {paginatedProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No products found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || categoryFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding a new product."}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Product{" "}
                        {sortField === "name" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>

                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center">
                        Category{" "}
                        {sortField === "category" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>

                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center">
                        Price{" "}
                        {sortField === "price" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>

                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("rating")}
                    >
                      <div className="flex items-center">
                        Rating{" "}
                        {sortField === "rating" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>

                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("userName")}
                    >
                      <div className="flex items-center">
                        Posted By{" "}
                        {sortField === "userName" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  <AnimatePresence>
                    {paginatedProducts.map((product, index) => {
                      const productUser = product.userId
                        ? userData[product.userId]
                        : null;
                      const userDisplayName = getUserDisplayName(
                        product.userId
                      );

                      const isWarned = isWarnedProduct(product);

                      return (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`hover:bg-gray-50 transition-all duration-200 ${
                            deletingId === product.id ? "opacity-50" : ""
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12">
                                {product.images && product.images[0] ? (
                                  <motion.img
                                    whileHover={{ scale: 1.1 }}
                                    className="h-12 w-12 rounded-lg object-cover"
                                    src={product.images[0]}
                                    alt={product.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://via.placeholder.com/48x48?text=No+Image";
                                    }}
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                    <svg
                                      className="h-6 w-6 text-gray-400"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 flex items-center">
                                  {product.name}
                                  {isWarned && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Warning
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {product.unit}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <motion.span
                              whileHover={{ scale: 1.1 }}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                product.category === "ផ្លែឈើ"
                                  ? "bg-green-100 text-green-800"
                                  : product.category === "បន្លែ"
                                  ? "bg-blue-100 text-blue-800"
                                  : product.category === "ផ្សេងៗ"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {product.category}
                            </motion.span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatPrice(product.price)}
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
                                      i < Math.floor(product.rating)
                                        ? "text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </motion.svg>
                                ))}
                              </div>
                              <span className="ml-1 text-sm text-gray-600">
                                {product.rating.toFixed(1)}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                ({product.review_count} reviews)
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                {usersLoading ? (
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <div className="animate-pulse h-5 w-5 bg-gray-300 rounded"></div>
                                  </div>
                                ) : productUser?.profileImageUrl ? (
                                  <motion.img
                                    whileHover={{ scale: 1.1 }}
                                    src={productUser.profileImageUrl}
                                    alt="Profile"
                                    className="h-10 w-10 rounded-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png";
                                    }}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-500" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm w-20 font-medium text-gray-900 truncate leading-tight">
                                  {userDisplayName}
                                </div>
                                <div className="text-sm w-20 text-gray-500 truncate leading-tight">
                                  {productUser?.email || "No email"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDetailProduct(product)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                              >
                                View Details
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setWarningProduct(product)}
                                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white ${
                                  isWarned
                                    ? "bg-amber-700 hover:bg-amber-800"
                                    : "bg-yellow-600 hover:bg-yellow-700"
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200`}
                                aria-label={`${
                                  isWarned ? "Edit warning" : "Warn"
                                } product: ${product.name}`}
                              >
                                {isWarned ? "Edit Warning" : "Warn"}
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDelete(product.id)}
                                disabled={deletingId === product.id}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all duration-200"
                              >
                                {deletingId === product.id
                                  ? "Deleting..."
                                  : "Delete"}
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
              <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ✅ WARNING MODAL */}
      {warningProduct &&
        (() => {
          // ✅ ensure modal always uses latest product (updated message)
          const fresh =
            productsUI.find((p) => p.id === warningProduct.id) ??
            warningProduct;

          return (
            <ProductWarningModal
              product={fresh}
              isOpen={!!warningProduct}
              onClose={() => setWarningProduct(null)}
              onSendWarning={handleSendWarning}
              initialReason={getWarnMessage(fresh)}
              mode={isWarnedProduct(fresh) ? "edit" : "warn"}
              onDeleteWarning={handleDeleteWarning}
              canDeleteWarning={isWarnedProduct(fresh)}
              isBusy={sendingWarning}
            />
          );
        })()}

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          isOpen={!!detailProduct}
        />
      )}
    </>
  );
}
