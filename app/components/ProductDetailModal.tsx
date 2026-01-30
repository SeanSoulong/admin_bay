"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Calendar,
  Star,
  Tag,
  Package,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Product } from "../types";
import { getDatabase, ref, get } from "firebase/database";

interface ProductDetailModalProps {
  product: Product;
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
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
}: ProductDetailModalProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

  // Reset image index when product changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setIsFullscreen(false);
  }, [product]);

  useEffect(() => {
    if (product.userId && isOpen) {
      fetchUserData();
    }
  }, [product.userId, isOpen]);

  const fetchUserData = async () => {
    if (!product.userId) return;

    setLoadingUser(true);
    try {
      const db = getDatabase();
      const userRef = ref(db, `users/${product.userId}`);
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

  // Image slider functions
  const nextImage = useCallback(() => {
    if (product.images && product.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === product.images.length - 1 ? 0 : prev + 1
      );
    }
  }, [product.images]);

  const prevImage = useCallback(() => {
    if (product.images && product.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? product.images.length - 1 : prev - 1
      );
    }
  }, [product.images]);

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isFullscreen) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          prevImage();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextImage();
          break;
        case "Escape":
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case " ":
        case "Enter":
          if (!isFullscreen) {
            setIsFullscreen(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, prevImage, nextImage, onClose]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (
      !isOpen ||
      isFullscreen ||
      !product.images ||
      product.images.length <= 1
    )
      return;

    const interval = setInterval(() => {
      nextImage();
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, isFullscreen, product.images, nextImage]);

  const currentImage =
    product.images?.[currentImageIndex] ||
    "https://via.placeholder.com/800x600?text=No+Image";

  if (!isOpen) return null;

  return (
    <>
      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black"
          >
            <div className="relative h-full w-full flex items-center justify-center">
              {/* Close Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <Minimize2 className="h-6 w-6" />
              </button>

              {/* Previous Button */}
              {product.images && product.images.length > 1 && (
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* Next Button */}
              {product.images && product.images.length > 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* Image Counter */}
              {product.images && product.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/50 text-white rounded-full text-sm">
                  {currentImageIndex + 1} / {product.images.length}
                </div>
              )}

              {/* Main Image */}
              <img
                src={currentImage}
                alt={`${product.name} - ${currentImageIndex + 1}`}
                className="max-h-screen max-w-screen object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://via.placeholder.com/800x600?text=No+Image";
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Modal */}
      <AnimatePresence>
        {isOpen && !isFullscreen && (
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
                        Product Details
                      </h2>
                      <p className="text-sm text-gray-500">
                        View complete product information
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="rounded-lg p-2 text-[#4B5563] hover:bg-gray-100 transition-colors"
                      aria-label="Close modal"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column - Image Slider & Basic Info */}
                      <div className="space-y-6">
                        {/* Image Slider */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-900">
                              Product Images ({product.images?.length || 0})
                            </h3>
                            {product.images && product.images.length > 1 && (
                              <div className="text-xs text-gray-500">
                                {currentImageIndex + 1} /{" "}
                                {product.images.length}
                              </div>
                            )}
                          </div>

                          {/* Main Image Container */}
                          <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            {product.images && product.images.length > 0 ? (
                              <>
                                {/* Main Image */}
                                <div
                                  className="relative h-80 w-full"
                                  onTouchStart={handleTouchStart}
                                  onTouchMove={handleTouchMove}
                                  onTouchEnd={handleTouchEnd}
                                >
                                  <img
                                    src={currentImage}
                                    alt={`${product.name} - ${
                                      currentImageIndex + 1
                                    }`}
                                    className="h-full w-full object-contain cursor-pointer"
                                    onClick={() =>
                                      product.images &&
                                      product.images.length > 0 &&
                                      setIsFullscreen(true)
                                    }
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://via.placeholder.com/800x600?text=No+Image";
                                    }}
                                  />

                                  {/* Navigation Arrows */}
                                  {product.images.length > 1 && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          prevImage();
                                        }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors"
                                      >
                                        <ChevronLeft className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          nextImage();
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors"
                                      >
                                        <ChevronRight className="h-5 w-5" />
                                      </button>
                                    </>
                                  )}

                                  {/* Fullscreen Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsFullscreen(true);
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors"
                                    aria-label="View fullscreen"
                                  >
                                    <Maximize2 className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* Thumbnail Strip */}
                                {product.images.length > 1 && (
                                  <div className="p-3 bg-gray-50 border-t border-gray-200">
                                    <div className="flex space-x-2 overflow-x-auto py-1">
                                      {product.images.map((img, index) => (
                                        <button
                                          key={index}
                                          onClick={() => goToImage(index)}
                                          className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                                            currentImageIndex === index
                                              ? "border-blue-500"
                                              : "border-transparent"
                                          }`}
                                        >
                                          <img
                                            src={img}
                                            alt={`Thumbnail ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              (
                                                e.target as HTMLImageElement
                                              ).src =
                                                "https://via.placeholder.com/100x100?text=Thumb";
                                            }}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="h-80 flex flex-col items-center justify-center">
                                <div className="h-48 w-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                                  <p className="text-gray-500">No images</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-gray-900">
                            Product Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Category</p>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                                  product.category
                                )}`}
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {product.category}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Price</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {formatPrice(product.price)}
                              </p>
                            </div>
                            <div className="space-y-1 ">
                              <p className="text-xs text-gray-500">Unit</p>
                              <div className="flex items-center">
                                <Package className="w-4 h-4 text-gray-400 mr-1" />
                                <p className="text-sm text-gray-900">
                                  {product.unit}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Rating</p>
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                                <span className="text-sm font-medium text-gray-900">
                                  {product.rating.toFixed(1)}/5
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  ({product.review_count} reviews)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Details & Posted By */}
                      <div className="space-y-6">
                        {/* Product Description */}
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Description
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-700 whitespace-pre-line">
                              {product.description}
                            </p>
                          </div>
                        </div>

                        {/* Timestamps */}
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Activity
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Created</p>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                                <p className="text-sm text-gray-900">
                                  {formatDate(product.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">
                                Last Updated
                              </p>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                                <p className="text-sm text-gray-900">
                                  {formatDate(product.updatedAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Posted By */}
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Posted By
                          </h3>
                          {loadingUser ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                          ) : userData ? (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  {userData.profileImageUrl ? (
                                    <img
                                      src={userData.profileImageUrl}
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
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {userData.first_name || "Unknown"}{" "}
                                    {userData.last_name || ""}
                                  </p>
                                  {/* {userData.email && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {userData.email}
                                    </p>
                                  )} */}
                                  {userData.role && (
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                      {userData.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
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
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-500" />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    User Not Found
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    User ID: {product.userId?.substring(0, 8)}
                                    ...
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Technical Info */}
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Technical Information
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500">
                                  Product ID
                                </p>
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 truncate leading-tight block font-mono">
                                  {product.id}
                                </code>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500">User ID</p>
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 truncate leading-tight block font-mono">
                                  {product.userId || "N/A"}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="flex justify-end">
                        <button
                          onClick={onClose}
                          className="inline-flex items-center px-4 py-2 border bg-[#3f76c4] border-gray-300 shadow-sm text-sm font-medium rounded-full text-white hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          Close
                        </button>
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
