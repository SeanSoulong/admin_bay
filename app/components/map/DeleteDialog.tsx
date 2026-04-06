"use client";

import { motion } from "framer-motion";
import { Location } from "../../types";

export function DeleteDialog({
  location,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  location: Location;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#1b1b1b]">លុបទីតាំង</h3>
            <p className="text-sm text-gray-500">សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយបានទេ</p>
          </div>
        </div>
        <p className="text-gray-600 mb-6">
          តើអ្នកប្រាកដថាចង់លុបទីតាំង <span className="font-semibold text-[#1b1b1b]">"{location.name}"</span> ជាអចិន្ត្រៃយ៍មែនទេ?
          រាល់ទិន្នន័យពាក់ព័ន្ធ រួមទាំងរូបថតនឹងត្រូវបានលុបចេញ។
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer disabled:opacity-50"
          >
            បោះបង់
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDeleting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            លុបទីតាំង
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
