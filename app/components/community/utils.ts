import { Comment } from "@/app/types";
import { CommentWithReplies } from "./types";

export const AVATAR_API_BASE = "https://ui-avatars.com/api/";
export const DEFAULT_AVATAR = `${AVATAR_API_BASE}/?name=User&background=4f46e5&color=fff&bold=true&length=2`;

export const formatTime = (timestamp: number | string): string => {
  if (!timestamp) return "";
  
  const timestampNum = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  const diff = Date.now() - timestampNum;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  
  return new Date(timestampNum).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

export const getAvatarUrl = (username?: string, avatar?: string): string => {
  if (avatar) return avatar;
  if (username) {
    const name = username.split(' ').map(n => n[0]).join('').toUpperCase();
    return `${AVATAR_API_BASE}/?name=${encodeURIComponent(name || 'U')}&background=4f46e5&color=fff&bold=true&length=2`;
  }
  return DEFAULT_AVATAR;
};

export const buildCommentTree = (comments: Comment[]): CommentWithReplies[] => {
  if (!comments || comments.length === 0) return [];
  
  const commentMap = new Map<string, CommentWithReplies>();
  const rootComments: CommentWithReplies[] = [];

  comments.forEach(comment => {
    commentMap.set(comment.commentId || comment.id, { 
      ...comment, 
      replies: [], 
      replyCount: 0,
      id: comment.commentId || comment.id
    });
  });

  comments.forEach(comment => {
    const commentId = comment.commentId || comment.id;
    const commentWithReplies = commentMap.get(commentId)!;
    
    if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
      const parent = commentMap.get(comment.parentCommentId)!;
      if (!parent.replies) parent.replies = [];
      parent.replies.push(commentWithReplies);
      parent.replyCount = (parent.replyCount || 0) + 1;
    } else {
      rootComments.push(commentWithReplies);
    }
  });

  const sortByTimestamp = (a: CommentWithReplies, b: CommentWithReplies) => {
    const timeA = a.timestamp ? Number(a.timestamp) : 0;
    const timeB = b.timestamp ? Number(b.timestamp) : 0;
    return timeA - timeB;
  };

  rootComments.sort(sortByTimestamp);
  
  const sortReplies = (comment: CommentWithReplies) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort(sortByTimestamp);
      comment.replies.forEach(sortReplies);
    }
  };
  
  rootComments.forEach(sortReplies);

  return rootComments;
};
