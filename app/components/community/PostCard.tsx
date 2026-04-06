import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EyeOff, AlertTriangle, MoreVertical, RotateCcw, Trash2, Heart, MessageCircle, Bookmark } from "lucide-react";
import { databaseService } from "@/app/lib/firebase";
import { PostCardProps } from "./types";
import { getAvatarUrl, formatTime } from "./utils";
import { PostDetailModal } from "./PostDetailModal";
import { WarnDialog } from "./WarnDialog";

export const PostCard = ({ post, onDelete, onHide, onUnhide, onWarn }: PostCardProps) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWarnDialog, setShowWarnDialog] = useState(false);

  const isHidden = post.visibility === "hidden";
  const isWarned = post.moderation?.status === "warned";

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;
    
    setActionLoading(true);
    try {
      if (onDelete) {
        await onDelete(post.id);
      } else {
        await databaseService.deletePost(post.id);
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
    } finally {
      setActionLoading(false);
    }
  }, [post.id, onDelete]);

  const handleHide = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(true);
    try {
      if (onHide) {
        await onHide(post.id);
      } else {
        await databaseService.hidePost(post.id);
      }
    } catch (error) {
      console.error("Failed to hide post:", error);
    } finally {
      setActionLoading(false);
    }
  }, [post.id, onHide]);

  const handleUnhide = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(true);
    try {
      if (onUnhide) {
        await onUnhide(post.id);
      } else if (databaseService.unhidePost) {
        await databaseService.unhidePost(post.id);
      }
    } catch (error) {
      console.error("Failed to unhide post:", error);
    } finally {
      setActionLoading(false);
    }
  }, [post.id, onUnhide]);

  const handleWarn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowWarnDialog(true);
  }, []);

  const hasImages = post.imageUrls && post.imageUrls.length > 0;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col ${
          isHidden ? "opacity-60" : ""
        }`}
        onClick={() => setShowModal(true)}
      >
        {(isHidden || isWarned) && (
          <div className="absolute top-4 left-4 z-10">
            {isHidden && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                <EyeOff className="w-3 h-3" />
                Hidden
              </span>
            )}
          </div>
        )}

        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 bg-white/90 rounded-full hover:bg-white cursor-pointer"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-100 overflow-hidden z-20"
              >
                {!isHidden && (
                  <button
                    onClick={handleWarn}
                    disabled={actionLoading}
                    className="w-full cursor-pointer px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Issue Warning
                  </button>
                )}
                {isHidden ? (
                  <button
                    onClick={handleUnhide}
                    disabled={actionLoading}
                    className="w-full cursor-pointer px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Unhide Post
                  </button>
                ) : (
                  <button
                    onClick={handleHide}
                    disabled={actionLoading}
                    className="w-full cursor-pointer px-4 py-2 text-left text-sm text-yellow-600 hover:bg-yellow-50 transition-colors flex items-center gap-2"
                  >
                    <EyeOff className="w-4 h-4" />
                    Hide Post
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="w-full cursor-pointer px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Post
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-5 min-h-[270px] flex flex-col flex-grow">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={getAvatarUrl(post.username, post.avatar)}
              alt={post.username}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-100"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {post.username || "Unknown User"}
              </p>
              <p className="text-xs text-gray-500">
                {formatTime(post.timestamp)}
              </p>
            </div>
          </div>

          <p className="text-gray-700 mb-3 line-clamp-2 leading-relaxed">
            {post.content}
          </p>

          {hasImages && (
            <div className="mb-3">
              <div className="grid grid-cols-3 gap-1">
                {(post.imageUrls ?? []).slice(0, 3).map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                    <img 
                      src={img} 
                      alt={`Preview ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {i === 2 && post.imageUrls && post.imageUrls.length > 3 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          +{post.imageUrls.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{post.likesCount || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{post.commentsCount || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bookmark className="w-4 h-4" />
                <span>{post.savesCount || 0}</span>
              </div>
            </div>
            {isWarned && (
              <div className="flex items-center gap-1 text-orange-600 text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>Warned</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {showModal && (
        <PostDetailModal
          post={post}
          onClose={() => setShowModal(false)}
          onDelete={onDelete}
          onHide={onHide}
          onUnhide={onUnhide}
          onWarn={onWarn}
        />
      )}

      <WarnDialog
        isOpen={showWarnDialog}
        onClose={() => setShowWarnDialog(false)}
        onSubmit={async (message) => {
          if (onWarn) {
            await onWarn(post.id, message);
          }
        }}
        post={post}
      />
    </>
  );
};