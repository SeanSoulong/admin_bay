import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { WarnDialogProps } from "./types";
import { getAvatarUrl, formatTime } from "./utils";

export const WarnDialog = ({ isOpen, onClose, onSubmit, post }: WarnDialogProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const [warnMessage, setWarnMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const MAX_CHARS = 500;
  
  const warningReasons = [
    { 
      id: "spam", 
      label: "សារឥតបានការ", 
      description: "ខ្លឹមសារផ្សព្វផ្សាយដែលមិនមានការស្នើសុំ ឬការបង្ហោះដដែលៗ" 
    },
    { 
      id: "harassment", 
      label: "ការយាយី", 
      description: "ការគំរាមកំហែង ការសម្លុត ឬការកំណត់គោលដៅលើបុគ្គលណាម្នាក់" 
    },
    { 
      id: "misinformation", 
      label: "ព័ត៌មានមិនពិត", 
      description: "ព័ត៌មានក្លែងក្លាយ ឬបំភាន់ឱ្យមានការយល់ច្រឡំ" 
    },
    { 
      id: "inappropriate", 
      label: "ខ្លឹមសារមិនសមរម្យ", 
      description: "រូបភាពអាសអាភាស អំពើហិង្សា ឬសម្ភារៈដែលផ្តល់ការអាក់អន់ចិត្ត" 
    },
  ];
  
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_CHARS) {
      setWarnMessage(text);
      setCharacterCount(text.length);
    }
  };
  
  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    if (reasonId === "custom") {
      setShowCustomInput(true);
      setCustomReason("");
      setWarnMessage("");
    } else {
      setShowCustomInput(false);
      const reason = warningReasons.find(r => r.id === reasonId);
      if (reason) {
        const message = `${reason.label}: ${reason.description}\n\nសូមពិនិត្យមើលគោលការណ៍សហគមន៍របស់យើងឡើងវិញ ដើម្បីធានាបាននូវការអនុលោមតាមនាពេលអនាគត។`;
        setWarnMessage(message);
        setCharacterCount(message.length);
      }
    }
  };
  
  const handleCustomReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCustomReason(text);
    setWarnMessage(text);
    setCharacterCount(text.length);
  };
  
  const handleSubmit = async () => {
    if (!warnMessage.trim()) return;
    
    setActionLoading(true);
    try {
      await onSubmit(warnMessage);
      setWarnMessage("");
      setSelectedReason("");
      setCustomReason("");
      setShowCustomInput(false);
      setCharacterCount(0);
      onClose();
    } catch (error) {
      console.error("Failed to warn post:", error);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleClose = () => {
    if (!actionLoading) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] no-scrollbar"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="no-scrollbar bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-full flex justify-center items-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">ផ្ញើការព្រមាន</h3>
            <p className="text-sm text-gray-500">វានឹងលាក់ការបង្ហោះនេះ និងជូនដំណឹងដល់ម្ចាស់អត្ថបទ</p>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <img
              src={getAvatarUrl(post.username, post.avatar)}
              alt={post.username}
              className="h-6 w-6 rounded-full"
            />
            <span className="text-sm font-medium text-gray-900">{post.username}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">{formatTime(post.timestamp)}</span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className="flex gap-2 mt-3">
              {post.imageUrls.slice(0, 4).map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={url}
                    alt={`Post image ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {i === 3 && post.imageUrls && post.imageUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">+{post.imageUrls.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ជ្រើសរើសមូលហេតុ (ជម្រើស)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {warningReasons.map((reason) => (
              <button
                key={reason.id}
                onClick={() => handleReasonSelect(reason.id)}
                className={`p-3 text-left rounded-xl cursor-pointer transition-all ${
                  selectedReason === reason.id
                    ? "bg-orange-50 border-2 border-orange-500"
                    : "bg-gray-50 border-2 border-gray-200 hover:border-orange-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{reason.label}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{reason.description}</p>
              </button>
            ))}
            <button
              onClick={() => handleReasonSelect("custom")}
              className={`p-3 text-left rounded-xl cursor-pointer transition-all ${
                selectedReason === "custom"
                  ? "bg-orange-50 border-2 border-orange-500"
                  : "bg-gray-50 border-2 border-gray-200 hover:border-orange-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">ផ្សេងៗ</span>
              </div>
              <p className="text-xs text-gray-500">សូមសរសេរហេតុផលផ្ទាល់ខ្លួន</p>
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ខ្លឹមសារនៃការព្រមាន
            <span className="text-red-500 ml-1">*</span>
          </label>
          {showCustomInput ? (
            <textarea
              value={customReason}
              onChange={handleCustomReasonChange}
              placeholder="សូមសរសេរហេតុផលនៅទីនេះ..."
              className="w-full p-3 py-2.5 text-[12px] text-gray-500 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={5}
              maxLength={MAX_CHARS}
            />
          ) : (
            <textarea
              value={warnMessage}
              onChange={handleMessageChange}
              placeholder="សារព្រមាននឹងបង្ហាញនៅទីនេះ..."
              className="w-full p-3 py-2.5 text-[12px] text-gray-500 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={5}
              readOnly={!showCustomInput}
            />
          )}
          <div className="flex justify-between items-center mt-1.5">
            <div className="text-xs text-gray-500">
              {characterCount}/{MAX_CHARS} តួអក្សរ
            </div>
            {!showCustomInput && selectedReason && selectedReason !== "custom" && (
              <button
                onClick={() => {
                  setShowCustomInput(true);
                  setCustomReason(warnMessage);
                }}
                className="text-xs text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                កែសម្រួលសារ
              </button>
            )}
          </div>
        </div>
        
          <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-orange-900">មើលខ្លឹមសារជាមុន</span>
            </div>
            <div className="mt-2 pt-2 border-t border-orange-200">
              <p className="text-xs text-orange-700">
                ការព្រមាននេះនឹងត្រូវបានបង្ហាញទៅកាន់ម្ចាស់អត្ថបទ ហើយនឹងត្រូវបានកត់ត្រាក្នុងប្រវត្តិគ្រប់គ្រង។
              </p>
            </div>
          </div>

        
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={actionLoading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            onClick={handleSubmit}
            disabled={!warnMessage.trim() || actionLoading}
            className="px-4 py-2 bg-orange-500 cursor-pointer text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {actionLoading ? (
              <>
                កំពុងផ្ញើ...
              </>
            ) : (
              <>
                ផ្ញើការព្រមាន
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};