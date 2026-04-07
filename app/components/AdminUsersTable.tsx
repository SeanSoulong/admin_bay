"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types";
import UserDetailModal from "./user/UserDetailModal";
import UserWarningModal from "./user/UserWarningModal";
import { motion, AnimatePresence } from "framer-motion";
import { firestoreService, getDatabaseInstance } from "../lib/firebase";
import { ref, onValue } from "firebase/database";
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Shield,
  Award,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Trash2,
  Ban,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

interface AdminUsersTableProps {
  users: User[];
  onDelete: (userId: string) => Promise<void>;
  onUpdate?: (userId: string, updates: Partial<User>) => Promise<void>;
  loading: boolean;
  adminId: string;
}

type SortField = keyof User | "fullName";
type SortDirection = "asc" | "desc";
type UserStatus =
  | "all"
  | "active"
  | "suspended"
  | "banned"
  | "pending"
  | "warned";

// Custom hook for throttling
function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setThrottledValue(value);
    }, limit);

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Simple cache
class SimpleCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

const userCache = new SimpleCache();

// Helper function for online status
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

// Skeleton Loader Component
const UserRowSkeleton = () => {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="animate-pulse"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="shrink-0 h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="ml-4">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-40"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
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

export default function AdminUsersTable({
  users,
  onDelete,
  onUpdate,
  loading,
  adminId,
}: AdminUsersTableProps) {
  const [usersUI, setUsersUI] = useState<User[]>(users);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [warningUser, setWarningUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingWarning, setSendingWarning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [operationType, setOperationType] = useState<
    "delete" | "update" | "suspend"
  >("delete");

  // Sorting/Pagination/Search
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const throttledSearchTerm = useThrottle(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<UserStatus>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Real-time online status updates
  useEffect(() => {
    if (!adminId) return;

    const db = getDatabaseInstance();
    const onlineStatusRef = ref(db, "online-status");

    const unsubscribe = onValue(onlineStatusRef, (snapshot) => {
      if (snapshot.exists()) {
        const onlineStatus = snapshot.val();

        setUsersUI((prev) =>
          prev.map((user) => ({
            ...user,
            online:
              onlineStatus[user.userId] !== undefined
                ? onlineStatus[user.userId]
                : user.online,
          }))
        );
      }
    });

    return () => unsubscribe();
  }, [adminId]);

  useEffect(() => {
    setUsersUI(users);
  }, [users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [throttledSearchTerm, statusFilter, roleFilter]);

  const showSuccess = (
    message: string,
    type: "delete" | "update" | "suspend"
  ) => {
    setSuccessMessage(message);
    setOperationType(type);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleDelete = async (userId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      setDeletingId(userId);
      try {
        await onDelete(userId);
        setUsersUI((prev) => prev.filter((u) => u.userId !== userId));
        showSuccess("User deleted successfully!", "delete");
        userCache.clear();
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete user");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const freshUsers = await firestoreService.getUsersWithOnlineStatus();
      setUsersUI(freshUsers);
      userCache.set("all_users", freshUsers);
      showSuccess("Users refreshed successfully!", "update");
    } catch (error) {
      console.error("Refresh error:", error);
      alert("Failed to refresh users");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getFullName = useCallback((user: User) => {
    if (user.first_name && user.last_name)
      return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    if (user.email) return user.email.split("@")[0];
    return "Unknown User";
  }, []);

  const getUserStatus = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (user: User): { status: string; color: string; icon: any } => {
      if (user.moderation?.status === "banned") {
        return {
          status: "Banned",
          color: "bg-red-100 text-red-800",
          icon: Ban,
        };
      }
      if (user.moderation?.status === "suspended") {
        return {
          status: "Suspended",
          color: "bg-orange-100 text-orange-800",
          icon: Clock,
        };
      }
      if (user.moderation?.status === "warned") {
        return {
          status: "Warned",
          color: "bg-yellow-100 text-yellow-800",
          icon: AlertTriangle,
        };
      }
      if (user.userVerified) {
        return {
          status: "Verified",
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
        };
      }
      return {
        status: "Pending",
        color: "bg-gray-100 text-gray-800",
        icon: XCircle,
      };
    },
    []
  );

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("km-KH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const roles = useMemo(() => {
    const uniqueRoles = Array.from(
      new Set(usersUI.map((u) => u.role).filter(Boolean))
    );
    return ["all", ...uniqueRoles];
  }, [usersUI]);

  const filteredAndSortedUsers = useMemo(() => {
    const result = usersUI.filter((user) => {
      const searchLower = throttledSearchTerm.toLowerCase();
      const fullName = getFullName(user).toLowerCase();
      const email = (user.email || "").toLowerCase();
      const phone = (user.phone || "").toLowerCase();
      const location = (user.location || "").toLowerCase();

      const matchesSearch =
        !throttledSearchTerm ||
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower) ||
        location.includes(searchLower);

      let matchesStatus = true;
      if (statusFilter !== "all") {
        if (statusFilter === "active") {
          matchesStatus =
            !user.moderation?.status && user.userVerified === true;
        } else if (statusFilter === "pending") {
          matchesStatus = !user.userVerified && !user.moderation?.status;
        } else if (statusFilter === "warned") {
          matchesStatus = user.moderation?.status === "warned";
        } else if (statusFilter === "suspended") {
          matchesStatus = user.moderation?.status === "suspended";
        } else if (statusFilter === "banned") {
          matchesStatus = user.moderation?.status === "banned";
        }
      }

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });

    result.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let aValue: any, bValue: any;

      if (sortField === "fullName") {
        aValue = getFullName(a);
        bValue = getFullName(b);
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return result;
  }, [
    usersUI,
    throttledSearchTerm,
    statusFilter,
    roleFilter,
    sortField,
    sortDirection,
    getFullName,
  ]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Moderation handlers
  const handleSendWarning = async (userId: string, reason: string) => {
    if (!adminId) {
      alert("Missing adminId");
      return;
    }

    const user = usersUI.find((u) => u.userId === userId);
    if (!user) return;

    setSendingWarning(true);
    try {
      await firestoreService.warnUser(userId, {
        adminId,
        message: reason,
      });

      const now = Date.now();
      const expiresAt = now + 168 * 60 * 60 * 1000;

      setUsersUI((prev) =>
        prev.map((u) => {
          if (u.userId !== userId) return u;
          return {
            ...u,
            moderation: {
              status: "warned",
              warnedAt: now,
              expiresAt,
              warnedBy: adminId,
              warningMessage: reason,
            },
            updatedAt: now,
          };
        })
      );

      if (onUpdate) {
        await onUpdate(userId, {
          moderation: {
            status: "warned",
            warnedAt: now,
            expiresAt,
            warnedBy: adminId,
            warningMessage: reason,
          },
          updatedAt: now,
        });
      }

      showSuccess("Warning sent successfully!", "update");
      setWarningUser(null);
    } catch (err) {
      console.error("Warn error:", err);
      alert("Failed to send warning");
    } finally {
      setSendingWarning(false);
    }
  };

  const handleSuspendUser = async (
    userId: string,
    reason: string,
    days: number
  ) => {
    if (!adminId) return;

    setSendingWarning(true);
    try {
      await firestoreService.suspendUser(userId, {
        adminId,
        reason,
        days,
      });

      const now = Date.now();
      const suspendedUntil = now + days * 24 * 60 * 60 * 1000;

      setUsersUI((prev) =>
        prev.map((u) => {
          if (u.userId !== userId) return u;
          return {
            ...u,
            moderation: {
              status: "suspended",
              suspendedAt: now,
              suspendedUntil,
              suspendedBy: adminId,
              suspensionReason: reason,
            },
            updatedAt: now,
          };
        })
      );

      if (onUpdate) {
        await onUpdate(userId, {
          moderation: {
            status: "suspended",
            suspendedAt: now,
            suspendedUntil,
            suspendedBy: adminId,
            suspensionReason: reason,
          },
          updatedAt: now,
        });
      }

      showSuccess(`User suspended for ${days} days`, "suspend");
      setWarningUser(null);
    } catch (err) {
      console.error("Suspend error:", err);
      alert("Failed to suspend user");
    } finally {
      setSendingWarning(false);
    }
  };

  const handleBanUser = async (userId: string, reason: string) => {
    if (!adminId) return;

    if (!window.confirm("Are you sure you want to permanently ban this user?"))
      return;

    setSendingWarning(true);
    try {
      await firestoreService.banUser(userId, {
        adminId,
        reason,
      });

      const now = Date.now();

      setUsersUI((prev) =>
        prev.map((u) => {
          if (u.userId !== userId) return u;
          return {
            ...u,
            moderation: {
              status: "banned",
              bannedAt: now,
              bannedBy: adminId,
              banReason: reason,
            },
            updatedAt: now,
          };
        })
      );

      if (onUpdate) {
        await onUpdate(userId, {
          moderation: {
            status: "banned",
            bannedAt: now,
            bannedBy: adminId,
            banReason: reason,
          },
          updatedAt: now,
        });
      }

      showSuccess("User banned permanently", "suspend");
      setWarningUser(null);
    } catch (err) {
      console.error("Ban error:", err);
      alert("Failed to ban user");
    } finally {
      setSendingWarning(false);
    }
  };

  const handleReinstateUser = async (userId: string) => {
    if (!window.confirm("Reinstate this user? They will regain full access."))
      return;

    setSendingWarning(true);
    try {
      await firestoreService.reinstateUser(userId);

      const now = Date.now();

      setUsersUI((prev) =>
        prev.map((u) => {
          if (u.userId !== userId) return u;
          return {
            ...u,
            moderation: {
              status: "clean",
              resolvedAt: now,
            },
            updatedAt: now,
          };
        })
      );

      if (onUpdate) {
        await onUpdate(userId, {
          moderation: {
            status: "clean",
            resolvedAt: now,
          },
          updatedAt: now,
        });
      }

      showSuccess("User reinstated successfully", "update");
    } catch (err) {
      console.error("Reinstate error:", err);
      alert("Failed to reinstate user");
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
                <UserRowSkeleton key={i} />
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
                  ? "bg-linear-to-r from-red-50 to-red-100 border-l-4 border-red-500"
                  : operationType === "suspend"
                  ? "bg-linear-to-r from-orange-50 to-orange-100 border-l-4 border-orange-500"
                  : "bg-linear-to-r from-green-50 to-green-100 border-l-4 border-green-500"
              }`}
            >
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  operationType === "delete"
                    ? "bg-red-100"
                    : operationType === "suspend"
                    ? "bg-orange-100"
                    : "bg-green-100"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    operationType === "delete"
                      ? "text-red-600"
                      : operationType === "suspend"
                      ? "text-orange-600"
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
                    : operationType === "suspend"
                    ? "User Suspended"
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
          className="px-6 py-4 border-b border-gray-200"
        >
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Users Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {paginatedUsers.length} of{" "}
                {filteredAndSortedUsers.length} users
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Total Users: {users.length}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, phone, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 text-[#0D1B2A] pr-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as UserStatus)}
                className="border border-gray-300 text-[#0D1B2A] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="warned">Warned</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-300 text-[#0D1B2A] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                {roles
                  .filter((r) => r !== "all")
                  .map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
              </select>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 text-[#0D1B2A] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </motion.div>

        {paginatedUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No users found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== "all" || roleFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "No users in the system yet."}
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
                      onClick={() => handleSort("fullName")}
                    >
                      <div className="flex items-center">
                        User{" "}
                        {sortField === "fullName" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center">
                        Contact{" "}
                        {sortField === "email" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("location")}
                    >
                      <div className="flex items-center">
                        Location{" "}
                        {sortField === "location" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("online")}
                    >
                      <div className="flex items-center">
                        Status{" "}
                        {sortField === "online" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("role")}
                    >
                      <div className="flex items-center">
                        Role{" "}
                        {sortField === "role" && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Moderation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <AnimatePresence>
                    {paginatedUsers.map((user, index) => {
                      const status = getUserStatus(user);
                      const StatusIcon = status.icon;
                      const fullName = getFullName(user);
                      const isSuspended =
                        user.moderation?.status === "suspended";
                      const isBanned = user.moderation?.status === "banned";
                      const isWarned = user.moderation?.status === "warned";
                      const onlineStatus = getOnlineStatusIndicator(
                        user.online
                      );
                      const OnlineIcon = onlineStatus.icon;

                      return (
                        <motion.tr
                          key={user.userId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`hover:bg-gray-50 transition-all duration-200 ${
                            deletingId === user.userId ? "opacity-50" : ""
                          } ${
                            isBanned
                              ? "bg-red-50"
                              : isSuspended
                              ? "bg-orange-50"
                              : ""
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="shrink-0 h-10 w-10">
                                {user.profileImageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={user.profileImageUrl}
                                    alt={fullName}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png";
                                    }}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 flex items-center">
                                  {fullName}
                                  {user.userVerified && (
                                    <CheckCircle className="ml-1 h-4 w-4 text-green-500" />
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center">
                                  <Award className="h-3 w-3 mr-1" />
                                  {user.point || 0} pts
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {user.email && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="h-3.5 w-3.5 mr-1 text-gray-400" />
                                  <span className="truncate max-w-37.5">
                                    {user.email}
                                  </span>
                                </div>
                              )}
                              {user.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="h-3.5 w-3.5 mr-1 text-gray-400" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {user.location ? (
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400" />
                                <span>{user.location}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">
                                No location
                              </span>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              Joined {formatDate(user.createdAt)}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${onlineStatus.bgColor} ${onlineStatus.color}`}
                            >
                              <OnlineIcon className="h-3 w-3 mr-1" />
                              {onlineStatus.text}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Shield className="h-3 w-3 mr-1" />
                              {user.role || "User"}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.status}
                              {isSuspended &&
                                user.moderation?.suspendedUntil && (
                                  <span className="ml-1 text-xs">
                                    (until{" "}
                                    {formatDate(user.moderation.suspendedUntil)}
                                    )
                                  </span>
                                )}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-wrap gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDetailUser(user)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </motion.button>

                              {!isBanned && (
                                <>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() =>
                                      setWarningUser({
                                        ...user,
                                        action: "warn",
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      } as any)
                                    }
                                    className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white ${
                                      isWarned
                                        ? "bg-amber-700 hover:bg-amber-800"
                                        : "bg-yellow-600 hover:bg-yellow-700"
                                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500`}
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {isWarned ? "Edit Warn" : "Warn"}
                                  </motion.button>

                                  {isSuspended ? (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() =>
                                        handleReinstateUser(user.userId)
                                      }
                                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Reinstate
                                    </motion.button>
                                  ) : (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() =>
                                        setWarningUser({
                                          ...user,
                                          action: "suspend",
                                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        } as any)
                                      }
                                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Suspend
                                    </motion.button>
                                  )}

                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() =>
                                      setWarningUser({
                                        ...user,
                                        action: "ban",
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      } as any)
                                    }
                                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                  >
                                    <Ban className="h-3 w-3 mr-1" />
                                    Ban
                                  </motion.button>
                                </>
                              )}

                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDelete(user.userId)}
                                disabled={deletingId === user.userId}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                {deletingId === user.userId ? "..." : "Delete"}
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
                        filteredAndSortedUsers.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {filteredAndSortedUsers.length}
                    </span>{" "}
                    users
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

      {/* User Detail Modal */}
      {detailUser && (
        <UserDetailModal
          user={detailUser}
          isOpen={!!detailUser}
          onClose={() => setDetailUser(null)}
        />
      )}

      {/* User Warning/Suspension Modal */}
      {warningUser && (
        <UserWarningModal
          user={warningUser}
          isOpen={!!warningUser}
          onClose={() => setWarningUser(null)}
          onSendWarning={handleSendWarning}
          onSuspendUser={handleSuspendUser}
          onBanUser={handleBanUser}
          onReinstateUser={handleReinstateUser}
          isBusy={sendingWarning}
        />
      )}
    </>
  );
}
