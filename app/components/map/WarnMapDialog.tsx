"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Location } from "../../types";
import { AddressDisplay } from "./AddressDisplay";
import { categoryConfig } from "./config";

export function WarnMapDialog({
  location,
  onConfirm,
  onCancel,
  isWarning,
}: {
  location: Location;
  onConfirm: (msg: string) => void;
  onCancel: () => void;
  isWarning: boolean;
}) {
  const [warnMessage, setWarnMessage] = useState("");
  const [characterCount, setCharacterCount] = useState(0);
  const [selectedReason, setSelectedReason] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customReason, setCustomReason] = useState("");
  const MAX_CHARS = 500;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const warningReasons = [
    {
      id: "spam",
      label: "សារឥតបានការ",
      description: "ខ្លឹមសារផ្សព្វផ្សាយដែលមិនមានការស្នើសុំ ឬការបង្ហោះដដែលៗ",
    },
    {
      id: "fake_info",
      label: "ព័ត៌មានមិនពិត",
      description: "ទិន្នន័យក្លែងក្លាយ ឬបំភាន់អំពីទីតាំងនេះ",
    },
    {
      id: "inappropriate",
      label: "ខ្លឹមសារមិនសមរម្យ",
      description: "រូបថត ការពិពណ៌នា ឬព័ត៌មានទំនាក់ទំនងដែលមិនសមរម្យ",
    },
    {
      id: "inactive",
      label: "ឈប់ដំណើរការ / បោះបង់ចោល",
      description: "ទីតាំងនេះលែងដំណើរការ ឬលែងមានទៀតហើយ",
    },
  ];

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    if (reasonId === "custom") {
      setShowCustomInput(true);
      setCustomReason("");
      setWarnMessage("");
      setCharacterCount(0);
    } else {
      setShowCustomInput(false);
      const reason = warningReasons.find((r) => r.id === reasonId);
      if (reason) {
        const msg = `${reason.label}\n${reason.description}\n\nសូមពិនិត្យមើលខ្លឹមសារទីតាំងរបស់អ្នកឡើងវិញ ដើម្បីធានាថាវាស្របតាមគោលការណ៍ណែនាំរបស់ប្រព័ន្ធ។`;
        setWarnMessage(msg);
        setCharacterCount(msg.length);
      }
    }
  };

  const handleClose = () => {
    if (!isWarning) onCancel();
  };
  const conf = categoryConfig[location.category] || categoryConfig.Farm;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-[#1b1b1b]">ផ្ញើការព្រមាន</h3>
            <p className="text-sm text-gray-500">
              វានឹងលាក់ទីតាំងនេះ និងជូនដំណឹងដល់ម្ចាស់ទីតាំង
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            {location.profileUrl ? (
              <img
                src={location.profileUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: conf.markerColor }}
              >
                {location.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-[#1b1b1b]">
                {location.name}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: conf.bg, color: conf.color }}
                >
                  {location.category === "Farm" ? "កសិដ្ឋាន" : "ទីផ្សារ"}
                </span>
                <AddressDisplay
                  lat={location.latitude}
                  lng={location.longitude}
                  className="text-xs text-gray-400 truncate"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            ជ្រើសរើសមូលហេតុ
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {warningReasons.map((reason) => (
              <button
                key={reason.id}
                onClick={() => handleReasonSelect(reason.id)}
                className={`p-3 text-left rounded-xl cursor-pointer transition-all ${
                  selectedReason === reason.id
                    ? "bg-amber-50 border-2 border-amber-500 shadow-sm"
                    : "bg-gray-50 border-2 border-gray-200 hover:border-amber-300"
                }`}
              >
                <div className="text-sm font-medium text-[#1b1b1b] mb-1">
                  {reason.label}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {reason.description}
                </p>
              </button>
            ))}
            <button
              onClick={() => handleReasonSelect("custom")}
              className={`p-3 text-left rounded-xl cursor-pointer transition-all sm:col-span-2 ${
                selectedReason === "custom"
                  ? "bg-amber-50 border-2 border-amber-500"
                  : "bg-gray-50 border-2 border-gray-200 hover:border-amber-300"
              }`}
            >
              <div className="text-sm font-medium text-[#1b1b1b] mb-1">ផ្សេងៗ</div>
              <p className="text-xs text-gray-500">សរសេរមូលហេតុដោយខ្លួនឯង</p>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            សារព្រមាន <span className="text-red-500">*</span>
          </label>
          {showCustomInput ? (
            <textarea
              value={customReason}
              onChange={(e) => {
                const t = e.target.value;
                if (t.length <= MAX_CHARS) {
                  setCustomReason(t);
                  setWarnMessage(t);
                  setCharacterCount(t.length);
                }
              }}
              placeholder="សូមសរសេរមូលហេតុនៅទីនេះ..."
              className="w-full p-3 text-sm text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={MAX_CHARS}
            />
          ) : (
            <textarea
              value={warnMessage}
              onChange={(e) => {
                const t = e.target.value;
                if (t.length <= MAX_CHARS) {
                  setWarnMessage(t);
                  setCharacterCount(t.length);
                }
              }}
              placeholder="សារព្រមាននឹងបង្ហាញនៅទីនេះ..."
              className="w-full p-3 text-sm text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={4}
              readOnly={!!selectedReason && selectedReason !== "custom"}
            />
          )}
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-gray-400">
              {characterCount}/{MAX_CHARS} តួអក្សរ
            </div>
            {!showCustomInput && selectedReason && selectedReason !== "custom" && (
              <button
                onClick={() => {
                  setShowCustomInput(true);
                  setCustomReason(warnMessage);
                }}
                className="text-xs text-amber-600 hover:text-amber-700 cursor-pointer font-medium"
              >
                កែសម្រួលសារ
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-amber-900">ការមើលជាមុន</span>
          </div>
          <p className="text-xs text-amber-700">
            ការព្រមាននេះនឹងត្រូវបានផ្ញើទៅកាន់ម្ចាស់ទីតាំង ហើយនឹងត្រូវបានកត់ត្រាក្នុងប្រវត្តិគ្រប់គ្រង។
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isWarning}
            className="px-5 py-2.5 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 cursor-pointer font-medium"
          >
            បោះបង់
          </button>
          <button
            onClick={() => onConfirm(warnMessage)}
            disabled={!warnMessage.trim() || isWarning}
            className="px-5 py-2.5 bg-amber-500 cursor-pointer text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm font-medium"
          >
            {isWarning ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                កំពុងផ្ញើ...
              </>
            ) : (
              "ផ្ញើការព្រមាន"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
