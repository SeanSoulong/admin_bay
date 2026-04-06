"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { User } from "../types";
import { databaseService } from "../lib/firebase/database";
import {
  StatusAlert,
  NotificationTypeSelector,
  NotificationPreview,
  UserSelector,
  RecipientStatsCard,
} from "./notification";
import type { NotificationType, TargetMode } from "./notification";

interface AdminPushNotificationProps {
  users: User[];
  adminId: string;
}

export default function AdminPushNotification({
  users,
  adminId,
}: AdminPushNotificationProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotificationType>("info");
  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("សូមបញ្ចូលចំណងជើង និងខ្លឹមសារសារ។");
      return;
    }

    if (targetMode === "specific" && selectedUserIds.length === 0) {
      setError("សូមជ្រើសរើសអ្នកប្រើប្រាស់យ៉ាងហោចណាស់ម្នាក់។");
      return;
    }

    setIsSending(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        type,
        sender: adminId,
      };

      const allSelected = selectedUserIds.length >= users.length;

      if (targetMode === "all" || allSelected) {
        await databaseService.sendNotification("broadcast", {
          ...payload,
          type: "broadcast",
        });
      } else {
        await databaseService.broadcastNotification(payload, selectedUserIds);
      }

      setSuccessMessage(
        `✓ ការផ្ញើសារបានជោគជ័យទៅកាន់អ្នកប្រើប្រាស់ចំនួន ${
          targetMode === "all" ? users.length : selectedUserIds.length
        } នាក់។`
      );

      // Reset form
      setTitle("");
      setBody("");
      if (targetMode === "specific") {
        setSelectedUserIds([]);
      }

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Error sending notification:", err);
      setError("ការផ្ញើសារបានបរាជ័យ។ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="overflow-hidden font-['Inter', system-ui, 'Kantumruy Pro', sans-serif]">
      {/* Header */}
      <div className="py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center gap-2">
            <div>
              <h2 className="text-xl font-bold text-[#1b1b1b] tracking-tight">
                ការជូនដំណឹង
              </h2>
              <p className="text-[#1b1b1b] text-sm mt-0.5">
                ផ្ញើការជូនដំណឹងទៅកាន់អ្នកប្រើប្រាស់
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <StatusAlert
          error={error}
          successMessage={successMessage}
          onClearError={() => setError("")}
          onClearSuccess={() => setSuccessMessage("")}
        />

        <form onSubmit={handleSend}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Notification Content */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                  <span className="w-1 h-5 bg-emerald-500 rounded-full mr-2"></span>
                  ព័ត៌មានលម្អិតនៃការជូនដំណឹង
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      ចំណងជើង <span className="text-emerald-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="ឧទាហរណ៍៖ ការដាក់ចេញមុខងារថ្មី!"
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-shadow"
                      disabled={isSending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      សារ <span className="text-emerald-600">*</span>
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="សរសេរខ្លឹមសារសារជូនដំណឹង..."
                      rows={4}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-shadow"
                      disabled={isSending}
                    />
                  </div>

                  <NotificationTypeSelector
                    selectedType={type}
                    onTypeChange={setType}
                    disabled={isSending}
                  />
                </div>
              </div>

              <NotificationPreview title={title} body={body} type={type} />
            </div>

            {/* Right Column: Audience Target */}
            <div className="space-y-6">
              <UserSelector
                users={users}
                targetMode={targetMode}
                onTargetModeChange={setTargetMode}
                selectedUserIds={selectedUserIds}
                onSelectedUserIdsChange={setSelectedUserIds}
                disabled={isSending}
              />

              <RecipientStatsCard
                targetMode={targetMode}
                totalUsers={users.length}
                selectedCount={selectedUserIds.length}
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSending || (targetMode === "specific" && selectedUserIds.length === 0 && !isSending)}
              className="inline-flex cursor-pointer items-center px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  កំពុងផ្ញើ...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  ផ្ញើការជូនដំណឹង
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}