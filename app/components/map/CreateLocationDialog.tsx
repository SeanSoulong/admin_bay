"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AddressDisplay } from "./AddressDisplay";
import { TagsInput } from "./TagsInput";

export function CreateLocationDialog({
  coords,
  onConfirm,
  onCancel,
  isCreating,
}: {
  coords: { lat: number; lng: number };
  onConfirm: (data: any) => void;
  onCancel: () => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Farm" | "Market">("Farm");
  const [about, setAbout] = useState("");
  const [phone, setPhone] = useState("");
  const [growing, setGrowing] = useState<string[]>([]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#1b1b1b]">
              បង្កើតទីតាំងថ្មី
            </h3>
            <p className="text-sm text-gray-500">
              បន្ថែមសមិទ្ធផលកសិដ្ឋាន ឬទីផ្សារថ្មីទៅក្នុងផែនទី
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 mb-5">
          <svg
            className="w-4 h-4 text-green-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <AddressDisplay
            lat={coords.lat}
            lng={coords.lng}
            className="text-sm text-green-700 max-w-[200px] truncate"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ឈ្មោះទីតាំង *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              placeholder="បញ្ចូលឈ្មោះទីតាំង"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ប្រភេទ *
            </label>
            <div className="flex gap-2">
              {(["Farm", "Market"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    category === c
                      ? c === "Farm"
                        ? "bg-green-100 text-green-700 ring-2 ring-green-500"
                        : "bg-orange-100 text-orange-700 ring-2 ring-orange-500"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {c === "Farm" ? "កសិដ្ឋាន" : "ទីផ្សារ"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              អំពីទីតាំង
            </label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="ពណ៌នាអំពីទីតាំងនេះ..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              លេខទូរស័ព្ទ
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              placeholder="+855..."
            />
          </div>

          {category === "Farm" && (
            <div>
              <TagsInput
                value={growing}
                onChange={setGrowing}
                label="ដំណាំដែលដាំដុះ"
                placeholder="បន្ថែមដំណាំ (ចុច Enter ឬ +)"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            disabled={isCreating}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            បោះបង់
          </button>
          <button
            onClick={() => {
              if (!name.trim()) return;
              onConfirm({
                name: name.trim(),
                category,
                latitude: coords.lat,
                longitude: coords.lng,
                detail: { about, growing },
                contact: { phoneNumber: phone },
                owner: { uuid: "admin" },
              });
            }}
            disabled={isCreating || !name.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isCreating && (
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
            )}
            តម្កល់ទីតាំង
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
