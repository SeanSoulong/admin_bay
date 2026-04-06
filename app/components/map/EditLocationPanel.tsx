"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Location } from "../../types";
import { TagsInput } from "./TagsInput";

export function EditLocationPanel({
  location,
  onSave,
  onCancel,
  isSaving,
}: {
  location: Location;
  onSave: (data: Partial<Location>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(location.name);
  const [category, setCategory] = useState(location.category);
  const [about, setAbout] = useState(location.detail?.about || "");
  const [phone, setPhone] = useState(location.contact?.phoneNumber || "");
  const [growing, setGrowing] = useState<string[]>(location.detail?.growing || []);

  const handleSubmit = () => {
    onSave({
      name,
      category,
      detail: {
        about,
        growing: growing,
      },
      contact: {
        ...location.contact,
        phoneNumber: phone,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-[#1b1b1b]">កែសម្រួលទីតាំង</h3>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          ឈ្មោះ
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg text-[#1b1b1b] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          ប្រភេទ
        </label>
        <div className="flex gap-2">
          {(["Farm", "Market"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-1 cursor-pointer py-2.5 rounded-lg text-sm font-medium transition-all ${
                category === cat
                  ? cat === "Farm"
                    ? "bg-green-100 text-green-700 ring-2 ring-green-500"
                    : "bg-orange-100 text-orange-700 ring-2 ring-orange-500"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {cat === "Farm" ? "កសិដ្ឋាន" : "ទីផ្សារ"}
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
          className="w-full border border-gray-200 rounded-lg text-[#1b1b1b] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          លេខទូរស័ព្ទ
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-200 rounded-lg text-[#1b1b1b] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 py-2.5 cursor-pointer rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          បោះបង់
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex-1 cursor-pointer py-2.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          {isSaving && (
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
          រក្សាទុកការផ្លាស់ប្តូរ
        </button>
      </div>
    </motion.div>
  );
}
