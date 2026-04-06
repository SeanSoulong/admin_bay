"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "../../types";
import {
  Search,
  Users,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
} from "lucide-react";
import { TargetMode } from "./types";

interface UserSelectorProps {
  users: User[];
  targetMode: TargetMode;
  onTargetModeChange: (mode: TargetMode) => void;
  selectedUserIds: string[];
  onSelectedUserIdsChange: (ids: string[]) => void;
  disabled?: boolean;
}

function getUserName(user: User) {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.first_name) return user.first_name;
  return user.email?.split("@")[0] || "អ្នកប្រើប្រាស់មិនស្គាល់ឈ្មោះ";
}

export default function UserSelector({
  users,
  targetMode,
  onTargetModeChange,
  selectedUserIds,
  onSelectedUserIdsChange,
  disabled = false,
}: UserSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserListOpen, setIsUserListOpen] = useState(true);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lowerSearch = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(lowerSearch) ||
        u.first_name?.toLowerCase().includes(lowerSearch) ||
        u.last_name?.toLowerCase().includes(lowerSearch)
    );
  }, [users, searchTerm]);

  const handleToggleUser = (userId: string) => {
    onSelectedUserIdsChange(
      selectedUserIds.includes(userId)
        ? selectedUserIds.filter((id) => id !== userId)
        : [...selectedUserIds, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredUsers.map((u) => u.userId);
    const allSelected = allFilteredIds.every((id) =>
      selectedUserIds.includes(id)
    );

    if (allSelected) {
      onSelectedUserIdsChange(
        selectedUserIds.filter((id) => !allFilteredIds.includes(id))
      );
    } else {
      const newSet = new Set([...selectedUserIds, ...allFilteredIds]);
      onSelectedUserIdsChange(Array.from(newSet));
    }
  };

  return (
    <div className="rounded-lg p-5 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
        <span className="w-1 h-5 bg-emerald-500 rounded-full mr-2"></span>
        គោលដៅអ្នកទទួល
      </h3>

      <div className="flex bg-white rounded-lg p-1 border border-gray-200 mb-5">
        <button
          type="button"
          onClick={() => onTargetModeChange("all")}
          disabled={disabled}
          className={`flex-1 flex justify-center items-center cursor-pointer py-2.5 rounded-md text-sm font-medium transition-all ${
            targetMode === "all"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-gray-600 hover:text-emerald-600"
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          ទាំងអស់
        </button>
        <button
          type="button"
          onClick={() => onTargetModeChange("specific")}
          disabled={disabled}
          className={`flex-1 flex justify-center items-center cursor-pointer py-2.5 rounded-md text-sm font-medium transition-all ${
            targetMode === "specific"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-gray-600 hover:text-emerald-600"
          }`}
        >
          <UserIcon className="w-4 h-4 mr-2" />
          ម្នាក់ៗ
        </button>
      </div>

      <AnimatePresence mode="wait">
        {targetMode === "all" ? (
          <motion.div
            key="all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 rounded-lg py-5 text-center border border-emerald-100"
          >
            <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-emerald-800 font-medium">
              ផ្ញើទៅកាន់អ្នកប្រើប្រាស់ទាំងអស់ ចំនួន {users.length} នាក់
            </p>
            <p className="text-sm text-emerald-600 mt-1">
              ការជូនដំណឹងនេះនឹងទៅដល់អ្នកប្រើប្រាស់ដែលបានចុះឈ្មោះទាំងអស់។
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="specific"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
          >
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកអ្នកប្រើប្រាស់..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-gray-800 text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    disabled={disabled}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsUserListOpen(!isUserListOpen)}
                  className="p-2 text-gray-500 cursor-pointer hover:text-emerald-600 rounded-lg hover:bg-gray-100"
                >
                  {isUserListOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  disabled={disabled || filteredUsers.length === 0}
                  className="text-xs font-medium text-emerald-600 cursor-pointer hover:text-emerald-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-emerald-50"
                >
                  {filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.includes(u.userId))
                    ? "ដកការជ្រើសរើសទាំងអស់"
                    : "ជ្រើសរើសទាំងអស់"}
                </button>
              </div>
            </div>

            {isUserListOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="max-h-64 overflow-y-auto"
              >
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <UserIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">រកមិនឃើញអ្នកប្រើប្រាស់ទេ</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => (
                      <label
                        key={user.userId}
                        className="flex items-center px-4 py-3 hover:cursor-pointer transition-colors"
                      >
                        <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.userId)}
                            onChange={() => handleToggleUser(user.userId)}
                            disabled={disabled}
                            className="sr-only peer"
                          />
                          <div className={`
                            w-5 h-5 border-1 rounded-md 
                            transition-all duration-150
                            flex items-center justify-center
                            ${disabled ? 'opacity-50' : ''}
                            ${selectedUserIds.includes(user.userId)
                              ? 'bg-emerald-600 border-emerald-600' 
                              : 'bg-white border-gray-300'
                            }
                            ${!disabled && 'peer-focus:ring-1 peer-focus:ring-emerald-500 peer-focus:ring-offset-0'}
                          `}>
                            {selectedUserIds.includes(user.userId) && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </label>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {getUserName(user)}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {user.email && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {user.email}
                              </span>
                            )}
                            {user.phone && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <div className="p-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-600">
                បានជ្រើសរើស <span className="font-semibold text-emerald-600">{selectedUserIds.length}</span> នាក់
              </span>
              <button
                type="button"
                onClick={() => onSelectedUserIdsChange([])}
                disabled={disabled || selectedUserIds.length === 0}
                className="text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer disabled:opacity-40"
              >
                សម្អាតទាំងអស់
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
