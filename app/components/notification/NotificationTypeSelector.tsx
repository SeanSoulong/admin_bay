"use client";

import { NotificationType, typeConfig } from "./types";

interface NotificationTypeSelectorProps {
  selectedType: NotificationType;
  onTypeChange: (type: NotificationType) => void;
  disabled?: boolean;
}

export default function NotificationTypeSelector({
  selectedType,
  onTypeChange,
  disabled = false,
}: NotificationTypeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        ប្រភេទ
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(typeConfig).map(([key, config]) => (
          <button
            type="button"
            key={key}
            onClick={() => onTypeChange(key as NotificationType)}
            disabled={disabled}
            className={`flex cursor-pointer flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              selectedType === key
                ? `${config.color} shadow-sm`
                : "bg-white border-gray-200 hover:border-emerald-300 text-gray-600"
            }`}
          >
            <config.icon className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-medium">
              {config.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
