"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2, XCircle, Save, Loader2 } from "lucide-react";
import { Product } from "../types";
import { databaseService, storage } from "../lib/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

interface ProductEditModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Product>) => Promise<void>;
}

const CATEGORIES = [
  { value: "ផ្លែឈើ", label: "ផ្លែឈើ (Fruits)" },
  { value: "បន្លែ", label: "បន្លែ (Vegetables)" },
  { value: "ផ្សេងៗ", label: "ផ្សេងៗ (Others)" },
  { value: "សម្ភារៈ", label: "សម្ភារៈ (Materials)" },
] as const;

export default function ProductEditModal({
  product,
  isOpen,
  onClose,
  onSave,
}: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "ផ្សេងៗ",
    price: "",
    description: "",
    unit: "",
  });

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [localImages, setLocalImages] = useState<
    Array<{
      id: string;
      file: File;
      previewUrl: string;
      uploadProgress?: number;
    }>
  >([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [uploadTasks, setUploadTasks] = useState<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array<{ id: string; task: any }>
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Initialize form when modal opens
  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name || "",
        category: product.category || "ផ្សេងៗ",
        price:
          typeof product.price === "number"
            ? product.price.toString()
            : product.price || "",
        description: product.description || "",
        unit: product.unit || "",
      });

      // Set existing images from product
      const productImages = Array.isArray(product.images)
        ? product.images.filter((img) => img && img.trim() !== "")
        : [];
      setExistingImages(productImages);

      // Clean up local images and reset state
      localImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setLocalImages([]);
      setImagesToDelete([]);
      setError(null);
      setUploading(false);
      setUploadProgress(0);

      // Cancel any ongoing uploads
      uploadTasks.forEach(({ task }) => {
        if (task && task.cancel) {
          task.cancel();
        }
      });
      setUploadTasks([]);
    }
  }, [product, isOpen]);

  // Upload image to Firebase Storage with progress tracking
  const uploadImageToFirebase = async (
    file: File,
    imageId: string,
    folder: string = "marketplace"
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split(".").pop();
        const fileName = `${timestamp}_${randomString}.${fileExtension}`;

        // Create storage reference with full path
        const storageRef = ref(storage, `${folder}/${fileName}`);

        // Start upload
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Store the task reference for potential cancellation
        setUploadTasks((prev) => [...prev, { id: imageId, task: uploadTask }]);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            // Calculate upload progress for this specific file
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

            // Update progress for this specific image
            setLocalImages((prev) =>
              prev.map((img) =>
                img.id === imageId
                  ? { ...img, uploadProgress: Math.round(progress) }
                  : img
              )
            );
          },
          (error) => {
            console.error("Upload error:", error);
            setUploadTasks((prev) =>
              prev.filter((task) => task.id !== imageId)
            );
            reject(new Error(`Failed to upload ${file.name}`));
          },
          async () => {
            try {
              // Get download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setUploadTasks((prev) =>
                prev.filter((task) => task.id !== imageId)
              );
              resolve(downloadURL);
            } catch (error) {
              setUploadTasks((prev) =>
                prev.filter((task) => task.id !== imageId)
              );
              reject(error);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  };

  // Delete image from Firebase Storage
  const deleteImageFromFirebase = async (url: string): Promise<void> => {
    try {
      // Extract the path from the URL
      const decodedUrl = decodeURIComponent(url);
      const urlObj = new URL(decodedUrl);

      // Get the path after /o/ which is the actual storage path
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
      if (pathMatch) {
        const filePath = pathMatch[1].replace(/%2F/g, "/");
        const imageRef = ref(storage, filePath);
        await deleteObject(imageRef);
        console.log("Image deleted successfully:", filePath);
      } else {
        // Try to extract path directly if it's a different format
        const altMatch = url.match(/marketplace\/([^?]+)/);
        if (altMatch) {
          const filePath = `marketplace/${altMatch[1]}`;
          const imageRef = ref(storage, filePath);
          await deleteObject(imageRef);
        } else {
          console.warn("Could not extract path from URL:", url);
          // Don't throw error, just proceed
        }
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      // Don't throw error, just log it and proceed
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const totalImages =
      localImages.length + existingImages.length - imagesToDelete.length;

    if (totalImages + files.length > 5) {
      setError(`You can only upload ${5 - totalImages} more images`);
      return;
    }

    const newImages: Array<{
      id: string;
      file: File;
      previewUrl: string;
      uploadProgress?: number;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/jpg",
      ];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        setError(
          `${file.name} is not a valid image file. Please upload JPEG, PNG, WebP, or GIF files.`
        );
        continue;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`${file.name} is too large. Maximum file size is 5MB.`);
        continue;
      }

      const objectUrl = URL.createObjectURL(file);
      newImages.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: objectUrl,
        uploadProgress: 0,
      });
    }

    if (newImages.length > 0) {
      setLocalImages((prev) => [...prev, ...newImages]);
      setError(null);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const markImageForDeletion = (url: string) => {
    if (imagesToDelete.includes(url)) {
      setImagesToDelete((prev) => prev.filter((u) => u !== url));
    } else {
      setImagesToDelete((prev) => [...prev, url]);
    }
  };

  const removeLocalImage = (id: string) => {
    // Cancel the upload task if it exists
    const uploadTask = uploadTasks.find((task) => task.id === id);
    if (uploadTask && uploadTask.task && uploadTask.task.cancel) {
      uploadTask.task.cancel();
    }

    setUploadTasks((prev) => prev.filter((task) => task.id !== id));
    setLocalImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    // Special handling for price
    if (name === "price") {
      const cleanedValue = value.replace(/[^\d.]/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: cleanedValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (error) {
      setError(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      setError("Product name is required");
      return false;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      setError("Valid price is required");
      return false;
    }

    if (!formData.description?.trim()) {
      setError("Description is required");
      return false;
    }

    if (!formData.unit?.trim()) {
      setError("Unit is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload new images to Firebase Storage
      const uploadedUrls: string[] = [];
      const uploadPromises = localImages.map(async (localImage) => {
        try {
          const uploadedUrl = await uploadImageToFirebase(
            localImage.file,
            localImage.id
          );
          uploadedUrls.push(uploadedUrl);
        } catch (error) {
          console.error(`Failed to upload ${localImage.file.name}:`, error);
          throw new Error(`Failed to upload ${localImage.file.name}`);
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // 2. Delete marked images from Firebase Storage
      if (imagesToDelete.length > 0) {
        const deletePromises = imagesToDelete.map(async (url) => {
          await deleteImageFromFirebase(url);
        });

        await Promise.all(deletePromises);
      }

      // 3. Combine existing and new images
      const remainingExistingImages = existingImages.filter(
        (url) => !imagesToDelete.includes(url)
      );
      const allImageUrls = [...remainingExistingImages, ...uploadedUrls];

      // 4. Prepare updates for the product
      const updates: Partial<Product> = {
        name: formData.name.trim(),
        category: formData.category,
        price: formData.price,
        description: formData.description.trim(),
        unit: formData.unit.trim(),
        images: allImageUrls,
        updatedAt: Date.now(),
      };

      console.log("Saving updates for product:", product.id, updates);

      // 5. Update the product in Firebase Database
      await onSave(product.id, updates);

      handleClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save product. Please try again.");
    } finally {
      setIsLoading(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    // Cancel any ongoing uploads
    uploadTasks.forEach(({ task }) => {
      if (task && task.cancel) {
        task.cancel();
      }
    });

    // Clean up local images
    localImages.forEach((img) => {
      URL.revokeObjectURL(img.previewUrl);
    });

    // Reset all state
    setFormData({
      name: "",
      category: "ផ្សេងៗ",
      price: "",
      description: "",
      unit: "",
    });
    setExistingImages([]);
    setLocalImages([]);
    setImagesToDelete([]);
    setError(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadTasks([]);
    onClose();
  };

  const totalImages =
    localImages.length + existingImages.length - imagesToDelete.length;
  const canAddMoreImages = totalImages < 5;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Fixed container with proper positioning */}
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              ref={modalRef}
              className="my-8 w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      Edit Product
                    </h2>
                    <p className="text-sm text-zinc-500">
                      Update product details
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="rounded-lg p-2 hover:bg-zinc-100"
                    disabled={isLoading || uploading}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="max-h-[calc(100vh-200px)] overflow-y-auto p-6"
                >
                  {error && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-800">
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-900">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          name="name"
                          disabled={uploading}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                          placeholder="Enter product name"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-900">
                          Category *
                        </label>
                        <select
                          required
                          value={formData.category}
                          onChange={handleChange}
                          name="category"
                          disabled={uploading}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-900">
                        Description *
                      </label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={handleChange}
                        name="description"
                        disabled={uploading}
                        rows={3}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                        placeholder="Describe the product..."
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-900">
                          Price (៛) *
                        </label>
                        <input
                          type="text"
                          value={formData.price}
                          onChange={handleChange}
                          name="price"
                          inputMode="numeric"
                          disabled={uploading}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                          placeholder="Enter price"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-900">
                          Unit *
                        </label>
                        <input
                          type="text"
                          value={formData.unit}
                          onChange={handleChange}
                          name="unit"
                          disabled={uploading}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                          placeholder="e.g., ១ គីឡូក្រាម, 1kg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-900">
                        Product Images (Max 5)
                      </label>
                      <div className="space-y-3">
                        {existingImages.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center justify-between text-sm font-medium text-zinc-700">
                              <span>
                                Existing Images ({existingImages.length})
                              </span>
                              <span className="text-xs text-zinc-500">
                                Click to mark for deletion
                              </span>
                            </div>
                            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                              {existingImages.map((url, index) => {
                                const isMarkedForDeletion =
                                  imagesToDelete.includes(url);
                                return (
                                  <div
                                    key={index}
                                    className={`relative overflow-hidden rounded-lg border-2 ${
                                      isMarkedForDeletion
                                        ? "border-rose-500 opacity-60"
                                        : "border-zinc-200"
                                    }`}
                                  >
                                    <img
                                      src={url}
                                      alt={`Existing ${index + 1}`}
                                      width={80}
                                      height={80}
                                      className="h-20 w-full cursor-pointer object-cover"
                                      onClick={() => markImageForDeletion(url)}
                                    />
                                    {isMarkedForDeletion && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-rose-500/20">
                                        <XCircle className="h-6 w-6 text-rose-500" />
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => markImageForDeletion(url)}
                                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-rose-500 hover:bg-white"
                                    >
                                      {isMarkedForDeletion ? (
                                        <svg
                                          className="h-3 w-3"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-10 10a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L6 14.586l9.293-9.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            {imagesToDelete.length > 0 && (
                              <div className="mb-2 text-xs text-rose-600">
                                {imagesToDelete.length} image(s) marked for
                                deletion
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-700">
                            Upload new images (JPEG, PNG, WebP, GIF - Max 5MB)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept="image/jpeg,image/png,image/webp,image/gif,image/jpg"
                              onChange={handleFileUpload}
                              className="hidden"
                              disabled={!canAddMoreImages || uploading}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={!canAddMoreImages || uploading}
                              className={`flex-1 cursor-pointer rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center text-sm transition hover:bg-zinc-50 ${
                                !canAddMoreImages || uploading
                                  ? "cursor-not-allowed opacity-50"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <Upload className="h-4 w-4" />
                                Choose Files
                              </div>
                            </button>
                            <div className="text-xs font-medium text-zinc-500">
                              {totalImages}/5
                            </div>
                          </div>
                        </div>

                        {uploading && (
                          <div className="mt-4 space-y-2">
                            <div className="mb-2 flex justify-between text-sm">
                              <span className="font-medium text-indigo-600">
                                Uploading images to Firebase Storage...
                              </span>
                              <span>
                                {Math.round(
                                  localImages.reduce(
                                    (sum, img) =>
                                      sum + (img.uploadProgress || 0),
                                    0
                                  ) / (localImages.length || 1)
                                )}
                                %
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                              <div
                                className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                                style={{
                                  width: `${Math.round(
                                    localImages.reduce(
                                      (sum, img) =>
                                        sum + (img.uploadProgress || 0),
                                      0
                                    ) / (localImages.length || 1)
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {localImages.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-zinc-500">
                              New images to upload ({localImages.length})
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                              {localImages.map((img) => (
                                <div
                                  key={img.id}
                                  className="relative overflow-hidden rounded-lg border border-zinc-200"
                                >
                                  <img
                                    src={img.previewUrl}
                                    alt="Preview"
                                    width={80}
                                    height={80}
                                    className="h-20 w-full object-cover"
                                  />
                                  {img.uploadProgress &&
                                    img.uploadProgress > 0 &&
                                    img.uploadProgress < 100 && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <span className="text-xs font-medium text-white">
                                          {img.uploadProgress}%
                                        </span>
                                      </div>
                                    )}
                                  <button
                                    type="button"
                                    onClick={() => removeLocalImage(img.id)}
                                    disabled={uploading}
                                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-rose-500 hover:bg-white disabled:opacity-50"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading || uploading}
                      className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 sm:order-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || uploading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading to Firebase...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {isLoading ? "Saving..." : "Update Product"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
