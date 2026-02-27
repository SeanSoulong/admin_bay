"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Send, Trash2 } from "lucide-react";
import { Product } from "../types";

interface ProductWarningModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSendWarning: (productId: string, reason: string) => Promise<void>;

  // ✅ NEW
  initialReason?: string;
  mode?: "warn" | "edit";

  // ✅ NEW: delete warning feature
  onDeleteWarning?: (productId: string) => Promise<void>;
  canDeleteWarning?: boolean;

  // ✅ NEW: allow parent to disable UI while saving/deleting
  isBusy?: boolean;
}

export default function ProductWarningModal({
  product,
  isOpen,
  onClose,
  onSendWarning,
  initialReason = "",
  mode = "warn",
  onDeleteWarning,
  canDeleteWarning = false,
  isBusy = false,
}: ProductWarningModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  // ✅ Prefill on open (this fixes “can’t see previous text”)
  useEffect(() => {
    if (isOpen) {
      setReason(initialReason || "");
      setError("");
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  }, [isOpen, initialReason, product?.id]);

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

  const busy = isBusy || isSubmitting || isDeleting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError("Please provide a reason for the warning");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onSendWarning(product.id, reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      setError("Failed to send warning. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWarning = async () => {
    if (!onDeleteWarning) return;

    const ok = window.confirm("Are you sure you want to delete this warning?");
    if (!ok) return;

    setIsDeleting(true);
    setError("");

    try {
      await onDeleteWarning(product.id);
      onClose();
    } catch (err) {
      setError("Failed to delete warning. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!busy) onClose();
            }}
          />

          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 ">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      {mode === "edit" ? "Edit Warning" : "Send Warning"}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      if (!busy) onClose();
                    }}
                    className="rounded-lg p-2 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 "
                    disabled={busy}
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5 text-[#4B5563]" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  {/* Product Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Product ID: {product.id}
                    </p>
                    <p className="text-xs text-gray-500">
                      User ID: {product.userId}
                    </p>
                  </div>

                  {/* Warning Reason */}
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Warning Reason
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why this product is being warned..."
                      className=" text-[#0D1B2A]
                            w-full rounded-lg 
                            border border-[#D1D5DB] 
                            bg-white 
                            px-4 py-3 
                            text-[13px] sm:text-[14px]
                            transition 
                            focus:border-[#0A817F] 
                            focus:ring-2 focus:ring-[#0A817F]/20 
                            disabled:opacity-50
                            resize-none"
                      rows={4}
                      disabled={busy}
                      required
                    />
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-xs text-red-600"
                      >
                        {error}
                      </motion.p>
                    )}
                  </div>

                  {/* Warning Info */}
                  <div className="mb-6 p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-800">
                      <span className="font-medium">Note:</span> This product
                      will be hidden from the marketplace immediately. The user
                      will have 7 days to correct the issue. If not resolved
                      within 7 days, the product will be automatically deleted.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    {/* Delete Warning (only for edit mode) */}
                    {canDeleteWarning && onDeleteWarning ? (
                      <button
                        type="button"
                        onClick={handleDeleteWarning}
                        disabled={busy}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? (
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
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Warning
                          </>
                        )}
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!busy) onClose();
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50"
                        disabled={busy}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={busy || !reason.trim()}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-full hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
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
                            Saving...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            {mode === "edit" ? "Update " : "Send"}
                          </>
                        )}
                      </button>
                    </div>
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
