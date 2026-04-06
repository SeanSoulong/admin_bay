import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageGalleryProps } from "./types";

export const ImageGallery = ({ images, onClose, initialIndex = 0 }: ImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [images.length, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-10"
      >
        <X className="w-8 h-8" />
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          setCurrentIndex(prev => Math.max(0, prev - 1));
        }}
        disabled={currentIndex === 0}
        className="absolute left-6 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-10"
      >
        <ChevronLeft className="w-10 h-10" />
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
        }}
        disabled={currentIndex === images.length - 1}
        className="absolute right-6 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-10"
      >
        <ChevronRight className="w-10 h-10" />
      </button>
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        {currentIndex + 1} / {images.length}
      </div>
      
      <motion.img
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        src={images[currentIndex]}
        alt={`Image ${currentIndex + 1}`}
        className="max-h-[90vh] max-w-[90vw] object-contain cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
};
