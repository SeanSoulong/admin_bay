"use client";

import { useState } from "react";
import { LearningCard } from "../types";
import LearningCardEditModal from "./LearningCardEditModal";
import { motion } from "framer-motion";

interface LearningHubTableProps {
  cards: LearningCard[];
  onDelete: (uuid: string) => Promise<void>;
  onUpdate: (uuid: string, updates: Partial<LearningCard>) => Promise<void>;
  onCreate: (cardData: Omit<LearningCard, "uuid">) => Promise<LearningCard>;
  loading: boolean;
}

const CATEGORIES = [
  "ដីនិងជីកំប៉ុស",
  "ការរៀបចំផែនការកសិកម្ម",
  "ការត្រួតពិនិត្យសត្វល្អិតធម្មជាតិ",
  "គ្រាប់ពូជនិងផែនការ",
  "ការគ្រប់គ្រងទឹក",
  "ឧបករណ៍និងឧបករណ៍ផ្សេងៗ",
] as const;

export default function LearningHubTable({
  cards = [],
  onDelete,
  onUpdate,
  onCreate,
  loading,
}: LearningHubTableProps) {
  const [editingCard, setEditingCard] = useState<LearningCard | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("km-KH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString || "Invalid date";
    }
  };

  const handleDelete = async (uuid: string) => {
    if (window.confirm("តើអ្នកប្រាកដថាចង់លុបកាតនេះទេ?")) {
      setDeletingId(uuid);
      try {
        await onDelete(uuid);
      } catch (error) {
        console.error("Delete error:", error);
        alert("លុបមិនបានសម្រេច");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleUpdate = async (uuid: string, updates: Partial<LearningCard>) => {
    try {
      await onUpdate(uuid, updates);
      setEditingCard(null);
    } catch (error) {
      console.error("Update error:", error);
      throw error;
    }
  };

  const handleCreate = async (
    cardData: Omit<LearningCard, "uuid">
  ): Promise<LearningCard> => {
    try {
      const created = await onCreate(cardData);
      setIsCreating(false);
      return created;
    } catch (error) {
      console.error("Create error:", error);
      throw error;
    }
  };

  const filteredCards = cards.filter((card) => {
    if (!card) return false;

    const matchesSearch =
      (card.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (card.description?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (card.author?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || card.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 font-[Kantumruy_Pro]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A817F]"></div>
      </div>
    );
  }

  return (
    <>
      <div
        className="
        bg-white 
        rounded-lg border border-[#EBECF0] 
        overflow-hidden 
        font-[Kantumruy_Pro]
      "
      >
        {/* HEADER */}
        <div
          className="
          px-4 sm:px-6 py-4 
          border-b border-[#EBECF0] 
          bg-white
        "
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2
                className="
                text-[#0D1B2A] font-medium 
                text-[15px] sm:text-[16px] md:text-[18px]
              "
              >
                Learning Hub Management
              </h2>
              <p
                className="
                text-[#4B5563] 
                text-[11px] sm:text-[12px] md:text-sm 
                mt-1
              "
              >
                Total {cards.length} educational cards • {filteredCards.length}{" "}
                filtered
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* CREATE BUTTON */}
              <button
                onClick={() => setIsCreating(true)}
                className="
                  inline-flex items-center justify-center gap-2 
                  px-4 py-2.5 
                  bg-[#0A817F] 
                  text-white font-medium 
                  rounded-lg 
                  hover:bg-[#0A2F1C] 
                  transition-colors 
                  shadow-sm
                  text-[13px] sm:text-[14px]
                "
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create New Card
              </button>

              {/* SEARCH AND FILTER */}
              <div className="flex gap-2">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B7280]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="ស្វែងរកកាត..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-[#0D1B2A] 
                      pl-10 pr-4 py-2.5 
                      border border-[#D1D5DB] 
                      rounded-lg 
                      focus:border-[#0A817F] 
                      focus:ring-2 focus:ring-[#0A817F]/20 
                      w-full sm:w-64
                      text-[13px] sm:text-[14px]
                    "
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-[#0D1B2A] 
                    px-4 py-2.5 
                    border border-[#D1D5DB] 
                    rounded-lg 
                    focus:border-[#0A817F] 
                    focus:ring-2 focus:ring-[#0A817F]/20 
                    text-[13px] sm:text-[14px]
                  "
                >
                  <option value="all">ប្រភេទទាំងអស់</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* CARDS GRID */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-16 font-[Kantumruy_Pro]">
            <svg
              className="mx-auto h-16 w-16 text-[#D1D5DB]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3
              className="
              mt-4 
              text-[#0D1B2A] font-medium 
              text-[15px] sm:text-[16px] md:text-[18px]
            "
            >
              {cards.length === 0
                ? "រកមិនឃើញកាតអប់រំ"
                : "រកមិនឃើញកាតដែលត្រូវនឹងលក្ខខណ្ឌ"}
            </h3>
            <p
              className="
              mt-2 
              text-[#4B5563] 
              text-[13px] sm:text-[14px]
            "
            >
              {searchTerm || selectedCategory !== "all"
                ? "សូមព្យាយាមកែលក្ខខណ្ឌស្វែងរករបស់អ្នក"
                : "សូមចាប់ផ្ដើមដោយបង្កើតកាតអប់រំដំបូងរបស់អ្នក"}
            </p>
            {!searchTerm &&
              selectedCategory === "all" &&
              cards.length === 0 && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="
                    mt-4 
                    inline-flex items-center 
                    px-4 py-2 
                    border border-transparent 
                    text-[13px] sm:text-[14px] font-medium 
                    rounded-lg shadow-sm 
                    text-white bg-[#0A817F] 
                    hover:bg-[#0A2F1C]
                  "
                >
                  បង្កើតកាតដំបូង
                </button>
              )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <div
              className="
              grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 
              gap-4 sm:gap-6 
              p-4 sm:p-6
            "
            >
              {filteredCards.map((card, index) => {
                if (!card) return null;

                return (
                  <motion.div
                    key={card.uuid || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="
                      rounded-lg border border-[#EBECF0] bg-white 
                      overflow-hidden mx-auto 
                      w-full
                      max-w-[360px] sm:max-w-[420px] md:max-w-[500px] lg:max-w-[420px]
                    "
                    whileHover={{ scale: 1.02 }}
                  >
                    {/* IMAGE */}
                    <div
                      className="
                      relative w-full 
                      h-[160px] sm:h-[180px] md:h-[200px] lg:h-[220px]
                    "
                    >
                      <img
                        src={
                          card.imageUrl ||
                          "https://via.placeholder.com/400x200?text=No+Image"
                        }
                        alt={card.title || "Learning Card"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/400x200?text=No+Image";
                        }}
                      />

                      {/* CATEGORY BADGE */}
                      <span
                        className="
                          absolute top-0 left-0 
                          bg-[#0A817F] text-white 
                          px-3 py-1 rounded-br-lg 
                          text-[10px] sm:text-xs md:text-sm
                        "
                      >
                        {card.category || "Uncategorized"}
                      </span>
                    </div>

                    {/* CONTENT */}
                    <div className="p-3 sm:p-4 flex flex-col gap-3">
                      {/* Title */}
                      <h3
                        className="
                          text-[#0D1B2A] font-medium 
                          text-[13px] sm:text-[15px] md:text-[16px]
                          line-clamp-2
                        "
                      >
                        {card.title || "Untitled"}
                      </h3>

                      {/* Description */}
                      <p
                        className="
                          text-[#4B5563] 
                          text-[11px] sm:text-[13px] md:text-sm 
                          line-clamp-3 md:line-clamp-4
                        "
                      >
                        {card.description || "No description available"}
                      </p>

                      {/* META INFO */}
                      <div
                        className="
                          flex flex-wrap items-center justify-between 
                          text-[#6B7280] 
                          text-[10px] sm:text-xs md:text-sm
                          gap-2
                        "
                      >
                        <span className="truncate max-w-[150px] sm:max-w-[220px]">
                          អ្នកនិពន្ធ: {card.author || "មិនស្គាល់"}
                        </span>

                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{formatDate(card.date)}</span>
                        </div>

                        {card.readTime && (
                          <div className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>{card.readTime} នាទី</span>
                          </div>
                        )}
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        {/* EDIT BUTTON */}
                        <motion.button
                          onClick={() => setEditingCard(card)}
                          className="group flex items-center justify-center w-[48px] sm:w-[52px] md:w-[56px] h-[34px] sm:h-[36px] transition-all duration-200 rounded-lg border border-[#0A817F] text-[#0A817F] hover:bg-[#0A817F] hover:text-white active:bg-[#0A817F] active:text-white"
                          whileTap={{ scale: 0.9 }}
                        >
                          <svg
                            className="w-4 h-4 text-current"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </motion.button>

                        {/* DELETE BUTTON */}
                        <motion.button
                          onClick={() => handleDelete(card.uuid!)}
                          disabled={deletingId === card.uuid}
                          className="
                            items-center
                            rounded-lg 
                            w-full h-[34px] sm:h-[36px]
                            border border-red-600 
                            text-red-600 font-medium
                            hover:bg-red-600 hover:text-white
                            transition-colors duration-200
                            disabled:opacity-50
                          "
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {deletingId === card.uuid ? (
                            <div className="flex items-center justify-center gap-2">
                              <svg
                                className="animate-spin h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              កំពុងលុប...
                            </div>
                          ) : (
                            "លុប"
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingCard && (
        <LearningCardEditModal
          card={editingCard}
          isOpen={!!editingCard}
          onClose={() => setEditingCard(null)}
          onSave={handleUpdate}
        />
      )}

      {/* Create Modal */}
      {isCreating && (
        <LearningCardEditModal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSave={handleCreate as any}
          isCreateMode={true}
        />
      )}
    </>
  );
}
