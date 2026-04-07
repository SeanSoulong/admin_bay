/* eslint-disable @typescript-eslint/no-explicit-any */
// components/UserDetailModal.tsx
"use client";

import { useState, useEffect } from "react"; // Make sure useEffect is imported
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import { User as UserType } from "../../types";

interface UserDetailModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
}

// Helper function for online status (same as in UserTable)
const getOnlineStatusIndicator = (online?: boolean) => {
  if (online) {
    return {
      icon: Wifi,
      color: "text-green-500",
      bgColor: "bg-green-100",
      text: "Online",
    };
  }
  return {
    icon: WifiOff,
    color: "text-gray-400",
    bgColor: "bg-gray-100",
    text: "Offline",
  };
};

export default function UserDetailModal({
  user,
  isOpen,
  onClose,
}: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<
    "info" | "activity" | "moderation"
  >("info");

  // ✅ Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("km-KH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = () => {
    if (user.moderation?.status === "banned") {
      return {
        color: "bg-red-100 text-red-800",
        icon: Ban,
        text: "Banned",
      };
    }
    if (user.moderation?.status === "suspended") {
      return {
        color: "bg-orange-100 text-orange-800",
        icon: Clock,
        text: "Suspended",
      };
    }
    if (user.moderation?.status === "warned") {
      return {
        color: "bg-yellow-100 text-yellow-800",
        icon: AlertTriangle,
        text: "Warned",
      };
    }
    if (user.userVerified) {
      return {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        text: "Verified",
      };
    }
    return {
      color: "bg-gray-100 text-gray-800",
      icon: XCircle,
      text: "Pending",
    };
  };

  const status = getStatusBadge();
  const StatusIcon = status.icon;

  // Get online status for display (same as UserTable)
  const onlineStatus = getOnlineStatusIndicator(user.online);
  const OnlineIcon = onlineStatus.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-sm "
            onClick={onClose}
          />

          <div className="fixed inset-0 z-9999 flex items-start justify-center overflow-y-auto p-4 font-['Kantumruy_Pro']">
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
                      User Details
                    </h2>
                    <p className="text-sm text-gray-500">
                      View complete user information
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-[#4B5563] hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-6">
                  <nav className="flex space-x-4">
                    {[
                      { id: "info", label: "Information", icon: User },
                      { id: "activity", label: "Activity", icon: Activity },
                      { id: "moderation", label: "Moderation", icon: Shield },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-3 px-2 border-b-2 text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <tab.icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </div>
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
                  {/* Profile Header - Updated with online status badge */}
                  <div className="flex items-start space-x-6 mb-8">
                    <div className="shrink-0">
                      {user.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.profileImageUrl}
                          alt="Profile"
                          className="h-24 w-24 rounded-full object-cover border-4 border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png";
                          }}
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                          <User className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2 flex-wrap gap-2">
                        <h1 className="text-2xl font-bold text-gray-900">
                          {user.first_name} {user.last_name}
                        </h1>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.text}
                        </span>
                        {/* Online Status Badge - Same as UserTable */}
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${onlineStatus.bgColor} ${onlineStatus.color}`}
                        >
                          <OnlineIcon className="h-3 w-3 mr-1" />
                          {onlineStatus.text}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{user.email}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Joined {formatDate(user.createdAt)}
                        </span>
                        <span className="flex items-center">
                          <Award className="h-4 w-4 mr-1" />
                          {user.point || 0} points
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tab Content */}
                  {activeTab === "info" && (
                    <div className="space-y-6">
                      {/* Basic Information */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                          Basic Information
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Full Name</p>
                            <p className="text-sm text-gray-900">
                              {user.first_name} {user.last_name}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm text-gray-900 flex items-center">
                              <Mail className="h-4 w-4 text-gray-400 mr-1" />
                              {user.email || "N/A"}
                              {user.emailVerified && (
                                <CheckCircle className="h-4 w-4 text-green-500 ml-1" />
                              )}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-sm text-gray-900 flex items-center">
                              <Phone className="h-4 w-4 text-gray-400 mr-1" />
                              {user.phone || "N/A"}
                              {user.phoneVerified && (
                                <CheckCircle className="h-4 w-4 text-green-500 ml-1" />
                              )}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Location</p>
                            <p className="text-sm text-gray-900 flex items-center">
                              <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                              {user.location || "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Role</p>
                            <p className="text-sm text-gray-900 flex items-center">
                              <Shield className="h-4 w-4 text-gray-400 mr-1" />
                              {user.role || "User"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Bio</p>
                            <p className="text-sm text-gray-900">
                              {user.bio || "No bio provided"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Technical Information - Updated with online status badge */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                          Technical Information
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">User ID</p>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 block font-mono">
                                {user.userId}
                              </code>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">
                                Device Token
                              </p>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 block font-mono truncate">
                                {user.deviceToken || "N/A"}
                              </code>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">
                                Online Status
                              </p>
                              <p className="text-sm text-gray-900 flex items-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${onlineStatus.bgColor} ${onlineStatus.color}`}
                                >
                                  <OnlineIcon className="h-3 w-3 mr-1" />
                                  {onlineStatus.text}
                                </span>
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">
                                Last Login
                              </p>
                              <p className="text-sm text-gray-900 flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-1" />
                                {formatDate(user.lastLogin)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "activity" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                          User Activity
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 text-center py-8">
                            Activity logs coming soon...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "moderation" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                          Moderation History
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                          {user.moderation ? (
                            <>
                              {user.moderation.warnedAt && (
                                <div className="border-l-4 border-yellow-500 pl-4 py-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    Warning Issued
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(user.moderation.warnedAt)}
                                  </p>
                                  {user.moderation.warningMessage && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      Reason: {user.moderation.warningMessage}
                                    </p>
                                  )}
                                  {user.moderation.expiresAt && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Expires:{" "}
                                      {formatDate(user.moderation.expiresAt)}
                                    </p>
                                  )}
                                </div>
                              )}

                              {user.moderation.suspendedAt && (
                                <div className="border-l-4 border-orange-500 pl-4 py-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    Suspension
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(user.moderation.suspendedAt)}
                                  </p>
                                  {user.moderation.suspensionReason && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      Reason: {user.moderation.suspensionReason}
                                    </p>
                                  )}
                                  {user.moderation.suspendedUntil && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Until:{" "}
                                      {formatDate(
                                        user.moderation.suspendedUntil
                                      )}
                                    </p>
                                  )}
                                </div>
                              )}

                              {user.moderation.bannedAt && (
                                <div className="border-l-4 border-red-500 pl-4 py-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    Permanent Ban
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(user.moderation.bannedAt)}
                                  </p>
                                  {user.moderation.banReason && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      Reason: {user.moderation.banReason}
                                    </p>
                                  )}
                                </div>
                              )}

                              {user.moderation.resolvedAt && (
                                <div className="border-l-4 border-green-500 pl-4 py-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    Resolved
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(user.moderation.resolvedAt)}
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-600 text-center py-4">
                              No moderation history
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200">
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
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
