import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, AlertTriangle, RotateCcw, EyeOff, 
  Trash2, X, Clock, Heart, MessageCircle, Bookmark 
} from "lucide-react";
import { databaseService } from "@/app/lib/firebase";
import { Comment } from "@/app/types";
import { PostDetailModalProps, CommentWithReplies } from "./types";
import { getAvatarUrl, formatTime, buildCommentTree } from "./utils";
import { ImageGrid } from "./ImageGrid";
import { WarnDialog } from "./WarnDialog";
import { ImageGallery } from "./ImageGallery";
import { CommentItem } from "./CommentItem";

export const PostDetailModal = ({ post, onClose, onDelete, onHide, onUnhide, onWarn }: PostDetailModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTree, setCommentTree] = useState<CommentWithReplies[]>([]);
  const [commentMap, setCommentMap] = useState<Map<string, Comment>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [showWarnDialog, setShowWarnDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = databaseService.subscribeComments(
      post.id,
      (newComments: Comment[]) => {
        setComments(newComments);
        
        const map = new Map<string, Comment>();
        newComments.forEach(comment => {
          const id = comment.commentId || comment.id;
          map.set(id, comment);
        });
        setCommentMap(map);
        
        const tree = buildCommentTree(newComments);
        setCommentTree(tree);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [post.id]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleImageClick = (index: number) => {
    setGalleryIndex(index);
    setShowGallery(true);
  };

  const handleWarnSubmit = async (message: string) => {
    if (onWarn) {
      await onWarn(post.id, message);
    } else {
      await databaseService.warnPost(post.id, {
        adminId: "current-admin-id",
        message
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;
    
    setActionLoading(true);
    try {
      if (onDelete) {
        await onDelete(post.id);
      } else {
        await databaseService.deletePost(post.id);
      }
      onClose();
    } catch (error) {
      console.error("Failed to delete post:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHide = async () => {
    setActionLoading(true);
    try {
      if (onHide) {
        await onHide(post.id);
      } else {
        await databaseService.hidePost(post.id);
      }
      onClose();
    } catch (error) {
      console.error("Failed to hide post:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnhide = async () => {
    setActionLoading(true);
    try {
      if (onUnhide) {
        await onUnhide(post.id);
      } else if (databaseService.unhidePost) {
        await databaseService.unhidePost(post.id);
      }
      onClose();
    } catch (error) {
      console.error("Failed to unhide post:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const isHidden = post.visibility === "hidden";
  const isWarned = post.moderation?.status === "warned";

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end z-50 no-scrollbar"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="w-full max-w-[600px] bg-white h-full overflow-y-auto shadow-2xl no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex justify-end items-center z-10">
              <div className="flex gap-2">
                {!isHidden && (
                  <button
                    onClick={() => setShowWarnDialog(true)}
                    disabled={actionLoading}
                    className="p-2 cursor-pointer text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Warn"
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </button>
                )}
                {isHidden ? (
                  <button
                    onClick={handleUnhide}
                    disabled={actionLoading}
                    className="p-2 cursor-pointer text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Unhide"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleHide}
                    disabled={actionLoading}
                    className="p-2 cursor-pointer text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Hide"
                  >
                    <EyeOff className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="p-2 cursor-pointer text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={getAvatarUrl(post.username, post.avatar)}
                  alt={post.username}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-100"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{post.username || "Unknown User"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">{formatTime(post.timestamp)}</p>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 whitespace-pre-wrap break-words mb-4 leading-relaxed">
                {post.content}
              </p>
              
              {post.imageUrls && post.imageUrls.length > 0 && (
                <div className="mb-6">
                  {/* Original size image grid - no cropping */}
                  <div className="space-y-3">
                    {post.imageUrls.map((img, index) => (
                      <div 
                        key={index}
                        className="relative rounded-lg overflow-hidden cursor-pointer bg-gray-100"
                        onClick={() => handleImageClick(index)}
                      >
                        <img 
                          src={img} 
                          alt={`Post image ${index + 1}`}
                          className="w-full h-auto max-h-[500px] object-contain"
                          loading="lazy"
                          style={{ objectFit: 'contain' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mb-6">
                {isHidden && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    <EyeOff className="w-3 h-3" />
                    Hidden
                  </span>
                )}
                {isWarned && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    Warning Issued
                  </span>
                )}
              </div>

              <div className="flex items-center gap-6 py-4 border-t border-b border-gray-100 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm font-medium">{post.likesCount || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{comments.length}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Bookmark className="w-4 h-4" />
                  <span className="text-sm font-medium">{post.savesCount || 0}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Comments ({comments.length})
                </h3>
                
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex gap-3">
                        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : commentTree.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No comments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commentTree.map((comment) => (
                      <CommentItem
                        key={comment.id || comment.commentId}
                        comment={comment}
                        allComments={commentMap}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>

        <WarnDialog
          isOpen={showWarnDialog}
          onClose={() => setShowWarnDialog(false)}
          onSubmit={handleWarnSubmit}
          post={post}
        />

        {showGallery && (
          <ImageGallery
            images={post.imageUrls || []}
            onClose={() => setShowGallery(false)}
            initialIndex={galleryIndex}
          />
        )}
      </AnimatePresence>
    </>
  );
};