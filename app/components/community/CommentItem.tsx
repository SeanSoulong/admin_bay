import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CommentItemProps } from "./types";
import { getAvatarUrl, formatTime } from "./utils";

export const CommentItem = ({ comment, depth = 0, allComments }: CommentItemProps) => {
  const [expanded, setExpanded] = useState(true);
  const maxDepth = 5;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const parentUsername = comment.parentCommentId && allComments?.get(comment.parentCommentId)?.username;

  return (
    <div className={`relative ${depth > 0 ? "ml-8" : ""}`}>
      {depth > 0 && (
        <div
          className="absolute left-[-20px] top-0 w-5 h-5 border-l-2 border-b-2 border-gray-200 rounded-bl-xl"
          style={{ top: "16px" }}
        />
      )}

      <div className="flex gap-3 py-2 relative">
        <div className="flex-shrink-0 relative">
          <img
            src={getAvatarUrl(comment.username, comment.avatar)}
            alt={comment.username}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
          {hasReplies && expanded && depth < maxDepth && (
            <div className="absolute left-[13px] top-9 bottom-[-8px] w-0.5 bg-gray-200" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-2xl px-4 py-2.5">
            <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
              <span className="text-[13px] font-semibold text-gray-900">
                {comment.username}
              </span>
              {comment.timestamp && (
                <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0">
                  {formatTime(comment.timestamp)}
                </span>
              )}
            </div>
            <p className="text-[13px] text-gray-700 break-words leading-relaxed">
              {comment.text}
            </p>
          </div>

          {hasReplies && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 ml-2 text-[11px] cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium"
            >
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {comment.replyCount} ការឆ្លើយតប
            </button>
          )}

          {hasReplies && expanded && depth < maxDepth && (
            <div className="mt-1">
              {comment.replies!.map((reply) => (
                <CommentItem
                  key={reply.id || reply.commentId}
                  comment={reply}
                  depth={depth + 1}
                  allComments={allComments}
                />
              ))}
            </div>
          )}

          {hasReplies && depth >= maxDepth && (
            <button className="mt-1.5 ml-2 text-[11px] text-indigo-500 hover:text-indigo-600 font-medium cursor-pointer transition-colors">
              មើល {comment.replyCount} ការឆ្លើយតបបន្ថែម
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
