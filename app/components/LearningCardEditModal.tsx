"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Upload, Loader2 } from "lucide-react";
import { LearningCard } from "../types";
import { uploadImage } from "../lib/storage";

interface LearningCardEditModalProps {
  card?: LearningCard;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    uuid: string,
    updates: Partial<LearningCard>
  ) =>
    | Promise<void>
    | ((cardData: Omit<LearningCard, "uuid">) => Promise<LearningCard>);
  isCreateMode?: boolean;
}

type UpdateHandler = (
  uuid: string,
  updates: Partial<LearningCard>
) => Promise<void>;
type CreateHandler = (
  cardData: Omit<LearningCard, "uuid">
) => Promise<LearningCard>;

const CATEGORIES = [
  "ដីនិងជីកំប៉ុស",
  "ការរៀបចំផែនការកសិកម្ម",
  "ការត្រួតពិនិត្យសត្វល្អិតធម្មជាតិ",
  "គ្រាប់ពូជនិងផែនការ",
  "ការគ្រប់គ្រងទឹក",
  "ឧបករណ៍និងឧបករណ៍ផ្សេងៗ",
] as const;

export default function LearningCardEditModal({
  card,
  isOpen,
  onClose,
  onSave,
  isCreateMode = false,
}: LearningCardEditModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: "ដីនិងជីកំប៉ុស",
    author: "",
    date: new Date().toISOString().split("T")[0],
    imageUrl: "",
    readTime: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (card && isOpen && !isCreateMode) {
      setFormData({
        title: card.title || "",
        description: card.description || "",
        content: card.content || "",
        category: card.category || "ដីនិងជីកំប៉ុស",
        author: card.author || "",
        date: card.date || new Date().toISOString().split("T")[0],
        imageUrl: card.imageUrl || "",
        readTime: card.readTime || "",
      });
      setImagePreview(card.imageUrl || "");
    } else if (isOpen) {
      setFormData({
        title: "",
        description: "",
        content: "",
        category: "ដីនិងជីកំប៉ុស",
        author: "",
        date: new Date().toISOString().split("T")[0],
        imageUrl: "",
        readTime: "",
      });
      setImagePreview("");
      setImageFile(null);
    }
    setError(null);
    setUploadProgress(0);
  }, [card, isOpen, isCreateMode]);

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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/jpg",
    ];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError("Please upload a valid image file (JPEG, PNG, WebP, GIF)");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image size should be less than 10MB");
      return;
    }

    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    if (error) setError(null);
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      uploadImage(file, "learninghub", (progress) => {
        setUploadProgress(progress);
      })
        .then(resolve)
        .catch(reject);
    });
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Title is required");
      return false;
    }

    if (!formData.description.trim()) {
      setError("Description is required");
      return false;
    }

    if (!formData.content.trim()) {
      setError("Content is required");
      return false;
    }

    if (!formData.author.trim()) {
      setError("Author is required");
      return false;
    }

    if (!formData.imageUrl.trim() && !imageFile) {
      setError("Image is required");
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

    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        imageUrl = await uploadImageToStorage(imageFile);
      }

      const cardData = {
        ...formData,
        imageUrl,
        isSaved: false,
        createdAt: isCreateMode
          ? new Date().toISOString()
          : card?.createdAt || new Date().toISOString(),
      };

      if (isCreateMode) {
        const createHandler = onSave as unknown as CreateHandler;
        await createHandler(cardData);
      } else {
        const updateHandler = onSave as UpdateHandler;
        await updateHandler(card!.uuid, cardData);
      }

      handleClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save card. Please try again.");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setFormData({
      title: "",
      description: "",
      content: "",
      category: "ដីនិងជីកំប៉ុស",
      author: "",
      date: new Date().toISOString().split("T")[0],
      imageUrl: "",
      readTime: "",
    });
    setImageFile(null);
    setImagePreview("");
    setError(null);
    setUploadProgress(0);
    onClose();
  };

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    setFormData((prev) => ({ ...prev, readTime: minutes.toString() }));
  };

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

          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              ref={modalRef}
              className="my-8 w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="
                mx-auto overflow-hidden 
                rounded-lg border border-[#EBECF0] bg-white 
                shadow-lg font-[Kantumruy_Pro]
              "
              >
                {/* HEADER */}
                <div
                  className="
                  flex items-center justify-between 
                  border-b border-[#EBECF0] 
                  px-6 py-4 bg-white
                "
                >
                  <div>
                    <h2
                      className="
                      text-[#0D1B2A] font-medium 
                      text-[15px] sm:text-[16px] md:text-[18px]
                    "
                    >
                      {isCreateMode
                        ? "Create New Learning Card"
                        : "Edit Learning Card"}
                    </h2>
                    <p
                      className="
                      text-[#4B5563] 
                      text-[11px] sm:text-[12px] md:text-sm 
                      mt-1
                    "
                    >
                      {isCreateMode
                        ? "Add new educational content to the learning hub"
                        : "Update card details and content"}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="
                      rounded-lg p-2 
                      hover:bg-[#F3F4F6] 
                      transition-colors
                      disabled:opacity-50
                    "
                    disabled={isLoading}
                  >
                    <X className="h-5 w-5 text-[#4B5563]" />
                  </button>
                </div>

                {/* FORM CONTENT */}
                <form
                  onSubmit={handleSubmit}
                  className="max-h-[calc(100vh-200px)] overflow-y-auto p-6"
                >
                  {error && (
                    <div
                      className="
                      mb-6 rounded-lg 
                      border border-red-200 bg-red-50 
                      p-4 text-sm
                    "
                    >
                      <div className="flex items-center">
                        <svg
                          className="h-5 w-5 text-red-400 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-[#991B1B]">{error}</p>
                      </div>
                    </div>
                  )}

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mb-6">
                      <div
                        className="
                        flex justify-between text-sm mb-2 
                        text-[#0E4123]
                      "
                      >
                        <span className="font-medium">Uploading image...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div
                        className="
                        h-2 w-full 
                        bg-[#E5E7EB] 
                        rounded-full overflow-hidden
                      "
                      >
                        <div
                          className="
                            h-full bg-[#0E4123] 
                            transition-all duration-300
                          "
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT COLUMN */}
                    <div className="space-y-4">
                      {/* Title */}
                      <div>
                        <label
                          className="
                          block text-[#0D1B2A] 
                          text-[13px] sm:text-[14px] font-medium mb-2
                        "
                        >
                          Title
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={handleChange}
                          name="title"
                          disabled={isLoading}
                          className="text-[#0D1B2A]
                            w-full rounded-lg 
                            border border-[#D1D5DB] 
                            bg-white 
                            px-4 py-3 
                            text-[13px] sm:text-[14px]
                            transition 
                            focus:border-[#0E4123] 
                            focus:ring-2 focus:ring-[#0E4123]/20 
                            disabled:opacity-50
                          "
                          placeholder="Enter card title"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label
                          className="
                          block text-[#0D1B2A] 
                          text-[13px] sm:text-[14px] font-medium mb-2
                        "
                        >
                          Category
                        </label>
                        <select
                          required
                          value={formData.category}
                          onChange={handleChange}
                          name="category"
                          disabled={isLoading}
                          className="
                          text-[#0D1B2A]
                            w-full rounded-lg 
                            border border-[#D1D5DB] 
                            bg-white 
                            px-4 py-3 
                            text-[13px] sm:text-[14px]
                            transition 
                            focus:border-[#0E4123] 
                            focus:ring-2 focus:ring-[#0E4123]/20 
                            disabled:opacity-50
                          "
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div>
                        <label
                          className="
                          block text-[#0D1B2A] 
                          text-[13px] sm:text-[14px] font-medium mb-2
                        "
                        >
                          Description
                        </label>
                        <textarea
                          required
                          value={formData.description}
                          onChange={handleChange}
                          name="description"
                          disabled={isLoading}
                          rows={3}
                          className="
                          text-[#0D1B2A]
                            w-full rounded-lg 
                            border border-[#D1D5DB] 
                            bg-white 
                            px-4 py-3 
                            text-[13px] sm:text-[14px]
                            transition 
                            focus:border-[#0E4123] 
                            focus:ring-2 focus:ring-[#0E4123]/20 
                            disabled:opacity-50
                            resize-none
                          "
                          placeholder="Brief description of the content"
                        />
                      </div>

                      {/* Author */}
                      <div>
                        <label
                          className="
                          block text-[#0D1B2A] 
                          text-[13px] sm:text-[14px] font-medium mb-2
                        "
                        >
                          Author
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.author}
                          onChange={handleChange}
                          name="author"
                          disabled={isLoading}
                          className="
                          text-[#0D1B2A]
                            w-full rounded-lg 
                            border border-[#D1D5DB] 
                            bg-white 
                            px-4 py-3 
                            text-[13px] sm:text-[14px]
                            transition 
                            focus:border-[#0E4123] 
                            focus:ring-2 focus:ring-[#0E4123]/20 
                            disabled:opacity-50
                          "
                          placeholder="e.g., និពន្ធដោយ: ឈ្មោះ"
                        />
                      </div>

                      {/* Date & Read Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label
                            className="
                            block text-[#0D1B2A] 
                            text-[13px] sm:text-[14px] font-medium mb-2
                          "
                          >
                            Date
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={handleChange}
                            name="date"
                            disabled={isLoading}
                            className="text-[#0D1B2A]
                              w-full rounded-lg 
                              border border-[#D1D5DB] 
                              bg-white 
                              px-4 py-3 
                              text-[13px] sm:text-[14px]
                              transition 
                              focus:border-[#0E4123] 
                              focus:ring-2 focus:ring-[#0E4123]/20 
                              disabled:opacity-50
                            "
                          />
                        </div>

                        <div>
                          <label
                            className="
                            block text-[#0D1B2A] 
                            text-[13px] sm:text-[14px] font-medium mb-2
                          "
                          >
                            Read Time (នាទី)
                          </label>
                          <input
                            type="number"
                            value={formData.readTime}
                            onChange={handleChange}
                            name="readTime"
                            disabled={isLoading}
                            className="
                              w-full rounded-lg 
                              border border-[#D1D5DB] 
                              bg-white 
                              px-4 py-3 
                            text-[#0D1B2A]
                              text-[13px] sm:text-[14px]
                              transition 
                              focus:border-[#0E4123] 
                              focus:ring-2 focus:ring-[#0E4123]/20 
                              disabled:opacity-50
                            "
                            placeholder="Auto-calculated"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-4">
                      {/* Image Upload */}
                      <div>
                        <label
                          className="
                          block text-[#0D1B2A] 
                          text-[13px] sm:text-[14px] font-medium mb-2
                        "
                        >
                          Featured Image
                        </label>
                        <div className="space-y-4">
                          {(imagePreview || formData.imageUrl) && (
                            <div
                              className="
                              relative rounded-lg 
                              overflow-hidden border border-[#D1D5DB]
                            "
                            >
                              <img
                                src={imagePreview || formData.imageUrl}
                                alt="Preview"
                                className="
                                  w-full h-48 object-cover
                                "
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://via.placeholder.com/400x200?text=No+Image";
                                }}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-center ">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif,image/jpg"
                              onChange={handleImageChange}
                              className="hidden"
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isLoading}
                              className="text-[#0D1B2A]
                                inline-flex items-center gap-2 
                                px-4 py-2.5 
                                border border-[#D1D5DB] 
                                rounded-lg 
                                hover:bg-[#F9FAFB] 
                                transition-colors 
                                disabled:opacity-50
                                text-[13px] sm:text-[14px]
                              "
                            >
                              <Upload className="h-4 w-4" />
                              Upload Image
                            </button>

                            {/* <div
                              className="
                              text-[12px] sm:text-[13px] 
                              text-[#4B5563] flex-1
                            "
                            >
                              <div className="font-medium mb-1">Image URL:</div>
                              <input
                                type="text"
                                value={formData.imageUrl}
                                onChange={handleChange}
                                name="imageUrl"
                                disabled={isLoading}
                                className="
                                  w-full rounded-lg 
                                  border border-[#D1D5DB] 
                                  bg-white 
                                  px-3 py-2 
                                  text-[12px]
                                  transition 
                                  focus:border-[#0E4123] 
                                  focus:ring-2 focus:ring-[#0E4123]/20 
                                  disabled:opacity-50
                                "
                                placeholder="Or enter image URL"
                              />
                            </div> */}
                          </div>

                          <p
                            className="
                            text-[11px] sm:text-[12px] 
                            text-[#6B7280]
                          "
                          >
                            Upload a high-quality image (JPEG, PNG, WebP, GIF)
                            or enter image URL. Max 10MB.
                          </p>
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label
                            className="
                            block text-[#0D1B2A] 
                            text-[13px] sm:text-[14px] font-medium
                          "
                          >
                            Content
                          </label>
                          <button
                            type="button"
                            onClick={() => calculateReadTime(formData.content)}
                            className="
                              text-[12px] 
                              
                              text-[#0E4123] 
                              hover:text-[#0A2F1C] 
                              font-medium
                              disabled:opacity-50
                            "
                            disabled={isLoading}
                          >
                            Calculate Read Time
                          </button>
                        </div>
                        <textarea
                          required
                          value={formData.content}
                          onChange={handleChange}
                          name="content"
                          disabled={isLoading}
                          rows={8}
                          className="
                          text-[#0D1B2A] 
                            w-full rounded-lg 
                            border border-[#D1D5DB] 
                            bg-white 
                            px-4 py-3 
                            text-[13px] sm:text-[14px]
                            transition 
                            focus:border-[#0E4123] 
                            focus:ring-2 focus:ring-[#0E4123]/20 
                            disabled:opacity-50
                            font-mono
                            resize-none
                          "
                          placeholder="Enter detailed content here..."
                        />
                        <div
                          className="
                          mt-2 text-[11px] sm:text-[12px] 
                          text-[#6B7280]
                        "
                        >
                          Word count:{" "}
                          <span className="font-medium">
                            {formData.content.trim().split(/\s+/).length}
                          </span>{" "}
                          words
                          {formData.readTime && (
                            <>
                              {" • "}
                              Estimated read time:{" "}
                              <span className="font-medium">
                                {formData.readTime}
                              </span>{" "}
                              minutes
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div
                    className="
                    mt-8 pt-6 border-t border-[#EBECF0] 
                    flex flex-col sm:flex-row gap-3 
                    sm:items-center sm:justify-end
                  "
                  >
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="
                        px-6 py-3 
                        border border-[#D1D5DB] 
                        bg-white 
                        text-[#0D1B2A] font-medium 
                        rounded-lg 
                        hover:bg-[#F9FAFB] 
                        transition-colors 
                        disabled:opacity-50
                        text-[13px] sm:text-[14px]
                      "
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="
                        inline-flex items-center justify-center gap-2 
                        px-6 py-3 
                        bg-[#0E4123] 
                        text-white font-medium 
                        rounded-lg 
                        hover:bg-[#0A2F1C] 
                        transition-colors 
                        disabled:opacity-50
                        shadow-sm
                        text-[13px] sm:text-[14px]
                      "
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {uploadProgress > 0 ? "Uploading..." : "Saving..."}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {isCreateMode ? "Create Card" : "Update Card"}
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
