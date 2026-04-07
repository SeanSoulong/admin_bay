// components/UserWarningModal.tsx

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  Send,
  Clock,
  Ban,
  CheckCircle,
  User as UserIcon,
} from "lucide-react";
import { User } from "../../types";

interface UserWarningModalProps {
  user: User & { action?: "warn" | "suspend" | "ban" | "reinstate" };
  isOpen: boolean;
  onClose: () => void;
  onSendWarning: (userId: string, reason: string) => Promise<void>;
  onSuspendUser: (
    userId: string,
    reason: string,
    days: number
  ) => Promise<void>;
  onBanUser: (userId: string, reason: string) => Promise<void>;
  onReinstateUser?: (userId: string) => Promise<void>;
  isBusy?: boolean;
}

type ActionType = "warn" | "suspend" | "ban" | "reinstate";

export default function UserWarningModal({
  user,
  isOpen,
  onClose,
  onSendWarning,
  onSuspendUser,
  onBanUser,
  onReinstateUser,
  isBusy = false,
}: UserWarningModalProps) {
  const [action, setAction] = useState<ActionType>(user.action || "warn");
  const [reason, setReason] = useState("");
  const [suspendDays, setSuspendDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
      setIsSubmitting(false);

      if (!user.action) {
        if (user.moderation?.status === "suspended") {
          setAction("reinstate");
        } else if (user.moderation?.status === "banned") {
          setAction("reinstate");
        } else if (user.moderation?.status === "warned") {
          setAction("warn");
        } else {
          setAction("warn");
        }
      } else {
        setAction(user.action);
      }
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (action !== "reinstate" && !reason.trim()) {
      setError(`Please provide a reason for the ${action}`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (action === "warn") {
        await onSendWarning(user.userId, reason.trim());
      } else if (action === "suspend") {
        await onSuspendUser(user.userId, reason.trim(), suspendDays);
      } else if (action === "ban") {
        await onBanUser(user.userId, reason.trim());
      } else if (action === "reinstate" && onReinstateUser) {
        await onReinstateUser(user.userId);
      }
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError(`Failed to ${action} user. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isBusy || isSubmitting;

  const getActionIcon = () => {
    switch (action) {
      case "warn":
        return AlertTriangle;
      case "suspend":
        return Clock;
      case "ban":
        return Ban;
      case "reinstate":
        return CheckCircle;
      default:
        return AlertTriangle;
    }
  };

  const getActionColor = () => {
    switch (action) {
      case "warn":
        return "yellow";
      case "suspend":
        return "orange";
      case "ban":
        return "red";
      case "reinstate":
        return "green";
      default:
        return "yellow";
    }
  };

  const ActionIcon = getActionIcon();
  const color = getActionColor();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10000 bg-black/50 backdrop-blur-sm"
            onClick={() => !busy && onClose()}
          />

          <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 bg-${color}-100 rounded-full`}>
                      <ActionIcon className={`h-5 w-5 text-${color}-600`} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {action === "warn" && "Send Warning"}
                      {action === "suspend" && "Suspend User"}
                      {action === "ban" && "Ban User"}
                      {action === "reinstate" && "Reinstate User"}
                    </h2>
                  </div>
                  <button
                    onClick={() => !busy && onClose()}
                    className="rounded-lg p-2 hover:bg-gray-100 transition-all duration-200"
                    disabled={busy}
                  >
                    <X className="h-5 w-5 text-[#4B5563]" />
                  </button>
                </div>

                {/* Action Selection */}
                <div className="px-6 pt-4">
                  <div className="flex space-x-2">
                    {user.moderation?.status !== "banned" &&
                      user.moderation?.status !== "suspended" && (
                        <>
                          <button
                            onClick={() => setAction("warn")}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              action === "warn"
                                ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-300"
                                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            Warn
                          </button>
                          <button
                            onClick={() => setAction("suspend")}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              action === "suspend"
                                ? "bg-orange-100 text-orange-800 border-2 border-orange-300"
                                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() => setAction("ban")}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              action === "ban"
                                ? "bg-red-100 text-red-800 border-2 border-red-300"
                                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            Ban
                          </button>
                        </>
                      )}
                    {(user.moderation?.status === "suspended" ||
                      user.moderation?.status === "banned" ||
                      user.moderation?.status === "warned") && (
                      <button
                        onClick={() => setAction("reinstate")}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          action === "reinstate"
                            ? "bg-green-100 text-green-800 border-2 border-green-300"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Reinstate
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  {/* User Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="shrink-0">
                        {user.profileImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.profileImageUrl}
                            alt="Profile"
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png";
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.email} • {user.role || "User"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reason Input */}
                  {action !== "reinstate" && (
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        {action === "warn" && "Warning Reason"}
                        {action === "suspend" && "Suspension Reason"}
                        {action === "ban" && "Ban Reason"}
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={`Explain why this user is being ${action}ed...`}
                        className="w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[13px] sm:text-[14px] transition focus:border-[#0A817F] focus:ring-2 focus:ring-[#0A817F]/20 disabled:opacity-50 resize-none"
                        rows={4}
                        disabled={busy}
                        required
                      />
                    </div>
                  )}

                  {/* Suspension Days */}
                  {action === "suspend" && (
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Suspension Duration (days)
                      </label>
                      <select
                        value={suspendDays}
                        onChange={(e) => setSuspendDays(Number(e.target.value))}
                        className="w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-sm transition focus:border-[#0A817F] focus:ring-2 focus:ring-[#0A817F]/20"
                        disabled={busy}
                      >
                        <option value={1}>1 day</option>
                        <option value={3}>3 days</option>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                      </select>
                    </div>
                  )}

                  {/* Info Notes */}
                  {action === "warn" && (
                    <div className="mb-6 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        <span className="font-medium">Note:</span> The user will
                        be warned. Multiple warnings may lead to suspension.
                      </p>
                    </div>
                  )}

                  {action === "suspend" && (
                    <div className="mb-6 p-3 bg-orange-50 rounded-lg">
                      <p className="text-xs text-orange-800">
                        <span className="font-medium">Note:</span> The user will
                        be unable to access their account for the specified
                        duration.
                      </p>
                    </div>
                  )}

                  {action === "ban" && (
                    <div className="mb-6 p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-800">
                        <span className="font-medium">Warning:</span> This
                        action is permanent and cannot be undone.
                      </p>
                    </div>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 text-xs text-red-600"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => !busy && onClose()}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50"
                      disabled={busy}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        busy || (action !== "reinstate" && !reason.trim())
                      }
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-${color}-600 rounded-full hover:bg-${color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
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
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {action === "warn" && "Send Warning"}
                          {action === "suspend" && "Suspend User"}
                          {action === "ban" && "Ban User"}
                          {action === "reinstate" && "Reinstate User"}
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
