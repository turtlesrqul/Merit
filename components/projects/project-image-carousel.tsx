/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import { IconButton } from "@/components/ui/action-icon";

export type ProjectCarouselImage = {
  url: string;
  label: string;
};

type ProjectImageCarouselProps = {
  className?: string;
  images: ProjectCarouselImage[];
  title: string;
};

function normalizeImages(images: ProjectCarouselImage[]) {
  const seenUrls = new Set<string>();
  return images
    .map((image) => ({
      label: image.label.trim() || "Project image",
      url: image.url.trim()
    }))
    .filter((image) => {
      if (!image.url || seenUrls.has(image.url)) {
        return false;
      }
      seenUrls.add(image.url);
      return true;
    });
}

export function ProjectImageCarousel({
  className,
  images,
  title
}: ProjectImageCarouselProps) {
  const normalizedImages = useMemo(() => normalizeImages(images), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const selectedIndex = normalizedImages.length > 0 ? Math.min(activeIndex, normalizedImages.length - 1) : 0;
  const selectedImage = normalizedImages[selectedIndex] ?? null;
  const hasMultipleImages = normalizedImages.length > 1;

  const showPrevious = () => {
    if (!hasMultipleImages) {
      return;
    }
    setActiveIndex((current) => (current - 1 + normalizedImages.length) % normalizedImages.length);
  };

  const showNext = () => {
    if (!hasMultipleImages) {
      return;
    }
    setActiveIndex((current) => (current + 1) % normalizedImages.length);
  };

  if (!selectedImage) {
    return null;
  }

  return (
    <div className={className}>
      <div
        className="relative overflow-hidden border border-[#d7cebd] bg-[#f5f1e8]"
        onTouchEnd={(event) => {
          if (touchStartX.current === null) {
            return;
          }
          const deltaX = event.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(deltaX) < 44) {
            return;
          }
          if (deltaX > 0) {
            showPrevious();
          } else {
            showNext();
          }
        }}
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0].clientX;
        }}
      >
        <div className="flex aspect-[16/10] min-h-[240px] items-center justify-center sm:aspect-[16/9]">
          <img
            alt={`${title} image ${selectedIndex + 1}`}
            className="h-full max-h-[640px] w-full object-contain"
            src={selectedImage.url}
          />
        </div>

        {hasMultipleImages ? (
          <>
            <IconButton
              className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 bg-[#fbf8f0]/90 text-[#16130f] shadow-sm hover:bg-[#f3c945]"
              icon="chevron-left"
              label="Previous image"
              onClick={showPrevious}
            />
            <IconButton
              className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 bg-[#fbf8f0]/90 text-[#16130f] shadow-sm hover:bg-[#f3c945]"
              icon="chevron-right"
              label="Next image"
              onClick={showNext}
            />
            <div className="absolute bottom-3 right-3 bg-[#fbf8f0]/90 px-2.5 py-1 text-xs font-semibold text-[#16130f]">
              {selectedIndex + 1} / {normalizedImages.length}
            </div>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={`${title} image thumbnails`}>
          {normalizedImages.map((image, index) => (
            <button
              aria-label={`Show image ${index + 1}`}
              aria-pressed={selectedIndex === index}
              className={`h-16 w-24 shrink-0 overflow-hidden border bg-[#e5ded1] transition ${
                selectedIndex === index
                  ? "border-[#c79a00] ring-2 ring-[#f3c945]"
                  : "border-[#d7cebd] hover:border-[#c79a00]"
              }`}
              key={`${image.url}-${index}`}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <img alt="" className="h-full w-full object-cover" src={image.url} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
