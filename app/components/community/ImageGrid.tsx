import React from "react";

export const ImageGrid = ({ images, onImageClick }: { images: string[]; onImageClick: (index: number) => void }) => {
  const count = images.length;
  
  if (count === 1) {
    return (
      <div className="relative rounded-xl overflow-hidden cursor-pointer group">
        <img 
          src={images[0]} 
          alt="Post content" 
          className="w-full h-[300px] object-cover transition-transform group-hover:scale-105 duration-300"
          onClick={() => onImageClick(0)}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
        {images.map((img, i) => (
          <div key={i} className="relative cursor-pointer group">
            <img 
              src={img} 
              alt={`Post content ${i + 1}`}
              className="h-[200px] w-full object-cover transition-transform group-hover:scale-105 duration-300"
              onClick={() => onImageClick(i)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
        <div className="relative cursor-pointer group col-span-2">
          <img 
            src={images[0]} 
            alt="Post content 1"
            className="h-[250px] w-full object-cover transition-transform group-hover:scale-105 duration-300"
            onClick={() => onImageClick(0)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>
        {images.slice(1, 3).map((img, i) => (
          <div key={i} className="relative cursor-pointer group">
            <img 
              src={img} 
              alt={`Post content ${i + 2}`}
              className="h-[120px] w-full object-cover transition-transform group-hover:scale-105 duration-300"
              onClick={() => onImageClick(i + 1)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        ))}
      </div>
    );
  }

  const displayImages = images.slice(0, 4);
  const remainingCount = count - 4;

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
      {displayImages.map((img, i) => (
        <div key={i} className="relative cursor-pointer group">
          <img 
            src={img} 
            alt={`Post content ${i + 1}`}
            className="h-[150px] w-full object-cover transition-transform group-hover:scale-105 duration-300"
            onClick={() => onImageClick(i)}
            loading="lazy"
          />
          {i === 3 && remainingCount > 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <p className="text-white text-xl font-semibold">
                +{remainingCount}
              </p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>
      ))}
    </div>
  );
};
