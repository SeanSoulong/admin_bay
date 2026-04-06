"use client";

import { Send } from "lucide-react";
import { TargetMode } from "./types";

interface RecipientStatsCardProps {
  targetMode: TargetMode;
  totalUsers: number;
  selectedCount: number;
}

export default function RecipientStatsCard({
  targetMode,
  totalUsers,
  selectedCount,
}: RecipientStatsCardProps) {
  const count = targetMode === "all" ? totalUsers : selectedCount;
  const label = targetMode === "all" ? "អ្នកទទួលសរុប" : "អ្នកទទួលដែលបានជ្រើសរើស";

  return (
    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
      <div className="flex-col items-center justify-center">
        <p className="text-2xl text-center font-bold text-emerald-800 mt-1">
          {count}
        </p>
        <p className="text-xs text-center text-emerald-600 mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}
