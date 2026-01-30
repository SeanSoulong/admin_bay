"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Calendar,
  Star,
  Package,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Review, Product } from "../types";
import { getDatabase, ref, get } from "firebase/database";

interface ReviewDetailModalProps {
  review: Review;
  product?: Product;
  isOpen: boolean;
  onClose: () => void;
}

interface UserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  location?: string;
  phone?: string;
  profileImageUrl?: string;
  joinedDate?: string;
}

interface ProductData {
  name: string;
  price: string | number;
  category: string;
  images?: string[];
}

export default function ReviewDetailModal({
  review,
  product,
  isOpen,
  onClose,
}: ReviewDetailModalProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [isReported, setIsReported] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (review.userId) {
        fetchUserData();
      }
      if (product) {
        setProductData({
          name: product.name,
          price: product.price,
          category: product.category,
          images: product.images,
        });
        setLoadingProduct(false);
      } else if (review.itemId) {
        fetchProductData();
      }

      // Check if review is reported (you can fetch this from your database)
      checkReportStatus();
    }
  }, [review, product, isOpen]);

  const fetchUserData = async () => {
    if (!review.userId) return;

    setLoadingUser(true);
    try {
      const db = getDatabase();
      const userRef = ref(db, `users/${review.userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        setUserData(snapshot.val());
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchProductData = async () => {
    // If product data is not provided, you might want to fetch it
    // This is a placeholder - you should implement your own logic
    setLoadingProduct(false);
  };

  const checkReportStatus = async () => {
    // Placeholder for checking if review is reported
    // You should implement this based on your database structure
    setIsReported(false);
    setReportReason("");
  };

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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("km-KH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "ផ្លែឈើ":
        return "bg-green-100 text-green-800";
      case "បន្លែ":
        return "bg-blue-100 text-blue-800";
      case "ផ្សេងៗ":
        return "bg-purple-100 text-purple-800";
      case "សម្ភារៈ":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    if (rating >= 2) return "text-orange-600";
    return "text-red-600";
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 5:
        return "ពិតជាល្អណាស់";
      case 4:
        return "ល្អ";
      case 3:
        return "មធ្យម";
      case 2:
        return "មិនល្អ";
      case 1:
        return "អន់ខ្លាំង";
      default:
        return "មិនដឹង";
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />

            <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-4 font-['Kantumruy_Pro']">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="my-8 w-full max-w-4xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Review Details
                      </h2>
                      <p className="text-sm text-gray-500">
                        Complete review information and metadata
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
                      aria-label="Close modal"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column - Review Content */}
                      <div className="space-y-6">
                        {/* Review Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className={`text-2xl font-bold ${getRatingColor(
                                    review.rating
                                  )}`}
                                >
                                  {review.rating.toFixed(1)}
                                </div>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <motion.svg
                                      key={i}
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: i * 0.1 }}
                                      className={`h-5 w-5 ${
                                        i < review.rating
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
                              </div>
                              <p
                                className={`text-sm font-medium ${getRatingColor(
                                  review.rating
                                )}`}
                              >
                                {getRatingText(review.rating)}
                              </p>
                            </div>

                            {isReported && (
                              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                <AlertCircle className="h-3 w-3" />
                                <span>Reported</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Review Comment */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-900">
                              Review Comment
                            </h3>
                            <MessageSquare className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                  {review.comment || "No comment provided"}
                                </p>
                                {review.comment &&
                                  review.comment.length > 200 && (
                                    <div className="mt-2 text-xs text-gray-500">
                                      {review.comment.length} characters
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Review Metadata */}
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Review Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Review ID</p>
                              <code className="block text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 truncate font-mono">
                                {review.id}
                              </code>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Status</p>
                              <div className="flex items-center">
                                {isReported ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Reported
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Created</p>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                                <p className="text-sm text-gray-900">
                                  {formatDate(review.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">
                                Last Updated
                              </p>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                                <p className="text-sm text-gray-900">
                                  {formatDate(review.updatedAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Product Information */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-900">
                              Product Reviewed
                            </h3>
                            {productData && (
                              <Package className="h-4 w-4 text-gray-400" />
                            )}
                          </div>

                          {loadingProduct ? (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="animate-pulse space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                              </div>
                            </div>
                          ) : productData ? (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {productData.name}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                                      productData.category
                                    )}`}
                                  >
                                    {productData.category}
                                  </span>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {formatPrice(productData.price)}
                                  </p>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-500">
                                    Product ID
                                  </p>
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                                    {review.itemId}
                                  </code>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-center text-gray-500">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <p className="text-sm">
                                  Product information not available
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column - User & Product Info */}
                      <div className="space-y-6">
                        {/* Reviewer Information */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-900">
                              Reviewer Information
                            </h3>
                            <User className="h-4 w-4 text-gray-400" />
                          </div>

                          {loadingUser ? (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="animate-pulse space-y-3">
                                <div className="flex items-center space-x-3">
                                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                                  <div className="space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                                    <div className="h-2 bg-gray-200 rounded w-16"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : userData ? (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  {userData.profileImageUrl ? (
                                    <img
                                      src={userData.profileImageUrl}
                                      alt="Profile"
                                      className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png";
                                      }}
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-white shadow-sm flex items-center justify-center">
                                      <User className="h-6 w-6 text-blue-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {userData.first_name || "Anonymous"}{" "}
                                    {userData.last_name || "User"}
                                  </p>
                                  {userData.email && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {userData.email}
                                    </p>
                                  )}
                                  {userData.role && (
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                      {userData.role}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                                {userData.location && (
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-500">
                                      Location
                                    </p>
                                    <p className="text-sm text-gray-900">
                                      {userData.location}
                                    </p>
                                  </div>
                                )}
                                {userData.phone && (
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-500">
                                      Phone
                                    </p>
                                    <p className="text-sm text-gray-900">
                                      {userData.phone}
                                    </p>
                                  </div>
                                )}
                                {userData.joinedDate && (
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-500">
                                      Joined
                                    </p>
                                    <p className="text-sm text-gray-900">
                                      {userData.joinedDate}
                                    </p>
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500">
                                    User ID
                                  </p>
                                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded text-gray-700  font-mono">
                                    {review.userId}
                                  </code>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-center text-gray-500">
                                <User className="h-5 w-5 mr-2" />
                                <p className="text-sm">
                                  User information not available
                                </p>
                              </div>
                              <div className="mt-2 text-center">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                                  User ID: {review.userId}
                                </code>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Review Statistics */}
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Review Statistics
                          </h3>
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-indigo-600">
                                  {review.rating}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  Rating Given
                                </p>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                  5
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  Max Rating
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Review Length</span>
                                <span>
                                  {review.comment?.length || 0} characters
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                                <span>Days Active</span>
                                <span>
                                  {Math.floor(
                                    (Date.now() - review.createdAt) /
                                      (1000 * 60 * 60 * 24)
                                  )}{" "}
                                  days
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    {isReported && reportReason && (
                      <div className="mt-6">
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                          <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-medium text-red-800">
                                Review Reported
                              </h4>
                              <p className="text-sm text-red-700 mt-1">
                                Reason: {reportReason}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="flex justify-end items-center gap-4">
                        <div className="flex gap-3">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-[#3f76c4] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            Close
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
