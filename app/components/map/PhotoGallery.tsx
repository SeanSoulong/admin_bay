"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
        {photos.slice(0, 6).map((url, i) => (
          <div
            key={i}
            className="relative aspect-square cursor-pointer group overflow-hidden"
            onClick={() => {
              setActiveIndex(i);
              setViewerOpen(true);
            }}
          >
            <img
              src={url}
              alt={`រូបភាពទី ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            {i === 5 && photos.length > 6 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <span className="text-white font-semibold text-sm">
                  +{photos.length - 6}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {viewerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setViewerOpen(false)}
          >
            <button
              onClick={() => setViewerOpen(false)}
              className="absolute top-5 right-5 text-white/80 hover:text-white z-10 p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <svg
                className="w-6 h-6"
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

            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) =>
                  prev > 0 ? prev - 1 : photos.length - 1
                );
              }}
              className="absolute left-5 text-white/80 hover:text-white z-10 p-3 hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <motion.img
              key={activeIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              src={photos[activeIndex]}
              alt=""
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) =>
                  prev < photos.length - 1 ? prev + 1 : 0
                );
              }}
              className="absolute right-5 text-white/80 hover:text-white z-10 p-3 hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white/90 text-sm font-medium">
              {activeIndex + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
