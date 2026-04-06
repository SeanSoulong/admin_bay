"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

interface StatusAlertProps {
  error: string;
  successMessage: string;
  onClearError: () => void;
  onClearSuccess: () => void;
}

export default function StatusAlert({
  error,
  successMessage,
  onClearError,
  onClearSuccess,
}: StatusAlertProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start"
        >
          <div className="flex-shrink-0 bg-red-100 rounded-lg p-1">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button
            onClick={onClearError}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start"
        >
          <div className="flex-shrink-0 bg-emerald-100 rounded-lg p-1">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-emerald-800">
              {successMessage}
            </p>
          </div>
          <button
            onClick={onClearSuccess}
            className="ml-auto text-emerald-400 hover:text-emerald-600"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
