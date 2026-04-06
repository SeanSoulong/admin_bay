"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  EyeOff, 
  AlertTriangle, 
  MessageCircle,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { databaseService } from "@/app/lib/firebase";
import { Post } from "@/app/types";
import { SkeletonLoader } from "./community/SkeletonLoader";
import { PostCard } from "./community/PostCard";

export default function AdminCommunity() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden" | "warned">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeSubscription = () => {
      try {
        unsubscribe = databaseService.subscribePosts((data: Post[]) => {
          setPosts(data);
          setLoading(false);
          setError(null);
        });
      } catch (err) {
        console.error("Failed to subscribe to posts:", err);
        setError("ការទាញយកទិន្នន័យបានបរាជ័យ។ សូមព្យាយាមម្តងទៀត។");
        setLoading(false);
      }
    };

    initializeSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const filteredPosts = useMemo(() => {
    let filtered = posts;
    
    switch (filter) {
      case "visible":
        filtered = filtered.filter(p => p.visibility !== "hidden" && p.moderation?.status !== "warned");
        break;
      case "hidden":
        filtered = filtered.filter(p => p.visibility === "hidden");
        break;
      case "warned":
        filtered = filtered.filter(p => p.moderation?.status === "warned");
        break;
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.content?.toLowerCase().includes(query) ||
        p.username?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [posts, filter, searchQuery]);

  const stats = useMemo(() => ({
    total: posts.length,
    visible: posts.filter(p => p.visibility !== "hidden" && p.moderation?.status !== "warned").length,
    hidden: posts.filter(p => p.visibility === "hidden").length,
    warned: posts.filter(p => p.moderation?.status === "warned").length,
  }), [posts]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await databaseService.deletePost(postId);
      setPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  }, []);

  const handleHidePost = useCallback(async (postId: string) => {
    try {
      await databaseService.hidePost(postId);
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, visibility: "hidden" }
          : post
      ));
    } catch (error) {
      console.error("Failed to hide post:", error);
    }
  }, []);

  const handleUnhidePost = useCallback(async (postId: string) => {
    try {
      if (databaseService.unhidePost) {
        await databaseService.unhidePost(postId);
      } else {
        await databaseService.updatePost?.(postId, { visibility: "visible" });
      }
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, visibility: "visible" }
          : post
      ));
    } catch (error) {
      console.error("Failed to unhide post:", error);
    }
  }, []);

  const handleWarnPost = useCallback(async (postId: string, message: string) => {
    try {
      await databaseService.warnPost(postId, {
        adminId: "current-admin-id",
        message
      });
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              visibility: "hidden",
              moderation: {
                status: "warned",
                warnedAt: Date.now(),
                warnedBy: "current-admin-id",
                message
              }
            }
          : post
      ));
    } catch (error) {
      console.error("Failed to warn post:", error);
      throw error;
    }
  }, []);

  const filterTabs = [
    { key: "all", label: "ទាំងអស់", icon: MessageCircle },
    { key: "visible", label: "បង្ហាញ", icon: CheckCircle },
    { key: "hidden", label: "បានលាក់", icon: EyeOff },
    { key: "warned", label: "បានព្រមាន", icon: AlertTriangle },
  ];

  const getActiveFilterLabel = () => {
    const active = filterTabs.find(tab => tab.key === filter);
    return active?.label || "ទាំងអស់";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 md:w-64 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
            <div className="h-4 w-64 md:w-96 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonLoader key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg p-6 md:p-8 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">កំហុសក្នុងការទាញយកទិន្នន័យ</h3>
          <p className="text-gray-600 mb-4 text-sm md:text-base">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm md:text-base"
          >
            ព្យាយាមម្តងទៀត
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                ការគ្រប់គ្រងសហគមន៍
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                គ្រប់គ្រង និងពិនិត្យការបង្ហោះរបស់អ្នកប្រើប្រាស់នៅលើប្រព័ន្ធ
              </p>
            </div>
          </div>

          {/* Stats Grid - Responsive */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[
              { label: "ការបង្ហោះសរុប", value: stats.total, icon: MessageCircle, color: "indigo" },
              { label: "បង្ហាញជាសាធារណៈ", value: stats.visible, icon: CheckCircle, color: "green" },
              { label: "បានលាក់", value: stats.hidden, icon: EyeOff, color: "yellow" },
              { label: "បានព្រមាន", value: stats.warned, icon: AlertTriangle, color: "orange" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -2 }}
                className="bg-white rounded-lg p-3 md:p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-8 h-8 md:w-12 md:h-12 bg-${stat.color}-100 rounded-lg md:rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 md:w-6 md:h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Search and Filter Section - Responsive */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="ស្វែងរកតាមឈ្មោះអ្នកប្រើប្រាស់ ឬខ្លឹមសារ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm md:text-base"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Desktop Filter Buttons - Hidden on mobile */}
            <div className="hidden sm:flex gap-2 overflow-x-auto pb-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as typeof filter)}
                  className={`px-4 py-2 cursor-pointer rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                    filter === tab.key
                      ? "bg-indigo-600 text-white border-2 border-indigo-600"
                      : "bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile Filter Dropdown */}
            <div className="sm:hidden relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-between text-gray-700"
              >
                <div className="flex items-center gap-2">
                  {filterTabs.find(tab => tab.key === filter)?.icon && (
                    <span className="w-4 h-4">
                      {filter === "all" && <MessageCircle className="w-4 h-4" />}
                      {filter === "visible" && <CheckCircle className="w-4 h-4" />}
                      {filter === "hidden" && <EyeOff className="w-4 h-4" />}
                      {filter === "warned" && <AlertTriangle className="w-4 h-4" />}
                    </span>
                  )}
                  <span>{getActiveFilterLabel()}</span>
                </div>
                <svg
                  className={`w-5 h-5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden"
                  >
                    {filterTabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setFilter(tab.key as typeof filter);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                          filter === tab.key
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{tab.label}</span>
                        {filter === tab.key && (
                          <svg
                            className="w-4 h-4 ml-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 md:p-12 text-center"
          >
            <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">មិនមានការបង្ហោះទេ</h3>
            <p className="text-sm md:text-base text-gray-500 px-4">
              {searchQuery 
                ? "មិនមានការបង្ហោះដែលត្រូវនឹងការស្វែងរករបស់អ្នកឡើយ" 
                : filter === "all" 
                  ? "មិនទាន់មានការបង្ហោះណាមួយត្រូវបានបង្កើតនៅឡើយទេ" 
                  : `មិនមានការបង្ហោះក្នុងប្រភេទ "${getActiveFilterLabel()}" ឡើយ`}
            </p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          >
            <AnimatePresence>
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={handleDeletePost}
                  onHide={handleHidePost}
                  onUnhide={handleUnhidePost}
                  onWarn={handleWarnPost}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}