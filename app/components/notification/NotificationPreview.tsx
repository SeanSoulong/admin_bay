"use client";

import { NotificationType, typeConfig } from "./types";

interface NotificationPreviewProps {
  title: string;
  body: string;
  type: NotificationType;
}

export default function NotificationPreview({
  title,
  body,
  type,
}: NotificationPreviewProps) {
  const config = typeConfig[type];
  const TypeIcon = config.icon;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-5 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
        មើលជាមុន
      </h3>
      <div className={`rounded-lg overflow-hidden flex justify-start items-center`}>
        <span className={`w-12 h-12 ${config.iconBg} rounded-full flex justify-center items-center transition-colors`}>
          <TypeIcon className={`w-6 h-6 ${config.iconColor} transition-colors`} />
        </span>
        <div className="px-4">
          <h4 className="font-normal text-[16px] text-[#1e232c]">
            {title || "ចំណងជើងរបស់អ្នក"}
          </h4>
          <p className="font-normal text-[11px] text-[#8391a1]">
            {body || "សាររបស់អ្នកនឹងបង្ហាញនៅទីនេះ..."}
          </p>
        </div>
      </div>
    </div>
  );
}
