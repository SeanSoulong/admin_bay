"use client";

import { useState } from "react";

export function TagsInput({
  value,
  onChange,
  label,
  placeholder = "បន្ថែម...",
}: {
  value: string[];
  onChange: (val: string[]) => void;
  label?: string;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const v = input.trim();
    if (v && !value.includes(v)) {
      onChange([...value, v]);
      setInput("");
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-2">
          {label}
        </label>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-green-50 text-green-700 text-xs font-medium"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="hover:bg-green-200 rounded-full p-0.5 transition-colors cursor-pointer"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!input.trim()}
          className="shrink-0 p-3 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg
            className="w-5 h-5"
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
        </button>
      </div>
    </div>
  );
}
