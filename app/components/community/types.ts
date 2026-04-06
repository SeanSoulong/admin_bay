import { Post, Comment } from "@/app/types";

export interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
  replyCount?: number;
}

export interface PostDetailModalProps {
  post: Post;
  onClose: () => void;
  onDelete?: (postId: string) => void;
  onHide?: (postId: string) => void;
  onUnhide?: (postId: string) => void;
  onWarn?: (postId: string, message: string) => void;
}

export interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
  onHide?: (postId: string) => void;
  onUnhide?: (postId: string) => void;
  onWarn?: (postId: string, message: string) => void;
}

export interface ImageGalleryProps {
  images: string[];
  onClose: () => void;
  initialIndex?: number;
}

export interface CommentItemProps {
  comment: CommentWithReplies;
  depth?: number;
  allComments?: Map<string, Comment>;
}

export interface WarnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
  post: Post;
}
